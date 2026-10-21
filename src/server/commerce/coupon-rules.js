// Coupon validation and discount calculation (pure). The checkout transaction
// re-checks usage atomically with a conditional UPDATE (services/coupons.js);
// these rules decide whether a coupon applies and how much it takes off.
import { toMinor } from './money.js'

export const COUPON_CODE_RE = /^[A-Z0-9][A-Z0-9_-]{0,99}$/

/** ' summer-10 ' -> 'SUMMER-10'. Returns null for empty or malformed input. */
export function normalizeCouponCode(raw) {
  if (typeof raw !== 'string') return null
  const code = raw.trim().toUpperCase()
  return COUPON_CODE_RE.test(code) ? code : null
}

/**
 * Decide whether `coupon` applies to an order subtotal at time `now`.
 * Returns { ok: true, discountMinor } or { ok: false, reason }.
 * Reasons: inactive, not_started, expired, usage_exhausted, below_minimum.
 */
export function evaluateCoupon(coupon, { subtotalMinor, now = new Date() }) {
  if (!Number.isSafeInteger(subtotalMinor) || subtotalMinor < 0) throw new RangeError('invalid subtotal')
  if (!coupon || coupon.status !== true) return { ok: false, reason: 'inactive' }
  if (coupon.startsAt && now < coupon.startsAt) return { ok: false, reason: 'not_started' }
  if (coupon.expiresAt && now >= coupon.expiresAt) return { ok: false, reason: 'expired' }
  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, reason: 'usage_exhausted' }
  }
  if (subtotalMinor < toMinor(coupon.minOrderAmount ?? '0')) return { ok: false, reason: 'below_minimum' }
  return { ok: true, discountMinor: couponDiscountMinor(coupon, subtotalMinor) }
}

/**
 * Discount in cents, never more than the subtotal or the coupon's cap.
 * Percentages are rounded down so the customer is never over-discounted by a cent.
 */
export function couponDiscountMinor(coupon, subtotalMinor) {
  const value = toMinor(coupon.value)
  let discount
  if (coupon.type === 'fixed') {
    discount = value
  } else if (coupon.type === 'percentage') {
    // value is a percentage with 2 decimals: 12.50% -> 1250 -> subtotal * 1250 / 10000
    discount = Number((BigInt(subtotalMinor) * BigInt(value)) / 10000n)
  } else {
    throw new RangeError('unknown coupon type')
  }
  const cap = toMinor(coupon.maxDiscount)
  if (cap !== null) discount = Math.min(discount, cap)
  return Math.min(discount, subtotalMinor)
}

/**
 * A cancelled order gives its coupon use back only once, and only if it was
 * never paid (U4: a refund never returns the coupon).
 */
export function canReleaseCoupon(order) {
  return Boolean(order.couponCode) &&
    order.couponReleasedAt == null &&
    order.status === 'cancelled' &&
    (order.paymentStatus === 'pending' || order.paymentStatus === 'failed')
}
