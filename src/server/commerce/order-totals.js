// Order and order-line totals (pure, integer cents). The results satisfy the
// CHECK constraints on order_items and orders exactly:
//   line:  subtotal = price * quantity; 0 <= discount <= subtotal; total = subtotal - discount
//   order: subtotal = SUM(line totals); discount <= subtotal;
//          total = subtotal - discount + shipping + tax
// The order-level discount (coupon) is separate from line discounts, so nothing
// is deducted twice.
import { CommerceError } from './errors.js'

export const MIN_QUANTITY = 1
export const MAX_QUANTITY = 10

const isCents = (n) => Number.isSafeInteger(n) && n >= 0

export function isValidQuantity(q) {
  return Number.isInteger(q) && q >= MIN_QUANTITY && q <= MAX_QUANTITY
}

export function computeLine({ priceMinor, quantity, discountMinor = 0 }) {
  if (!isCents(priceMinor)) throw new CommerceError('invalid_price')
  if (!isValidQuantity(quantity)) throw new CommerceError('invalid_quantity')
  const subtotal = priceMinor * quantity
  if (!isCents(discountMinor) || discountMinor > subtotal) throw new CommerceError('invalid_line_discount')
  return { priceMinor, quantity, subtotalMinor: subtotal, discountMinor, totalMinor: subtotal - discountMinor }
}

export function computeOrder({ lines, discountMinor = 0, shippingMinor = 0, taxMinor = 0 }) {
  if (!Array.isArray(lines) || lines.length === 0) throw new CommerceError('empty_order')
  for (const n of [discountMinor, shippingMinor, taxMinor]) if (!isCents(n)) throw new CommerceError('invalid_amount')
  const subtotal = lines.reduce((sum, l) => sum + l.totalMinor, 0)
  if (!Number.isSafeInteger(subtotal)) throw new CommerceError('invalid_amount')
  if (discountMinor > subtotal) throw new CommerceError('discount_exceeds_subtotal')
  return {
    subtotalMinor: subtotal,
    discountMinor,
    shippingMinor,
    taxMinor,
    totalMinor: subtotal - discountMinor + shippingMinor + taxMinor,
  }
}
