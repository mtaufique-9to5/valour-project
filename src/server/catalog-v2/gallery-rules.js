// Product images for the approved schema: products.main_image (one path) and
// products.images (JSON array of gallery paths). Paths are either uploads
// served by /media/products/<productId>/<32 hex>.<ext> (validated by the
// existing image pipeline) or the storefront's existing static images under
// /images/ (used when seeding from catalog.js). Pure; unit tested.
import { MAX_GALLERY, MEDIA_PREFIX, isStorageKey } from '../catalog/image-rules.js'

export { MAX_GALLERY }
const STATIC_RE = /^\/images\/[A-Za-z0-9/_.-]{1,240}\.(?:png|jpe?g|webp)$/

export function uploadPath(storageKey) {
  if (!isStorageKey(storageKey)) throw new RangeError('invalid storage key')
  return `${MEDIA_PREFIX}${storageKey}`
}

/** Storage key of an upload path, or null for static / invalid paths. */
export function storageKeyOf(path) {
  if (typeof path !== 'string' || !path.startsWith(MEDIA_PREFIX)) return null
  const key = path.slice(MEDIA_PREFIX.length)
  return isStorageKey(key) ? key : null
}

/** A valid image path for product `productId` (uploads must live in its own folder). */
export function isGalleryPath(path, productId) {
  if (typeof path !== 'string' || path.includes('..')) return false
  if (STATIC_RE.test(path)) return true
  const key = storageKeyOf(path)
  return key !== null && (productId === undefined || key.split('/')[0] === String(productId))
}

/** Gallery JSON as stored: always an array of valid, unique paths (bad data is reported, not hidden). */
export function readGallery(images) {
  return Array.isArray(images) ? images.filter((p) => typeof p === 'string') : []
}

/** Validate a full gallery order submitted by an admin. Returns null or a message. */
export function galleryError(paths, { productId, mainImage }) {
  if (!Array.isArray(paths)) return 'Invalid gallery.'
  if (paths.length > MAX_GALLERY) return `A product can have at most ${MAX_GALLERY} gallery images.`
  if (new Set(paths).size !== paths.length) return 'An image appears twice in the gallery.'
  if (paths.some((p) => !isGalleryPath(p, productId))) return 'The gallery contains an invalid image path.'
  if (mainImage && paths.includes(mainImage)) return 'The main image is shown separately; remove it from the gallery.'
  return null
}

/** Add an uploaded image: becomes main if there is none, else appended to the gallery. */
export function addImage({ mainImage, images }, path) {
  const gallery = readGallery(images)
  if (!mainImage) return { mainImage: path, images: gallery }
  if (gallery.length >= MAX_GALLERY) throw new RangeError(`A product can have at most ${MAX_GALLERY} gallery images.`)
  return { mainImage, images: [...gallery, path] }
}

/** Make a gallery image the main image; the old main image moves to the gallery front. */
export function promoteToMain({ mainImage, images }, path) {
  const gallery = readGallery(images)
  if (!gallery.includes(path)) throw new RangeError('That image is not in the gallery.')
  const rest = gallery.filter((p) => p !== path)
  return { mainImage: path, images: mainImage ? [mainImage, ...rest] : rest }
}

/**
 * Remove an image. Removing the main image promotes the first gallery image.
 * Returns the new state and the storage key to delete from disk (uploads only,
 * removed after the transaction commits).
 */
export function removeImage({ mainImage, images }, path) {
  const gallery = readGallery(images)
  let next
  if (path === mainImage) next = { mainImage: gallery[0] ?? null, images: gallery.slice(1) }
  else if (gallery.includes(path)) next = { mainImage, images: gallery.filter((p) => p !== path) }
  else throw new RangeError('That image is not on this product.')
  return { ...next, removedStorageKey: storageKeyOf(path) }
}

/** Upload storage keys referenced by product rows (for the orphan clean-up script). */
export function referencedStorageKeys(products) {
  const keys = new Set()
  for (const p of products) {
    for (const path of [p.mainImage, ...readGallery(p.images)]) {
      const key = storageKeyOf(path)
      if (key) keys.add(key)
    }
  }
  return keys
}
