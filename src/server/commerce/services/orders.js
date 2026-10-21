// Fulfilment status changes (U4) and cancellation with stock / coupon release.
// Lock order: order -> coupon -> products ascending -> order items.
// TARGET SCHEMA ONLY: not imported by any route until the replacement migration.
import 'server-only'
import { recordAudit } from '../../audit/audit.js'
import { CommerceError } from '../errors.js'
import { assertFulfilmentTransition } from '../order-state.js'
import { remainingQuantity } from '../stock-rules.js'
import { releaseCouponForOrder } from './coupons.js'
import { lockProducts, releaseOrderItem } from './stock.js'

export async function lockOrder(tx, orderId) {
  const [row] = await tx.$queryRaw`
    SELECT id, status, payment_status AS paymentStatus, payment_method AS paymentMethod,
           coupon_code AS couponCode, coupon_released_at AS couponReleasedAt, total
    FROM orders WHERE id = ${BigInt(orderId)} FOR UPDATE`
  if (!row) throw new CommerceError('order_not_found', 'Order not found')
  return row
}

/**
 * Move an order to `to`. Cancelling releases every remaining unit (restoring
 * stock for lines that were deducted) and, for unpaid orders, the coupon use.
 * Payment status is never changed here.
 */
export async function changeOrderStatus(db, orderId, to, actor) {
  return db.$transaction(async (tx) => {
    const order = await lockOrder(tx, orderId)
    assertFulfilmentTransition(order, to)

    const n = await tx.$executeRaw`
      UPDATE orders SET status = ${to}, updated_at = CURRENT_TIMESTAMP(3)
      WHERE id = ${order.id} AND status = ${order.status}`
    if (n !== 1) throw new CommerceError('order_conflict', 'This order changed; reload and try again')

    let released = []
    let couponReleased = false
    if (to === 'cancelled') {
      couponReleased = await releaseCouponForOrder(tx, { ...order, status: 'cancelled' })
      // product_id is an order-time snapshot and never changes, so a plain read
      // is enough to know which products to lock before the items.
      const productRows = await tx.$queryRaw`
        SELECT DISTINCT product_id AS productId FROM order_items WHERE order_id = ${order.id} AND product_id IS NOT NULL`
      await lockProducts(tx, productRows.map((r) => r.productId))
      const items = await tx.$queryRaw`
        SELECT id, product_id AS productId, quantity, released_quantity AS releasedQuantity, stock_deducted AS stockDeducted
        FROM order_items WHERE order_id = ${order.id} ORDER BY id FOR UPDATE`
      const open = items
        .map((i) => ({ ...i, quantity: Number(i.quantity), releasedQuantity: Number(i.releasedQuantity), stockDeducted: Boolean(i.stockDeducted) }))
        .filter((i) => remainingQuantity(i) > 0)
      for (const item of open) {
        const plan = await releaseOrderItem(tx, item, { quantity: remainingQuantity(item), kind: 'cancel' })
        released.push({ itemId: String(item.id), quantity: plan.nextReleased - plan.expectedReleased, restored: plan.restoreQuantity })
      }
    }

    await recordAudit(tx, {
      ...actor,
      action: to === 'cancelled' ? 'order.cancel' : 'order.status.update',
      targetType: 'order',
      targetId: String(order.id),
      before: { status: order.status },
      after: { status: to, released, couponReleased },
    })
    return { id: String(order.id), status: to, released, couponReleased }
  })
}
