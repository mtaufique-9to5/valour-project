// Private product-image storage on the local disk (never under public/):
//   <repo>/storage/uploads/products/<productId>/<32 hex>.<ext>
// Files are written to a temp name in the same directory, then renamed, so a
// reader never sees a partial file.
import 'server-only'
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile, rename, unlink, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { isStorageKey } from './image-rules.js'

/** Absolute root of uploaded product images. */
export const STORAGE_ROOT = path.resolve(process.cwd(), 'storage', 'uploads', 'products')

/** Absolute path for a validated storage key, or null (also guards against traversal). */
export function storagePath(storageKey) {
  if (!isStorageKey(storageKey)) return null
  const abs = path.resolve(STORAGE_ROOT, ...storageKey.split('/'))
  return abs.startsWith(STORAGE_ROOT + path.sep) ? abs : null
}

/**
 * Write image bytes for a product. Returns the new storage key.
 * @param {number} productId
 * @param {'jpg'|'png'|'webp'} ext
 * @param {Uint8Array} bytes
 */
export async function writeProductImage(productId, ext, bytes) {
  const key = `${productId}/${randomBytes(16).toString('hex')}.${ext}`
  const target = storagePath(key)
  if (!target) throw new Error('invalid storage key')
  await mkdir(path.dirname(target), { recursive: true })
  const tmp = `${target}.${randomBytes(6).toString('hex')}.tmp`
  try {
    await writeFile(tmp, bytes, { flag: 'wx', mode: 0o640 })
    await rename(tmp, target)
  } catch (err) {
    await unlink(tmp).catch(() => {})
    throw err
  }
  return key
}

/** Delete a stored file; resolves false (and logs) instead of throwing. */
export async function removeProductImage(storageKey) {
  const p = storagePath(storageKey)
  if (!p) return false
  try {
    await unlink(p)
    return true
  } catch (err) {
    if (err?.code !== 'ENOENT') console.error('[media] could not delete an image file')
    return false
  }
}

/** Read a stored file (max 2 x MAX upload size), or null when missing. */
export async function readProductImage(storageKey) {
  const p = storagePath(storageKey)
  if (!p) return null
  try {
    const s = await stat(p)
    if (!s.isFile() || s.size > 10 * 1024 * 1024) return null
    return await readFile(p)
  } catch {
    return null
  }
}
