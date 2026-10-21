// Product image changes on products.main_image / products.images (JSON).
// Every function takes the transaction `tx` and locks the product row first,
// so concurrent uploads cannot exceed the gallery limit or lose an image.
// Files on disk are written before and deleted after the transaction (see the
// staged route in ../routes/product-images.js).
// TARGET SCHEMA ONLY: not imported by any route until the replacement migration.
import 'server-only'
import { recordAudit } from '../../audit/audit.js'
import { CommerceError } from '../../commerce/errors.js'
import { addImage, galleryError, promoteToMain, readGallery, removeImage, uploadPath } from '../gallery-rules.js'

export async function lockProductImages(tx, productId) {
  const [row] = await tx.$queryRaw`
    SELECT id, status, deleted_at AS deletedAt, main_image AS mainImage, images
    FROM products WHERE id = ${BigInt(productId)} FOR UPDATE`
  if (!row || row.deletedAt) throw new CommerceError('product_not_found', 'Product not found.')
  const images = typeof row.images === 'string' ? JSON.parse(row.images) : row.images
  return { id: row.id, status: row.status, mainImage: row.mainImage, images: readGallery(images) }
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
  return { ...saved, removedStorageKey: next.removedStorageKey }
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
