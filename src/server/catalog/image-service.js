// Transactional image helpers shared by the upload route and image actions.
// Every function takes the interactive transaction `tx`; callers lock the
// product row first (lockProduct) so "one MAIN" and the gallery limit hold
// under concurrent requests.
import 'server-only'
import { imageUrl, MAX_GALLERY } from './image-rules.js'

export class ImageRejected extends Error {}

/** SELECT ... FOR UPDATE on the product; returns { id, status } or null. */
export async function lockProduct(tx, productId) {
  const rows = await tx.$queryRaw`SELECT id, status FROM products WHERE id = ${productId} FOR UPDATE`
  return rows[0] ? { id: Number(rows[0].id), status: rows[0].status } : null
}

/** Admin view of an image row: { id, url, role, position, isPrimary, width, height }. */
export function toImageView(img) {
  return {
    id: img.id,
    url: imageUrl(img),
    role: img.role,
    position: img.position,
    isPrimary: img.isPrimary,
    width: img.width ?? null,
    height: img.height ?? null,
  }
}

const IMAGE_SELECT = { id: true, source: true, url: true, storageKey: true, role: true, position: true, isPrimary: true, width: true, height: true }

/** Next free gallery position. */
async function nextGalleryPosition(tx, productId) {
  const last = await tx.productImage.findFirst({ where: { productId, role: 'GALLERY' }, orderBy: { position: 'desc' }, select: { position: true } })
  return last ? last.position + 1 : 0
}

/**
 * Insert an uploaded image. MAIN demotes the existing MAIN to the end of the
 * gallery (nothing is deleted); GALLERY is appended. Enforces MAX_GALLERY.
 * @returns image view
 */
export async function insertUploadedImage(tx, { productId, role, storageKey, mime, bytes, width, height, actorId }) {
  const galleryCount = await tx.productImage.count({ where: { productId, role: 'GALLERY' } })
  const currentMain = await tx.productImage.findFirst({ where: { productId, role: 'MAIN' }, select: { id: true } })
  const galleryAfter = galleryCount + (role === 'GALLERY' ? 1 : currentMain ? 1 : 0)
  if (galleryAfter > MAX_GALLERY) throw new ImageRejected(`A product can have at most ${MAX_GALLERY} gallery images.`)
  if (role === 'MAIN' && currentMain) {
    await tx.productImage.update({
      where: { id: currentMain.id },
      data: { role: 'GALLERY', isPrimary: false, position: await nextGalleryPosition(tx, productId) },
    })
  }
  const created = await tx.productImage.create({
    data: {
      productId, source: 'UPLOAD', role, isPrimary: role === 'MAIN',
      position: role === 'MAIN' ? 0 : await nextGalleryPosition(tx, productId),
      storageKey, mime, bytes, width, height, createdBy: actorId ?? null,
    },
    select: IMAGE_SELECT,
  })
  return toImageView(created)
}

export { IMAGE_SELECT }
