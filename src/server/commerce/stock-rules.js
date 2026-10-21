// Stock rules (pure) for SC-4. Only products with track_stock = TRUE are ever
// deducted or restored. The database enforces the final word with guarded
// UPDATEs (services/stock.js); these functions plan the work and explain
// failures before any write happens.
import { CommerceError } from './errors.js'

export const MAX_STOCK = 1_000_000

export function isValidStock(n) {
  return Number.isInteger(n) && n >= 0 && n <= MAX_STOCK
}

const idKey = (id) => String(id)
const byIdAsc = (a, b) => (BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0)

/**
 * Plan stock deductions for a checkout.
 * lines:    [{ productId, quantity }] (one product may appear on several lines, e.g. custom options)
 * products: Map(String(id) -> { id, status, deletedAt, trackStock, stock })
 * Returns { deductions: [{ productId, quantity }] in ascending id order (the lock
 * order), deductedProductIds: Set } or throws CommerceError with per-product details.
 */
export function planDeductions(lines, products) {
  const wanted = new Map()
  for (const l of lines) wanted.set(idKey(l.productId), (wanted.get(idKey(l.productId)) ?? 0) + l.quantity)

  const problems = []
  const deductions = []
  for (const key of [...wanted.keys()].sort(byIdAsc)) {
    const p = products.get(key)
    const qty = wanted.get(key)
    if (!p || p.deletedAt || p.status !== 'active') { problems.push({ productId: key, reason: 'unavailable' }); continue }
    if (!p.trackStock) continue
    if (p.stock < qty) { problems.push({ productId: key, reason: 'insufficient_stock', available: p.stock, requested: qty }); continue }
    deductions.push({ productId: p.id, quantity: qty })
  }
  if (problems.length) throw new CommerceError(problems.some((p) => p.reason === 'unavailable') ? 'product_unavailable' : 'insufficient_stock', 'Some items cannot be ordered', problems)
  return { deductions, deductedProductIds: new Set(deductions.map((d) => idKey(d.productId))) }
}

/** Units of an order line not yet cancelled or returned. */
export function remainingQuantity(item) {
  return item.quantity - item.releasedQuantity
}

/**
 * Plan releasing `quantity` units of one order line.
 * kind 'cancel': stock goes back if the line was deducted at checkout.
 * kind 'return': stock goes back only if the returned unit is restocked.
 * Either way only tracked products are restored (the UPDATE also checks track_stock).
 * Returns { expectedReleased, nextReleased, restoreQuantity }.
 */
export function planRelease(item, { quantity, kind, restock = false }) {
  if (kind !== 'cancel' && kind !== 'return') throw new CommerceError('invalid_release_kind')
  if (!Number.isInteger(quantity) || quantity < 1) throw new CommerceError('invalid_quantity')
  if (quantity > remainingQuantity(item)) throw new CommerceError('release_exceeds_remaining', 'More units than remain on this line', { remaining: remainingQuantity(item) })
  const restores = kind === 'cancel' ? item.stockDeducted === true : restock === true
  return {
    expectedReleased: item.releasedQuantity,
    nextReleased: item.releasedQuantity + quantity,
    restoreQuantity: restores && item.productId != null ? quantity : 0,
  }
}

/** Validate an admin stock change (absolute value, not a delta). */
export function stockChangeError(next) {
  return isValidStock(next) ? null : `Stock must be a whole number from 0 to ${MAX_STOCK.toLocaleString('en-US')}`
}
