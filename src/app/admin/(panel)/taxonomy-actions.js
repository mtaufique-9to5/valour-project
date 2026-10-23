'use server'
// Category and brand actions for the admin panel. Next.js rejects cross-origin
// server-action calls; every action also re-checks the admin session itself,
// validates its input on the server and runs the catalog-v2 taxonomy service in
// one transaction. Results: { ok, ... } | { ok: false, error, fieldErrors? }.
import { revalidatePath } from 'next/cache'
import { db } from '@/server/db'
import { getAdminSession } from '@/server/auth/guards'
import { isCommerceError } from '@/server/commerce/errors'
import { brandSchema, categorySchema, idSchema } from '@/server/catalog-v2/schemas'
import { withAutoRetry } from '@/server/catalog-v2/auto-ids'
import {
  createBrand, createCategory, setBrandStatus, setCategoryStatus,
  softDeleteBrand, softDeleteCategory, updateBrand, updateCategory,
} from '@/server/catalog-v2/services/taxonomy'

// Product pages show category / brand names in the editor dropdowns.
const PATHS = ['/admin/categories', '/admin/brands', '/admin/products']

const fieldErrors = (error) => Object.fromEntries((error?.issues ?? []).map((i) => [String(i.path[0] ?? 'form'), i.message]))
const invalid = (error) => ({ ok: false, error: 'Please correct the highlighted fields.', fieldErrors: fieldErrors(error) })

async function run(fn) {
  const session = await getAdminSession()
  if (!session) return { ok: false, error: 'Your session has ended. Please sign in again.' }
  const actor = { actorType: 'ADMIN', actorId: session.user.id, actorLabel: session.user.email }
  try {
    // A fresh transaction per attempt: retried only after an auto slug/SKU collision or a deadlock.
    const value = await withAutoRetry(() => db.$transaction((tx) => fn(tx, actor), { timeout: 15_000 }))
    for (const p of PATHS) revalidatePath(p)
    return { ok: true, ...(value !== undefined ? { id: String(value) } : {}) }
  } catch (e) {
    if (isCommerceError(e)) {
      // Duplicate slug / name is a field problem the form can point at.
      return e.code === 'duplicate' ? { ok: false, error: e.message, fieldErrors: { slug: e.message } } : { ok: false, error: e.message }
    }
    console.error('[taxonomy] action failed')
    return { ok: false, error: 'Could not save the change. Please try again.' }
  }
}

const parseId = (id) => {
  const r = idSchema.safeParse(id)
  return r.success ? r.data : null
}

// ---- categories --------------------------------------------------------------

/** New categories start inactive; activation is a separate, explicit action. */
export async function createCategoryAction(values) {
  const parsed = categorySchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)
  return run((tx, actor) => createCategory(tx, parsed.data, actor))
}

export async function updateCategoryAction(id, values) {
  const cid = parseId(id)
  if (!cid) return { ok: false, error: 'Category not found.' }
  const parsed = categorySchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)
  return run((tx, actor) => updateCategory(tx, cid, parsed.data, actor))
}

export async function setCategoryStatusAction(id, active) {
  const cid = parseId(id)
  if (!cid || typeof active !== 'boolean') return { ok: false, error: 'Invalid request.' }
  return run((tx, actor) => setCategoryStatus(tx, cid, active, actor))
}

/** Soft delete; refused while subcategories, products or blog posts use the category. */
export async function deleteCategoryAction(id) {
  const cid = parseId(id)
  if (!cid) return { ok: false, error: 'Category not found.' }
  return run((tx, actor) => softDeleteCategory(tx, cid, actor))
}

// ---- brands ------------------------------------------------------------------

/** New brands start inactive; activation is a separate, explicit action. */
export async function createBrandAction(values) {
  const parsed = brandSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)
  return run((tx, actor) => createBrand(tx, parsed.data, actor))
}

export async function updateBrandAction(id, values) {
  const bid = parseId(id)
  if (!bid) return { ok: false, error: 'Brand not found.' }
  const parsed = brandSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)
  return run((tx, actor) => updateBrand(tx, bid, parsed.data, actor))
}

export async function setBrandStatusAction(id, active) {
  const bid = parseId(id)
  if (!bid || typeof active !== 'boolean') return { ok: false, error: 'Invalid request.' }
  return run((tx, actor) => setBrandStatus(tx, bid, active, actor))
}

/** Soft delete; refused while any product still uses the brand. */
export async function deleteBrandAction(id) {
  const bid = parseId(id)
  if (!bid) return { ok: false, error: 'Brand not found.' }
  return run((tx, actor) => softDeleteBrand(tx, bid, actor))
}
