// Product image changes: main image (products.main_image), gallery
// (products.images) and dedicated product page section images
// (products.additional_info.media). Every function takes the transaction `tx`
// and locks the product row first, so concurrent changes cannot lose an image.
// Files on disk are written before and deleted after the transaction (see
// ../routes/product-images.js); a file is deleted only when nothing on the
// product still uses it.
import 'server-only'
import { recordAudit } from '../../audit/audit.js'
import { CommerceError } from '../../commerce/errors.js'
import { addImage, galleryError, isGalleryPath, productImagePaths, promoteToMain, readGallery, removeImage, storageKeyOf, uploadPath } from '../gallery-rules.js'
import { MEDIA_ROLES, readAdditionalInfo, readMedia, withMedia } from '../display-info.js'

export async function lockProductImages(tx, productId) {
  const [row] = await tx.$queryRaw`
    SELECT id, status, deleted_at AS deletedAt, main_image AS mainImage, images, additional_info AS additionalInfo
    FROM products WHERE id = ${BigInt(productId)} FOR UPDATE`
  if (!row || row.deletedAt) throw new CommerceError('product_not_found', 'Product not found.')
  const images = typeof row.images === 'string' ? JSON.parse(row.images) : row.images
  return { id: row.id, status: row.status, mainImage: row.mainImage, images: readGallery(images), additionalInfo: readAdditionalInfo(row.additionalInfo) }
}

/** The storage key of `path` if, after the change, the product no longer uses it anywhere; else null. */
function unusedKey(path, after) {
  const key = storageKeyOf(path)
  if (!key) return null // storefront images under /public are never deleted
  return productImagePaths(after).includes(path) ? null : key
}

async function save(tx, product, next, audit) {
  if (product.status === 'active' && !next.mainImage) {
    throw new CommerceError('main_image_required', 'An active product needs a main image. Set it to draft first.')
  }
  await tx.product.update({ where: { id: product.id }, data: { mainImage: next.mainImage, images: next.images } })
  await recordAudit(tx, { ...audit, targetType: 'product', targetId: String(product.id) })
  return { mainImage: next.mainImage, images: next.images }
}

/** role 'MAIN' replaces the main image (old main moves to the gallery front); 'GALLERY' appends. */
export async function attachUpload(tx, { productId, storageKey, role, meta, actor }) {
  const product = await lockProductImages(tx, productId)
  if (product.status === 'inactive') throw new CommerceError('product_inactive', 'Archived products cannot be changed.')
  const path = uploadPath(storageKey)
  let next
  try {
    next = role === 'MAIN' && product.mainImage
      ? promoteToMain({ mainImage: product.mainImage, images: [path, ...product.images] }, path)
      : addImage(product, path)
  } catch (e) {
    throw new CommerceError('gallery_full', e.message)
  }
  const err = galleryError(next.images, { productId: product.id, mainImage: next.mainImage })
    ?? (isGalleryPath(next.mainImage, product.id) ? null : 'The image does not belong to this product.')
  if (err) throw new CommerceError('gallery_invalid', err)
  return save(tx, product, next, { ...actor, action: 'product.image.upload', after: { path, role, ...meta } })
}

/** Returns { mainImage, images, removedStorageKey } — delete that file after commit. */
export async function detachImage(tx, { productId, path, actor }) {
  const product = await lockProductImages(tx, productId)
  let next
  try {
    next = removeImage(product, path)
  } catch (e) {
    throw new CommerceError('image_not_found', e.message)
  }
  const saved = await save(tx, product, next, { ...actor, action: 'product.image.delete', before: { path } })
  // Still used as a section image? Then the file stays.
  return { ...saved, removedStorageKey: next.removedStorageKey && unusedKey(path, { ...next, additionalInfo: product.additionalInfo }) }
}

export async function makeMainImage(tx, { productId, path, actor }) {
  const product = await lockProductImages(tx, productId)
  let next
  try {
    next = promoteToMain(product, path)
  } catch (e) {
    throw new CommerceError('image_not_found', e.message)
  }
  return save(tx, product, next, { ...actor, action: 'product.image.primary', after: { path } })
}

/** order must contain exactly the current gallery paths. */
export async function reorderGallery(tx, { productId, order, actor }) {
  const product = await lockProductImages(tx, productId)
  const same = order.length === product.images.length && [...order].sort().join('\n') === [...product.images].sort().join('\n')
  if (!same) throw new CommerceError('gallery_changed', 'The gallery changed; reload and try again.')
  const err = galleryError(order, { productId: product.id, mainImage: product.mainImage })
  if (err) throw new CommerceError('gallery_invalid', err)
  return save(tx, product, { mainImage: product.mainImage, images: order }, { ...actor, action: 'product.image.reorder', after: { order } })
}

/**
 * Set (path) or remove (null) one dedicated section image (additional_info.media).
 * The path must be an image of this product (its own upload folder or an existing
 * storefront image). The gallery and main image are never touched, so reordering
 * the gallery never changes a section image. Returns { media, removedStorageKey }:
 * delete that file after the transaction commits.
 */
export async function setSectionImage(tx, { productId, role, path, actor }) {
  if (!MEDIA_ROLES.includes(role)) throw new CommerceError('invalid_role', 'Unknown image slot.')
  const product = await lockProductImages(tx, productId)
  if (product.status === 'inactive') throw new CommerceError('product_inactive', 'Archived products cannot be changed.')
  if (path != null && !isGalleryPath(path, product.id)) throw new CommerceError('gallery_invalid', 'The image does not belong to this product.')
  const previous = readMedia(product.additionalInfo)[role] ?? null
  const additionalInfo = withMedia(product.additionalInfo, role, path ?? null)
  await tx.product.update({ where: { id: product.id }, data: { additionalInfo } })
  await recordAudit(tx, {
    ...actor, action: path ? 'product.image.section' : 'product.image.section.remove',
    targetType: 'product', targetId: String(product.id), before: { role, path: previous }, after: { role, path: path ?? null },
  })
  const removedStorageKey = previous && previous !== path ? unusedKey(previous, { ...product, additionalInfo }) : null
  return { media: readMedia(additionalInfo), removedStorageKey }
}
