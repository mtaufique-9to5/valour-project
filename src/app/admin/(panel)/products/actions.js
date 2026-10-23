'use server'
// Product, price, stock and image actions for the admin panel (Phase A).
// Next.js rejects cross-origin server-action calls; every action also re-checks
// the admin session itself, validates its input on the server and runs the
// catalog-v2 service in one transaction. Results: { ok, ... } | { ok: false, error, fieldErrors? }.
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { db } from '@/server/db'
import { getAdminSession } from '@/server/auth/guards'
import { isCommerceError } from '@/server/commerce/errors'
import { productCreateSchema, productUpdateSchema, priceSchema, stockSchema, idSchema } from '@/server/catalog-v2/schemas'
import { displayInfoSchema, mergeDisplayInfo } from '@/server/catalog-v2/display-info'
import { withAutoRetry } from '@/server/catalog-v2/auto-ids'
import { createProduct, updateProduct, setPrices, setStatus, setInventory } from '@/server/catalog-v2/services/products'
import { detachImage, makeMainImage, reorderGallery, setSectionImage } from '@/server/catalog-v2/services/images'
import { removeProductImage } from '@/server/catalog/storage'
import { revalidateCatalog } from '@/server/catalog/revalidate'

const PATHS = ['/admin/products', '/admin/pricing', '/admin/inventory']
const STATUS = { DRAFT: 'draft', ACTIVE: 'active', ARCHIVED: 'inactive', draft: 'draft', active: 'active', inactive: 'inactive' }

const fieldErrors = (error) => Object.fromEntries((error?.issues ?? []).map((i) => [String(i.path[0] ?? 'form'), i.message]))
const invalid = (error) => ({ ok: false, error: 'Please correct the highlighted fields.', fieldErrors: fieldErrors(error) })

async function run(fn, { paths = PATHS, after } = {}) {
  const session = await getAdminSession()
  if (!session) return { ok: false, error: 'Your session has ended. Please sign in again.' }
  const actor = { actorType: 'ADMIN', actorId: session.user.id, actorLabel: session.user.email }
  try {
    // A fresh transaction per attempt: retried only after an auto slug/SKU collision or a deadlock.
    const value = await withAutoRetry(() => db.$transaction((tx) => fn(tx, actor), { timeout: 15_000 }))
    if (after) await after(value)
    for (const p of paths) revalidatePath(p)
    revalidateCatalog()
    return { ok: true, ...(value && typeof value === 'object' && !Array.isArray(value) ? value : {}) }
  } catch (e) {
    if (isCommerceError(e)) return { ok: false, error: e.message }
    console.error('[products] action failed')
    return { ok: false, error: 'Could not save the change. Please try again.' }
  }
}

function parseId(id) {
  const r = idSchema.safeParse(id)
  return r.success ? r.data : null
}

/** values: editor form values; display: display-details object. New products are always drafts. */
export async function createProductAction(values, display = {}) {
  const parsed = productCreateSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)
  const info = displayInfoSchema.safeParse(display)
  if (!info.success) return invalid(info.error)
  if (parsed.data.type === 'custom') return { ok: false, error: 'Custom watches are managed with the customizer (later phase).' }
  return run(async (tx, actor) => {
    const id = await createProduct(tx, { ...parsed.data, additionalInfo: mergeDisplayInfo(null, info.data) }, actor)
    return { id: String(id) }
  })
}

export async function updateProductAction(id, values, display) {
  const pid = parseId(id)
  if (!pid) return { ok: false, error: 'Product not found.' }
  const parsed = productUpdateSchema.omit({ additionalInfo: true }).safeParse(values)
  if (!parsed.success) return invalid(parsed.error)
  let info = null
  if (display !== undefined) {
    const r = displayInfoSchema.safeParse(display)
    if (!r.success) return invalid(r.error)
    info = r.data
  }
  return run(async (tx, actor) => {
    const input = { ...parsed.data }
    if (info) {
      const current = await tx.product.findUnique({ where: { id: pid }, select: { additionalInfo: true } })
      // Prisma.DbNull clears the column when every display field was emptied.
      input.additionalInfo = mergeDisplayInfo(current?.additionalInfo, info) ?? Prisma.DbNull
    }
    await updateProduct(tx, pid, input, actor)
  })
}

export async function setPricesAction(id, values) {
  const pid = parseId(id)
  const parsed = priceSchema.safeParse({ basePrice: values?.basePrice, salePrice: values?.salePrice ? values.salePrice : null })
  if (!pid) return { ok: false, error: 'Product not found.' }
  if (!parsed.success) return invalid(parsed.error)
  return run((tx, actor) => setPrices(tx, pid, parsed.data, actor))
}

export async function setInventoryAction(id, values) {
  const pid = parseId(id)
  const parsed = stockSchema.safeParse(values)
  if (!pid) return { ok: false, error: 'Product not found.' }
  if (!parsed.success) return invalid(parsed.error)
  return run((tx, actor) => setInventory(tx, pid, parsed.data, actor))
}

export async function setProductStatusAction(id, status) {
  const pid = parseId(id)
  const to = STATUS[status]
  if (!pid || !to) return { ok: false, error: 'Invalid request.' }
  return run((tx, actor) => setStatus(tx, pid, to, actor))
}

/** Archive = status inactive (hidden from the storefront, kept with its history). */
export const archiveProductAction = async (id) => setProductStatusAction(id, 'inactive')
/** Restore an archived product as a draft (publish it explicitly afterwards). */
export const restoreProductAction = async (id) => setProductStatusAction(id, 'draft')

// ---- images (ImageManager contract: the image id is its path) -----------------

export async function deleteProductImageAction(productId, path) {
  const pid = parseId(productId)
  if (!pid || typeof path !== 'string') return { ok: false, error: 'Invalid request.' }
  return run(
    async (tx, actor) => {
      const r = await detachImage(tx, { productId: pid, path, actor })
      return { removedStorageKey: r.removedStorageKey }
    },
    // Uploaded files are deleted only after the database change committed;
    // storefront images under /public/images are never deleted.
    { after: async (v) => { if (v?.removedStorageKey) await removeProductImage(v.removedStorageKey) } },
  )
}

export async function setPrimaryImageAction(productId, path) {
  const pid = parseId(productId)
  if (!pid || typeof path !== 'string') return { ok: false, error: 'Invalid request.' }
  return run((tx, actor) => makeMainImage(tx, { productId: pid, path, actor }))
}

export async function reorderImagesAction(productId, order) {
  const pid = parseId(productId)
  if (!pid || !Array.isArray(order) || order.some((p) => typeof p !== 'string')) return { ok: false, error: 'Invalid request.' }
  return run((tx, actor) => reorderGallery(tx, { productId: pid, order, actor }))
}

/** Remove one dedicated product page image (role, e.g. 'movement'). Uploads go through the image route. */
export async function removeSectionImageAction(productId, role) {
  const pid = parseId(productId)
  if (!pid || typeof role !== 'string') return { ok: false, error: 'Invalid request.' }
  return run(
    async (tx, actor) => {
      const r = await setSectionImage(tx, { productId: pid, role, path: null, actor })
      return { removedStorageKey: r.removedStorageKey }
    },
    // The file is deleted only after the change saved, and only if the product no longer uses it.
    { after: async (v) => { if (v?.removedStorageKey) await removeProductImage(v.removedStorageKey) } },
  )
}
