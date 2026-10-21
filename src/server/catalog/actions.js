'use server'
// Catalog server actions. Every action: validates input with zod, checks the
// session (active, MFA complete) and the permission(s) server-side, then writes
// the change, its history rows (PriceChange / InventoryAdjustment) and the audit
// entry in ONE transaction. Errors are generic; validation failures may carry
// fieldErrors ({ field: [message] }).
//
// Price rules: no "Price on request". Prices are decimal strings > 0 in USD
// ("499.99" -> 49999 minor units). amount_minor NULL exists only on the legacy
// imported Custom Watch (DRAFT) and blocks activation until a price is set.
// Status rules: src/server/catalog/product-rules.js.
import { db } from '../db.js'
import { getAdminContext } from '../admin/context.js'
import { isKnownPermission, PERMISSIONS } from '../rbac/permissions.js'
import { recordAudit } from '../audit/audit.js'
import {
  productIdSchema, productCreateSchema, productUpdateSchema, priceUpdateSchema,
  inventoryAdjustSchema, statusSchema, trackingSchema, fieldErrorsOf,
} from './schemas.js'
import { minorToDollars, CURRENCY } from './money.js'
import { statusChangeError, typeChangeError, slugFor } from './product-rules.js'
import { revalidateCatalog } from './revalidate.js'

const INVALID = { ok: false, error: 'Invalid input.' }
const FORBIDDEN = { ok: false, error: 'You do not have permission to do this.' }
const NOT_FOUND = { ok: false, error: 'Product not found.' }
const FAILED = { ok: false, error: 'Could not save the change. Please try again.' }

class NotFound extends Error {}
class Rejected extends Error {
  constructor(message, fieldErrors) {
    super(message)
    this.fieldErrors = fieldErrors
  }
}

const invalid = (...errors) => {
  const fieldErrors = Object.assign({}, ...errors.filter(Boolean).map(fieldErrorsOf))
  return Object.keys(fieldErrors).length ? { ...INVALID, fieldErrors } : INVALID
}

// requireAdmin (inside getAdminContext) redirects when there is no valid
// MFA-complete session; that redirect must propagate, so it is not caught.
async function authorize(...permissions) {
  const ctx = await getAdminContext()
  const ok = permissions.every((p) => isKnownPermission(p) && ctx.permissions.includes(p))
  return ok ? ctx : null
}

const actor = (ctx) => ({ actorType: 'ADMIN', actorId: ctx.user.id, actorLabel: ctx.user.email })

function fail(err) {
  if (err instanceof NotFound) return NOT_FOUND
  if (err instanceof Rejected) return err.fieldErrors ? { ok: false, error: err.message, fieldErrors: err.fieldErrors } : { ok: false, error: err.message }
  if (err?.code === 'P2002') return { ok: false, error: 'This SKU is already used by another product.', fieldErrors: { sku: ['This SKU is already used.'] } }
  console.error('[catalog] action failed')
  return FAILED
}

// ─── Transaction helpers ────────────────────────────────────────────────────

const PRODUCT_SNAPSHOT = {
  id: true, type: true, status: true, name: true, description: true, ref: true, collectionId: true,
  subtitle: true, movement: true, material: true, color: true, tagline: true, limited: true, edition: true,
}

async function loadProduct(tx, id) {
  const p = await tx.product.findUnique({ where: { id }, select: PRODUCT_SNAPSHOT })
  if (!p) throw new NotFound()
  return p
}

async function loadRuleState(tx, id) {
  const p = await tx.product.findUnique({
    where: { id },
    select: {
      name: true, ref: true, status: true,
      prices: { where: { currency: CURRENCY }, select: { amountMinor: true, confirmed: true, currency: true } },
      images: { where: { role: 'MAIN' }, select: { role: true, isPrimary: true } },
    },
  })
  if (!p) throw new NotFound()
  return { name: p.name, ref: p.ref, status: p.status, price: p.prices[0] ?? null, images: p.images }
}

async function assertCategory(tx, categoryId) {
  if (categoryId === null || categoryId === undefined) return
  const c = await tx.collection.findUnique({ where: { id: categoryId }, select: { id: true } })
  if (!c) throw new Rejected('Choose an existing category.', { categoryId: ['Choose an existing category.'] })
}

const snapshot = (p) => ({
  name: p.name, description: p.description, sku: p.ref, categoryId: p.collectionId, type: p.type, status: p.status,
  subtitle: p.subtitle, movement: p.movement, material: p.material, color: p.color, tagline: p.tagline, limited: p.limited, edition: p.edition,
})

async function writePrice(tx, ctx, productId, amountMinor, reason) {
  const key = { productId_currency: { productId, currency: CURRENCY } }
  const old = await tx.price.findUnique({ where: key, select: { amountMinor: true, confirmed: true } })
  if (old && old.amountMinor === amountMinor && old.confirmed) return
  const now = new Date()
  await tx.price.upsert({
    where: key,
    create: { productId, currency: CURRENCY, amountMinor, confirmed: true, updatedBy: ctx.user.id, effectiveAt: now },
    update: { amountMinor, confirmed: true, updatedBy: ctx.user.id, effectiveAt: now },
  })
  await tx.priceChange.create({
    data: {
      productId, currency: CURRENCY,
      oldAmountMinor: old?.amountMinor ?? null, newAmountMinor: amountMinor,
      oldConfirmed: old?.confirmed ?? null, newConfirmed: true,
      reason, actorId: ctx.user.id,
    },
  })
  await recordAudit(tx, {
    ...actor(ctx), action: 'product.price.update', targetType: 'product', targetId: String(productId),
    before: old ? { price: old.confirmed ? minorToDollars(old.amountMinor) : null, amountMinor: old.amountMinor, confirmed: old.confirmed, currency: CURRENCY } : null,
    after: { price: minorToDollars(amountMinor), amountMinor, confirmed: true, currency: CURRENCY, reason },
  })
}

async function writeTracking(tx, ctx, productId, trackingMode, quantity, reason) {
  const inv = await tx.inventory.findUnique({ where: { productId }, select: { trackingMode: true, quantityOnHand: true } })
  const before = { trackingMode: inv?.trackingMode ?? 'NOT_TRACKED', quantityOnHand: inv?.quantityOnHand ?? null }
  const next = trackingMode === 'TRACKED' ? quantity : null
  if (before.trackingMode === trackingMode && before.quantityOnHand === next) return
  await tx.inventory.upsert({
    where: { productId },
    create: { productId, trackingMode, quantityOnHand: next, updatedBy: ctx.user.id },
    update: { trackingMode, quantityOnHand: next, updatedBy: ctx.user.id },
  })
  const delta = (next ?? 0) - (before.quantityOnHand ?? 0)
  const why = reason ?? (before.trackingMode === 'NOT_TRACKED' && trackingMode === 'TRACKED' ? 'INITIAL_COUNT' : 'CORRECTION')
  const note = before.trackingMode === trackingMode ? null : `tracking ${before.trackingMode} -> ${trackingMode}`
  await tx.inventoryAdjustment.create({
    data: { productId, delta, quantityAfter: next, reason: why, note, actorId: ctx.user.id },
  })
  await recordAudit(tx, {
    ...actor(ctx), action: 'inventory.tracking.update', targetType: 'product', targetId: String(productId),
    before, after: { trackingMode, quantityOnHand: next, delta, reason: why },
  })
}

async function writeStatus(tx, ctx, productId, to) {
  const state = await loadRuleState(tx, productId)
  if (state.status === to) return
  const error = statusChangeError(state.status, to, state)
  if (error) throw new Rejected(error, { status: [error] })
  await tx.product.update({ where: { id: productId }, data: { status: to } })
  await recordAudit(tx, {
    ...actor(ctx), action: to === 'ARCHIVED' ? 'product.archive' : 'product.status.update', targetType: 'product', targetId: String(productId),
    before: { status: state.status }, after: { status: to },
  })
}

// ─── Actions ────────────────────────────────────────────────────────────────

/**
 * Create a DRAFT product with content, USD price (+ PriceChange), inventory row
 * (+ INITIAL_COUNT adjustment when TRACKED) and audit. Permission: product.create.
 * @param {{ name: string, description?: string|null, sku: string, categoryId?: number|null,
 *   type: 'WATCH'|'STRAP', price: string, currency?: 'USD', trackingMode: 'TRACKED'|'NOT_TRACKED',
 *   quantity?: number|null, status?: 'DRAFT' }} input
 * @returns {Promise<{ ok: true, id: number } | { ok: false, error: string, fieldErrors?: object }>}
 */
export async function createProduct(input) {
  const parsed = productCreateSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ctx = await authorize(PERMISSIONS.PRODUCT_CREATE)
  if (!ctx) return FORBIDDEN
  const v = parsed.data
  let id
  try {
    id = await db.$transaction(async (tx) => {
      await assertCategory(tx, v.categoryId)
      const last = await tx.product.findFirst({ where: { type: v.type }, orderBy: { position: 'desc' }, select: { position: true } })
      const product = await tx.product.create({
        data: {
          type: v.type, status: 'DRAFT', slug: slugFor(v.name, v.sku), ref: v.sku, name: v.name,
          description: v.description, collectionId: v.categoryId, position: (last?.position ?? -1) + 1,
        },
        select: PRODUCT_SNAPSHOT,
      })
      await tx.productContent.create({ data: { productId: product.id, data: '{}' } })
      await tx.inventory.create({ data: { productId: product.id, trackingMode: 'NOT_TRACKED', quantityOnHand: null, updatedBy: ctx.user.id } })
      await recordAudit(tx, {
        ...actor(ctx), action: 'product.create', targetType: 'product', targetId: String(product.id),
        after: { ...snapshot(product), price: minorToDollars(v.amountMinor), currency: CURRENCY, trackingMode: v.trackingMode, quantity: v.quantity },
      })
      await writePrice(tx, ctx, product.id, v.amountMinor, 'initial price')
      if (v.trackingMode === 'TRACKED') await writeTracking(tx, ctx, product.id, 'TRACKED', v.quantity, 'INITIAL_COUNT')
      return product.id
    })
  } catch (err) {
    return fail(err)
  }
  revalidateCatalog()
  return { ok: true, id }
}

/**
 * Update any editable fields (partial). Extra permissions: product.price.update
 * when `price` is sent, inventory.update when `trackingMode`/`quantity` is sent.
 * `type` may change only while DRAFT (WATCH <-> STRAP). `status` follows
 * setProductStatus rules and is applied last, so one submit can set a price and
 * activate. Archived products only accept { status: 'DRAFT' }.
 * @param {number|string} id
 * @param {object} input partial create shape plus status and legacy columns
 *   (subtitle, movement, material, color, tagline, limited, edition)
 * @returns {Promise<{ ok: true } | { ok: false, error: string, fieldErrors?: object }>}
 */
export async function updateProduct(id, input) {
  const pid = productIdSchema.safeParse(id)
  const parsed = productUpdateSchema.safeParse(input)
  if (!pid.success || !parsed.success) return invalid(parsed.error)
  const { amountMinor, trackingMode, quantity, status, sku, categoryId, currency: _c, ...fields } = parsed.data
  const perms = [PERMISSIONS.PRODUCT_UPDATE]
  if (amountMinor !== undefined) perms.push(PERMISSIONS.PRODUCT_PRICE_UPDATE)
  if (trackingMode !== undefined) perms.push(PERMISSIONS.INVENTORY_UPDATE)
  const ctx = await authorize(...perms)
  if (!ctx) return FORBIDDEN
  try {
    await db.$transaction(async (tx) => {
      const before = await loadProduct(tx, pid.data)
      const onlyRestore = Object.keys(parsed.data).every((k) => k === 'status') && status === 'DRAFT'
      if (before.status === 'ARCHIVED' && !onlyRestore) throw new Rejected('Archived products cannot be edited. Restore it to Draft first.')
      if (fields.type !== undefined) {
        const e = typeChangeError(before.type, before.status, fields.type)
        if (e) throw new Rejected(e, { type: [e] })
      }
      if (categoryId !== undefined) await assertCategory(tx, categoryId)
      const data = { ...fields }
      if (sku !== undefined) data.ref = sku
      if (categoryId !== undefined) data.collectionId = categoryId
      if (Object.keys(data).length > 0) {
        const after = await tx.product.update({ where: { id: pid.data }, data, select: PRODUCT_SNAPSHOT })
        await recordAudit(tx, { ...actor(ctx), action: 'product.update', targetType: 'product', targetId: String(pid.data), before: snapshot(before), after: snapshot(after) })
      }
      if (amountMinor !== undefined) await writePrice(tx, ctx, pid.data, amountMinor, 'edited in product form')
      if (trackingMode !== undefined) await writeTracking(tx, ctx, pid.data, trackingMode, quantity ?? null, undefined)
      if (status !== undefined) await writeStatus(tx, ctx, pid.data, status)
    })
  } catch (err) {
    return fail(err)
  }
  revalidateCatalog()
  return { ok: true }
}

/**
 * Set the USD price. Permission: product.price.update. null / 0 / negative are rejected.
 * @param {number|string} productId
 * @param {{ amount: string, reason: string, currency?: 'USD' }} input e.g. { amount: '499.99', reason: 'new season' }
 * @returns {Promise<{ ok: true } | { ok: false, error: string, fieldErrors?: object }>}
 */
export async function updatePrice(productId, input) {
  const pid = productIdSchema.safeParse(productId)
  const parsed = priceUpdateSchema.safeParse(input)
  if (!pid.success || !parsed.success) return invalid(parsed.error)
  const ctx = await authorize(PERMISSIONS.PRODUCT_PRICE_UPDATE)
  if (!ctx) return FORBIDDEN
  try {
    await db.$transaction(async (tx) => {
      const p = await loadProduct(tx, pid.data)
      if (p.status === 'ARCHIVED') throw new Rejected('Archived products cannot be edited. Restore it to Draft first.')
      await writePrice(tx, ctx, pid.data, parsed.data.amountMinor, parsed.data.reason)
    })
  } catch (err) {
    return fail(err)
  }
  revalidateCatalog()
  return { ok: true }
}

/**
 * Change status. ACTIVE requires name, SKU, a price > 0 and a MAIN image.
 * Transitions: DRAFT -> ACTIVE|ARCHIVED, ACTIVE -> DRAFT|ARCHIVED, ARCHIVED -> DRAFT.
 * Permission: product.update.
 * @param {number|string} id
 * @param {'DRAFT'|'ACTIVE'|'ARCHIVED'} status
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function setProductStatus(id, status) {
  const pid = productIdSchema.safeParse(id)
  const s = statusSchema.safeParse(status)
  if (!pid.success || !s.success) return INVALID
  const ctx = await authorize(PERMISSIONS.PRODUCT_UPDATE)
  if (!ctx) return FORBIDDEN
  try {
    await db.$transaction((tx) => writeStatus(tx, ctx, pid.data, s.data))
  } catch (err) {
    return fail(err)
  }
  revalidateCatalog()
  return { ok: true }
}

/**
 * Archive (soft delete; history, prices, orders preserved). Permission: product.update.
 * @param {number|string} id
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function archiveProduct(id) {
  return setProductStatus(id, 'ARCHIVED')
}

/**
 * Adjust stock of a TRACKED product (exactly one of delta / setQuantity).
 * Permission: inventory.update.
 * @param {number|string} productId
 * @param {{ delta?: number, setQuantity?: number, reason: 'INITIAL_COUNT'|'RESTOCK'|'SALE'|'RETURN'|'DAMAGE'|'CORRECTION', note?: string|null }} input
 * @returns {Promise<{ ok: true } | { ok: false, error: string, fieldErrors?: object }>}
 */
export async function adjustInventory(productId, input) {
  const pid = productIdSchema.safeParse(productId)
  const parsed = inventoryAdjustSchema.safeParse(input)
  if (!pid.success || !parsed.success) return invalid(parsed.error)
  const ctx = await authorize(PERMISSIONS.INVENTORY_UPDATE)
  if (!ctx) return FORBIDDEN
  const { delta, setQuantity, reason, note = null } = parsed.data
  try {
    await db.$transaction(async (tx) => {
      await loadProduct(tx, pid.data)
      const inv = await tx.inventory.findUnique({ where: { productId: pid.data }, select: { trackingMode: true, quantityOnHand: true } })
      if (inv?.trackingMode !== 'TRACKED' || !Number.isInteger(inv.quantityOnHand)) {
        throw new Rejected('Stock is not tracked for this product. Turn on tracking first.')
      }
      const current = inv.quantityOnHand
      const next = setQuantity !== undefined ? setQuantity : current + delta
      if (next < 0) throw new Rejected('Stock cannot go below zero.')
      const appliedDelta = next - current
      await tx.inventory.update({ where: { productId: pid.data }, data: { quantityOnHand: next, updatedBy: ctx.user.id } })
      await tx.inventoryAdjustment.create({
        data: { productId: pid.data, delta: appliedDelta, quantityAfter: next, reason, note, actorId: ctx.user.id },
      })
      await recordAudit(tx, {
        ...actor(ctx), action: 'inventory.update', targetType: 'product', targetId: String(pid.data),
        before: { quantityOnHand: current },
        after: { quantityOnHand: next, delta: appliedDelta, reason, note },
      })
    })
  } catch (err) {
    return fail(err)
  }
  revalidateCatalog()
  return { ok: true }
}

/**
 * Switch stock tracking. TRACKED requires { quantity: int >= 0 }; NOT_TRACKED
 * clears the quantity (an adjustment row records the change). Permission: inventory.update.
 * @param {number|string} productId
 * @param {'TRACKED'|'NOT_TRACKED'} mode
 * @param {{ quantity?: number|null, reason?: 'INITIAL_COUNT'|'RESTOCK'|'SALE'|'RETURN'|'DAMAGE'|'CORRECTION' }} [options]
 * @returns {Promise<{ ok: true } | { ok: false, error: string, fieldErrors?: object }>}
 */
export async function setTrackingMode(productId, mode, options = {}) {
  const pid = productIdSchema.safeParse(productId)
  const parsed = trackingSchema.safeParse({ ...(options ?? {}), trackingMode: mode })
  if (!pid.success || !parsed.success) return invalid(parsed.error)
  const ctx = await authorize(PERMISSIONS.INVENTORY_UPDATE)
  if (!ctx) return FORBIDDEN
  try {
    await db.$transaction(async (tx) => {
      const p = await loadProduct(tx, pid.data)
      if (p.status === 'ARCHIVED') throw new Rejected('Archived products cannot be edited. Restore it to Draft first.')
      await writeTracking(tx, ctx, pid.data, parsed.data.trackingMode, parsed.data.quantity ?? null, parsed.data.reason)
    })
  } catch (err) {
    return fail(err)
  }
  revalidateCatalog()
  return { ok: true }
}
