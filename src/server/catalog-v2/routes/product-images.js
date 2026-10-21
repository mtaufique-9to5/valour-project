// STAGED replacement for src/app/api/admin/products/[id]/images/route.js.
// At cutover that file becomes (segment config must stay in the route file):
//   export const runtime = 'nodejs'
//   export const dynamic = 'force-dynamic'
//   export { POST } from '@/server/catalog-v2/routes/product-images'
// Same security as the current route: same-origin check, admin session + MFA +
// product.update, Content-Length cap, 5 MB cap, magic-byte and dimension
// validation, random private file name, DB change + audit in one transaction,
// file removed again if the transaction fails.
import 'server-only'
import { requireAdminApi } from '@/server/auth/guards.js'
import { db } from '@/server/db.js'
import { PERMISSIONS } from '@/server/rbac/permissions.js'
import { IMAGE_ROLES, MAX_BYTES, validateImage, isSameOriginRequest } from '@/server/catalog/image-rules.js'
import { writeProductImage, removeProductImage } from '@/server/catalog/storage.js'
import { revalidateCatalog } from '@/server/catalog/revalidate.js'
import { isCommerceError } from '@/server/commerce/errors.js'
import { idSchema } from '../schemas.js'
import { attachUpload } from '../services/images.js'

const MAX_BODY = MAX_BYTES + 64 * 1024
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
const bad = (error, status = 400) => json({ ok: false, error }, status)

export async function POST(request, { params }) {
  if (!isSameOriginRequest(request.headers, process.env.BETTER_AUTH_URL)) return bad('Forbidden', 403)

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
  if (!IMAGE_ROLES.includes(role)) return bad('Choose MAIN or GALLERY.')
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

  let result
  try {
    result = await db.$transaction((tx) => attachUpload(tx, {
      productId: pid.data, storageKey, role,
      meta: { mime: checked.mime, bytes: checked.bytes, width: checked.width, height: checked.height },
      actor: { actorType: 'ADMIN', actorId: guard.user.id, actorLabel: guard.user.email },
    }))
  } catch (err) {
    await removeProductImage(storageKey)
    if (isCommerceError(err)) return bad(err.message, err.code === 'product_not_found' ? 404 : 409)
    console.error('[media] image upload transaction failed')
    return bad('Could not save the image. Please try again.', 500)
  }
  revalidateCatalog()
  return json({ ok: true, mainImage: result.mainImage, images: result.images }, 201)
}
