// POST /api/admin/products/{id}/images  (multipart: file, role 'MAIN'|'GALLERY')
// Security: admin session + MFA + 'product.update' (requireAdminApi), same-origin
// check against BETTER_AUTH_URL (CSRF), Content-Length cap before parsing, 5 MB
// file cap, magic-byte + header-dimension validation, random file name, private
// storage, temp-file + rename, DB row + audit in one transaction with the file
// removed again if the transaction fails.
import { requireAdminApi } from '@/server/auth/guards.js'
import { db } from '@/server/db.js'
import { recordAudit } from '@/server/audit/audit.js'
import { PERMISSIONS } from '@/server/rbac/permissions.js'
import { productIdSchema } from '@/server/catalog/schemas.js'
import { IMAGE_ROLES, MAX_BYTES, validateImage, isSameOriginRequest } from '@/server/catalog/image-rules.js'
import { writeProductImage, removeProductImage } from '@/server/catalog/storage.js'
import { lockProduct, insertUploadedImage, ImageRejected } from '@/server/catalog/image-service.js'
import { revalidateCatalog } from '@/server/catalog/revalidate.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Multipart overhead allowance (boundaries, part headers, the role field).
const MAX_BODY = MAX_BYTES + 64 * 1024

const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
const bad = (error, status = 400) => json({ ok: false, error }, status)

export async function POST(request, { params }) {
  if (!isSameOriginRequest(request.headers, process.env.BETTER_AUTH_URL)) return bad('Forbidden', 403)

  const guard = await requireAdminApi(request, PERMISSIONS.PRODUCT_UPDATE)
  if (!guard.ok) return guard.response

  const { id } = await params
  const pid = productIdSchema.safeParse(id)
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
    storageKey = await writeProductImage(pid.data, checked.ext, bytes)
  } catch {
    console.error('[media] could not store an uploaded image')
    return bad('Could not save the image. Please try again.', 500)
  }

  let image
  try {
    image = await db.$transaction(async (tx) => {
      const product = await lockProduct(tx, pid.data)
      if (!product) throw new ImageRejected('Product not found.')
      if (product.status === 'ARCHIVED') throw new ImageRejected('Archived products cannot be changed.')
      const view = await insertUploadedImage(tx, {
        productId: pid.data, role, storageKey,
        mime: checked.mime, bytes: checked.bytes, width: checked.width, height: checked.height,
        actorId: guard.user.id,
      })
      await recordAudit(tx, {
        actorType: 'ADMIN', actorId: guard.user.id, actorLabel: guard.user.email,
        action: 'product.image.upload', targetType: 'product', targetId: String(pid.data),
        after: { imageId: view.id, role, mime: checked.mime, bytes: checked.bytes, width: checked.width, height: checked.height },
      })
      return view
    })
  } catch (err) {
    await removeProductImage(storageKey)
    if (err instanceof ImageRejected) return bad(err.message, err.message === 'Product not found.' ? 404 : 409)
    console.error('[media] image upload transaction failed')
    return bad('Could not save the image. Please try again.', 500)
  }
  revalidateCatalog()
  return json({ ok: true, image }, 201)
}
