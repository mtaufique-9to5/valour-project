// Guarded stock writes (SC-4). Every function takes the interactive transaction
// `tx`; the caller holds the locks in the documented order:
//   order -> coupon -> products (ascending id) -> order items -> payments
// TARGET SCHEMA ONLY: not imported by any route until the replacement migration.
import 'server-only'
import { CommerceError } from '../errors.js'
import { planRelease } from '../stock-rules.js'

/** SELECT ... FOR UPDATE on products in ascending id order; returns Map(String(id) -> row). */
export async function lockProducts(tx, productIds) {
  const ids = [...new Set(productIds.map((id) => BigInt(id)))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  const rows = new Map()
  for (const id of ids) {
    const [row] = await tx.$queryRaw`
      SELECT id, name, sku, type, status, deleted_at AS deletedAt, track_stock AS trackStock, stock,
             base_price AS basePrice, sale_price AS salePrice, main_image AS mainImage
      FROM products WHERE id = ${id} FOR UPDATE`
    if (row) rows.set(String(row.id), { ...row, trackStock: Boolean(row.trackStock), stock: Number(row.stock) })
  }
  return rows
}

/** Deduct planned quantities; each UPDATE must hit exactly one tracked row with enough stock. */
export async function applyDeductions(tx, deductions) {
  for (const { productId, quantity } of deductions) {
    const n = await tx.$executeRaw`
      UPDATE products SET stock = stock - ${quantity}, updated_at = CURRENT_TIMESTAMP(3)
      WHERE id = ${BigInt(productId)} AND track_stock = TRUE AND stock >= ${quantity}`
    if (n !== 1) throw new CommerceError('insufficient_stock', 'Stock changed during checkout', [{ productId: String(productId) }])
  }
}

/**
 * Release `quantity` units of one order line (cancellation or return).
 * The guarded UPDATE fails if another request released units first, so units
 * are never released twice. Stock is added back only for tracked products.
 */
export async function releaseOrderItem(tx, item, { quantity, kind, restock = false }) {
  const plan = planRelease(item, { quantity, kind, restock })
  const n = await tx.$executeRaw`
    UPDATE order_items SET released_quantity = released_quantity + ${quantity}, updated_at = CURRENT_TIMESTAMP(3)
    WHERE id = ${BigInt(item.id)} AND released_quantity = ${plan.expectedReleased}
      AND released_quantity + ${quantity} <= quantity`
  if (n !== 1) throw new CommerceError('release_conflict', 'This order line changed; reload and try again')
  if (plan.restoreQuantity > 0) {
    // 0 rows is fine: the product is no longer tracked, so there is nothing to restore.
    await tx.$executeRaw`
      UPDATE products SET stock = stock + ${plan.restoreQuantity}, updated_at = CURRENT_TIMESTAMP(3)
      WHERE id = ${BigInt(item.productId)} AND track_stock = TRUE`
  }
  return plan
}

/** Admin stock correction: absolute value, optimistic check on the value the admin saw. */
export async function setStock(tx, productId, { expected, next }) {
  const n = await tx.$executeRaw`
    UPDATE products SET stock = ${next}, updated_at = CURRENT_TIMESTAMP(3)
    WHERE id = ${BigInt(productId)} AND stock = ${expected} AND deleted_at IS NULL`
  if (n !== 1) throw new CommerceError('stock_conflict', 'Stock changed since the page was loaded; reload and try again')
}
