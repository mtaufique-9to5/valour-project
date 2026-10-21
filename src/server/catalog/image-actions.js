'use server'
// Product image server actions (permission 'product.update'). Each change runs in
// one transaction that locks the product row, writes the image rows and the
// audit entry. Files are deleted only after the transaction commits; a failed
// unlink is logged and left for scripts/storage/cleanup-orphans.mjs.
// Returns { ok: true } or { ok: false, error }.
import { db } from '../db.js'
import { getAdminContext } from '../admin/context.js'
import { isKnownPermission, PERMISSIONS } from '../rbac/permissions.js'
import { recordAudit } from '../audit/audit.js'
import { imageIdSchema, imageIdListSchema, productIdSchema } from './schemas.js'
import { lockProduct, ImageRejected } from './image-service.js'
import { removeProductImage } from './storage.js'
import { revalidateCatalog } from './revalidate.js'

const INVALID = { ok: false, error: 'Invalid input.' }
const FORBIDDEN = { ok: false, error: 'You do not have permission to do this.' }
const FAILED = { ok: false, error: 'Could not save the change. Please try again.' }

async function authorize() {
  const ctx = await getAdminContext()
  const key = PERMISSIONS.PRODUCT_UPDATE
  return isKnownPermission(key) && ctx.permissions.includes(key) ? ctx : null
}

const actor = (ctx) => ({ actorType: 'ADMIN', actorId: ctx.user.id, actorLabel: ctx.user.email })

function fail(err) {
  if (err instanceof ImageRejected) return { ok: false, error: err.message }
  console.error('[catalog] image action failed')
  return FAILED
}

async function lockEditable(tx, productId) {
  const product = await lockProduct(tx, productId)
  if (!product) throw new ImageRejected('Product not found.')
  if (product.status === 'ARCHIVED') throw new ImageRejected('Archived products cannot be changed.')
  return product
}

// Renumber gallery positions 0..n-1 in the given order.
async function renumberGallery(tx, ids) {
  for (let i = 0; i < ids.length; i++) {
    await tx.productImage.update({ where: { id: ids[i] }, data: { position: i } })
  }
}

/**
 * Delete one image (row + audit in a transaction, then the file if it was an upload).
 * The MAIN image of an ACTIVE product cannot be deleted; set another main image first.
 * @param {number|string} imageId
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function deleteProductImage(imageId) {
  const iid = imageIdSchema.safeParse(imageId)
  if (!iid.success) return INVALID
  const ctx = await authorize()
  if (!ctx) return FORBIDDEN
  let removed
  try {
    removed = await db.$transaction(async (tx) => {
      const img = await tx.productImage.findUnique({ where: { id: iid.data }, select: { id: true, productId: true, role: true, source: true, storageKey: true, url: true, position: true } })
      if (!img) throw new ImageRejected('Image not found.')
      const product = await lockEditable(tx, img.productId)
      if (img.role === 'MAIN' && product.status === 'ACTIVE') {
        throw new ImageRejected('An active product needs a main image. Set another main image first.')
      }
      await tx.productImage.delete({ where: { id: img.id } })
      const rest = await tx.productImage.findMany({ where: { productId: img.productId, role: 'GALLERY' }, orderBy: { position: 'asc' }, select: { id: true } })
      await renumberGallery(tx, rest.map((r) => r.id))
      await recordAudit(tx, {
        ...actor(ctx), action: 'product.image.delete', targetType: 'product', targetId: String(img.productId),
        before: { imageId: img.id, role: img.role, source: img.source, storageKey: img.storageKey, url: img.url, position: img.position },
      })
      return img
    })
  } catch (err) {
    return fail(err)
  }
  if (removed.source === 'UPLOAD' && removed.storageKey) {
    const ok = await removeProductImage(removed.storageKey)
    if (!ok) console.error('[media] image row deleted but file not removed; run cleanup-orphans')
  }
  revalidateCatalog()
  return { ok: true }
}

/**
 * Make an image the product's single MAIN/primary image. The previous MAIN
 * becomes a gallery image at the end of the gallery.
 * @param {number|string} productId
 * @param {number|string} imageId
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function setPrimaryImage(productId, imageId) {
  const pid = productIdSchema.safeParse(productId)
  const iid = imageIdSchema.safeParse(imageId)
  if (!pid.success || !iid.success) return INVALID
  const ctx = await authorize()
  if (!ctx) return FORBIDDEN
  try {
    await db.$transaction(async (tx) => {
      await lockEditable(tx, pid.data)
      const img = await tx.productImage.findFirst({ where: { id: iid.data, productId: pid.data }, select: { id: true, role: true } })
      if (!img) throw new ImageRejected('Image not found.')
      if (img.role === 'MAIN') return
      const old = await tx.productImage.findFirst({ where: { productId: pid.data, role: 'MAIN' }, select: { id: true } })
      await tx.productImage.update({ where: { id: img.id }, data: { role: 'MAIN', isPrimary: true, position: 0 } })
      const gallery = await tx.productImage.findMany({ where: { productId: pid.data, role: 'GALLERY' }, orderBy: { position: 'asc' }, select: { id: true } })
      const ids = gallery.map((g) => g.id).filter((x) => x !== old?.id)
      if (old) {
        await tx.productImage.update({ where: { id: old.id }, data: { role: 'GALLERY', isPrimary: false } })
        ids.push(old.id)
      }
      await renumberGallery(tx, ids)
      await recordAudit(tx, {
        ...actor(ctx), action: 'product.image.primary', targetType: 'product', targetId: String(pid.data),
        before: { imageId: old?.id ?? null }, after: { imageId: img.id },
      })
    })
  } catch (err) {
    return fail(err)
  }
  revalidateCatalog()
  return { ok: true }
}

/**
 * Reorder the gallery. `orderedIds` lists the product's gallery image ids in the
 * new order; the MAIN image id may be included and is ignored (MAIN stays first).
 * Every gallery image must appear exactly once.
 * @param {number|string} productId
 * @param {Array<number|string>} orderedIds
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function reorderImages(productId, orderedIds) {
  const pid = productIdSchema.safeParse(productId)
  const ids = imageIdListSchema.safeParse(orderedIds)
  if (!pid.success || !ids.success || new Set(ids.data).size !== ids.data.length) return INVALID
  const ctx = await authorize()
  if (!ctx) return FORBIDDEN
  try {
    await db.$transaction(async (tx) => {
      await lockEditable(tx, pid.data)
      const rows = await tx.productImage.findMany({ where: { productId: pid.data }, orderBy: [{ role: 'asc' }, { position: 'asc' }], select: { id: true, role: true } })
      const mainIds = new Set(rows.filter((r) => r.role === 'MAIN').map((r) => r.id))
      const gallery = rows.filter((r) => r.role === 'GALLERY').map((r) => r.id)
      const wanted = ids.data.filter((x) => !mainIds.has(x))
      const known = new Set(gallery)
      if (wanted.length !== gallery.length || !wanted.every((x) => known.has(x))) {
        throw new ImageRejected('The image list is out of date. Reload and try again.')
      }
      await renumberGallery(tx, wanted)
      await recordAudit(tx, {
        ...actor(ctx), action: 'product.image.reorder', targetType: 'product', targetId: String(pid.data),
        before: { order: gallery }, after: { order: wanted },
      })
    })
  } catch (err) {
    return fail(err)
  }
  revalidateCatalog()
  return { ok: true }
}
