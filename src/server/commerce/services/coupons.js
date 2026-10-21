// Coupon usage inside the checkout / cancellation transaction (SC-6).
// TARGET SCHEMA ONLY: not imported by any route until the replacement migration.
import 'server-only'
import { CommerceError } from '../errors.js'
import { canReleaseCoupon } from '../coupon-rules.js'

/** SELECT ... FOR UPDATE by normalised code; null when no such coupon. */
export async function lockCoupon(tx, code) {
  const [row] = await tx.$queryRaw`
    SELECT id, code, type, value, min_order_amount AS minOrderAmount, max_discount AS maxDiscount,
           usage_limit AS usageLimit, used_count AS usedCount, starts_at AS startsAt,
           expires_at AS expiresAt, status
    FROM coupons WHERE code = ${code} FOR UPDATE`
  if (!row) return null
  return {
    ...row,
    status: Boolean(row.status),
    usageLimit: row.usageLimit == null ? null : Number(row.usageLimit),
    usedCount: Number(row.usedCount),
  }
}

/** Consume one use; the conditional UPDATE is the final guard against over-redemption. */
export async function consumeCoupon(tx, couponId) {
  const n = await tx.$executeRaw`
    UPDATE coupons SET used_count = used_count + 1, updated_at = CURRENT_TIMESTAMP(3)
    WHERE id = ${BigInt(couponId)} AND status = TRUE
      AND (usage_limit IS NULL OR used_count < usage_limit)`
  if (n !== 1) throw new CommerceError('coupon_unavailable', 'This coupon can no longer be used')
}

/**
 * Give a coupon use back for an unpaid cancelled order, once. The order row is
 * marked first with a guarded UPDATE so a repeated call releases nothing.
 * Returns true when a use was released.
 */
export async function releaseCouponForOrder(tx, order) {
  if (!canReleaseCoupon(order)) return false
  const marked = await tx.$executeRaw`
    UPDATE orders SET coupon_released_at = CURRENT_TIMESTAMP(3), updated_at = CURRENT_TIMESTAMP(3)
    WHERE id = ${BigInt(order.id)} AND coupon_released_at IS NULL AND status = 'cancelled'
      AND payment_status IN ('pending', 'failed') AND coupon_code IS NOT NULL`
  if (marked !== 1) return false
  await tx.$executeRaw`
    UPDATE coupons SET used_count = used_count - 1, updated_at = CURRENT_TIMESTAMP(3)
    WHERE code = ${order.couponCode} AND used_count > 0`
  return true
}
