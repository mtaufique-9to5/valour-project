// Handler for POST /api/admin/products/[id]/images (re-exported by that route file).
// Same security as the current route: same-origin check, admin session + MFA +
// product.update, Content-Length cap, 5 MB cap, magic-byte and dimension
// validation, random private file name, DB change + audit in one transaction,
// file removed again if the transaction fails.
import 'server-only'
import { requireAdminApi } from '@/server/auth/guards.js'
import { db } from '@/server/db.js'
import { getAuthConfig } from '@/server/auth/env.js'
import { PERMISSIONS } from '@/server/rbac/permissions.js'
import { IMAGE_ROLES, MAX_BYTES, validateImage, isSameOriginRequest } from '@/server/catalog/image-rules.js'
import { writeProductImage, removeProductImage } from '@/server/catalog/storage.js'
import { revalidateCatalog } from '@/server/catalog/revalidate.js'
import { isCommerceError } from '@/server/commerce/errors.js'
import { idSchema } from '../schemas.js'
import { attachUpload, setSectionImage } from '../services/images.js'
import { MEDIA_ROLES } from '../display-info.js'
import { uploadPath } from '../gallery-rules.js'

const MAX_BODY = MAX_BYTES + 64 * 1024
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
const bad = (error, status = 400) => json({ ok: false, error }, status)

export async function POST(request, { params }) {
  if (!isSameOriginRequest(request.headers, getAuthConfig().appUrl)) return bad('Forbidden', 403)

  const guard = await requireAdminApi(request, PERMISSIONS.PRODUCT_UPDATE)
  if (!guard.ok) return guard.response

  const { id } = await params
  const pid = idSchema.safeParse(id)
  if (!pid.success) return bad('Product not found.', 404)

  const length = Number(request.headers.get('content-length'))
  if (!Number.isFinite(length) || length <= 0) return bad('Missing Content-Length.', 411)
  if (length > MAX_BODY) return bad('The file is larger than 5 MB.', 413)
  if (!String(request.headers.get('content-type') ?? '').toLowerCase().startsWith('multipart/form-data')) {
    return bad('Expected multipart/form-data.', 415)
  }

  let form
  try {
    form = await request.formData()
  } catch {
    return bad('Invalid upload.')
  }
  const file = form.get('file')
  const role = form.get('role')
  // MAIN / GALLERY, or a dedicated product page image: 'section:<role>' (e.g. section:movement).
  const sectionRole = typeof role === 'string' && role.startsWith('section:') ? role.slice(8) : null
  if (sectionRole ? !MEDIA_ROLES.includes(sectionRole) : !IMAGE_ROLES.includes(role)) return bad('Choose a valid image slot.')
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') return bad('Choose an image file.')
  if (file.size > MAX_BYTES) return bad('The file is larger than 5 MB.', 413)

  const bytes = new Uint8Array(await file.arrayBuffer())
  const checked = validateImage(bytes, { declaredMime: file.type, filename: file.name })
  if (!checked.ok) return bad(checked.error, 422)

  let storageKey
  try {
    storageKey = await writeProductImage(String(pid.data), checked.ext, bytes)
  } catch {
    console.error('[media] could not store an uploaded image')
    return bad('Could not save the image. Please try again.', 500)
  }

  const actor = { actorType: 'ADMIN', actorId: guard.user.id, actorLabel: guard.user.email }
  if (sectionRole) {
    let result
    try {
      result = await db.$transaction((tx) => setSectionImage(tx, { productId: pid.data, role: sectionRole, path: uploadPath(storageKey), actor }))
    } catch (err) {
      await removeProductImage(storageKey)
      if (isCommerceError(err)) return bad(err.message, err.code === 'product_not_found' ? 404 : 409)
      console.error('[media] section image upload transaction failed')
      return bad('Could not save the image. Please try again.', 500)
    }
    // The replaced image's file, when nothing else on the product uses it.
    if (result.removedStorageKey) await removeProductImage(result.removedStorageKey)
    revalidateCatalog()
    return json({ ok: true, role: sectionRole, path: uploadPath(storageKey), media: result.media }, 201)
  }

  let result
  try {
    result = await db.$transaction((tx) => attachUpload(tx, {
      productId: pid.data, storageKey, role,
      meta: { mime: checked.mime, bytes: checked.bytes, width: checked.width, height: checked.height },
      actor,
    }))
  } catch (err) {
    await removeProductImage(storageKey)
    if (isCommerceError(err)) return bad(err.message, err.code === 'product_not_found' ? 404 : 409)
    console.error('[media] image upload transaction failed')
    return bad('Could not save the image. Please try again.', 500)
  }
  revalidateCatalog()
  // ImageManager shape (the path is the image id; there is no image table).
  const path = uploadPath(storageKey)
  const isMain = result.mainImage === path
  const position = isMain ? 0 : result.images.indexOf(path) + 1
  return json({ ok: true, image: { id: path, url: path, role: isMain ? 'MAIN' : 'GALLERY', isPrimary: isMain, position }, mainImage: result.mainImage, images: result.images }, 201)
}
