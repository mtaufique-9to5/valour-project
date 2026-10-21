// Level-1 unit tests for the pure commerce rules (no database).
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { CommerceError } from '../../src/server/commerce/errors.js'
import { toMinor, toAmount, unitPriceMinor } from '../../src/server/commerce/money.js'
import { normalizeCouponCode, evaluateCoupon, couponDiscountMinor, canReleaseCoupon } from '../../src/server/commerce/coupon-rules.js'
import { computeLine, computeOrder } from '../../src/server/commerce/order-totals.js'
import { planDeductions, planRelease, remainingQuantity, stockChangeError } from '../../src/server/commerce/stock-rules.js'
import { assertFulfilmentTransition, assertPaymentTransition, assertRefundAmount, formatOrderNumber } from '../../src/server/commerce/order-state.js'
import { normalizeCustomOptions, optionsHash } from '../../src/server/commerce/custom-options.js'
import { newCheckoutToken, isCheckoutToken, isCheckoutTokenConflict } from '../../src/server/commerce/checkout-token.js'
import { checkoutSchema } from '../../src/server/commerce/checkout-schema.js'

const code = (fn) => { try { fn() } catch (e) { assert.ok(e instanceof CommerceError, e.message); return e.code } assert.fail('expected CommerceError') }

describe('money', () => {
  test('Decimal strings convert exactly; JS numbers are refused', () => {
    assert.equal(toMinor('525.00'), 52500)
    assert.equal(toMinor({ toString: () => '0.1' }), 10)
    assert.equal(toMinor(null), null)
    assert.throws(() => toMinor(525))
    assert.equal(toAmount(4500), '45.00')
    assert.throws(() => toAmount(-1))
  })
  test('unit price is the sale price when set', () => {
    assert.equal(unitPriceMinor({ basePrice: '525.00', salePrice: null }), 52500)
    assert.equal(unitPriceMinor({ basePrice: '525.00', salePrice: '499.99' }), 49999)
  })
})

describe('coupons', () => {
  const now = new Date('2026-10-21T12:00:00Z')
  const base = { status: true, type: 'percentage', value: '10.00', minOrderAmount: '0.00', maxDiscount: null, usageLimit: null, usedCount: 0, startsAt: null, expiresAt: null }

  test('codes are trimmed, upper-cased and validated', () => {
    assert.equal(normalizeCouponCode(' summer-10 '), 'SUMMER-10')
    assert.equal(normalizeCouponCode(''), null)
    assert.equal(normalizeCouponCode('bad code'), null)
    assert.equal(normalizeCouponCode(42), null)
  })
  test('percentage rounds down; fixed is capped at the subtotal; max_discount caps both', () => {
    assert.equal(couponDiscountMinor({ ...base, value: '12.50' }, 999), 124) // 124.875 -> 124
    assert.equal(couponDiscountMinor({ ...base, type: 'fixed', value: '50.00' }, 3000), 3000)
    assert.equal(couponDiscountMinor({ ...base, value: '50.00', maxDiscount: '20.00' }, 10000), 2000)
    assert.equal(couponDiscountMinor({ ...base, value: '100.00' }, 52500), 52500)
  })
  test('inactive, not started, expired, exhausted and below-minimum coupons are refused', () => {
    const at = { subtotalMinor: 10000, now }
    assert.deepEqual(evaluateCoupon({ ...base, status: false }, at), { ok: false, reason: 'inactive' })
    assert.deepEqual(evaluateCoupon({ ...base, startsAt: new Date('2026-10-22T00:00:00Z') }, at), { ok: false, reason: 'not_started' })
    assert.deepEqual(evaluateCoupon({ ...base, expiresAt: now }, at), { ok: false, reason: 'expired' })
    assert.deepEqual(evaluateCoupon({ ...base, usageLimit: 5, usedCount: 5 }, at), { ok: false, reason: 'usage_exhausted' })
    assert.deepEqual(evaluateCoupon({ ...base, minOrderAmount: '100.01' }, at), { ok: false, reason: 'below_minimum' })
    assert.deepEqual(evaluateCoupon(base, at), { ok: true, discountMinor: 1000 })
  })
  test('coupon use is given back only for unpaid cancelled orders, once', () => {
    const o = { couponCode: 'X', couponReleasedAt: null, status: 'cancelled', paymentStatus: 'pending' }
    assert.equal(canReleaseCoupon(o), true)
    assert.equal(canReleaseCoupon({ ...o, paymentStatus: 'failed' }), true)
    assert.equal(canReleaseCoupon({ ...o, paymentStatus: 'paid' }), false)
    assert.equal(canReleaseCoupon({ ...o, paymentStatus: 'refunded' }), false)
    assert.equal(canReleaseCoupon({ ...o, couponReleasedAt: new Date() }), false)
    assert.equal(canReleaseCoupon({ ...o, status: 'processing' }), false)
    assert.equal(canReleaseCoupon({ ...o, couponCode: null }), false)
  })
})

describe('order totals satisfy the CHECK constraints', () => {
  test('line: subtotal = price x qty, total = subtotal - discount', () => {
    assert.deepEqual(computeLine({ priceMinor: 52500, quantity: 2 }), { priceMinor: 52500, quantity: 2, subtotalMinor: 105000, discountMinor: 0, totalMinor: 105000 })
    assert.equal(code(() => computeLine({ priceMinor: 100, quantity: 0 })), 'invalid_quantity')
    assert.equal(code(() => computeLine({ priceMinor: 100, quantity: 11 })), 'invalid_quantity')
    assert.equal(code(() => computeLine({ priceMinor: 100, quantity: 1, discountMinor: 101 })), 'invalid_line_discount')
  })
  test('order: total = subtotal - discount + shipping + tax; discount <= subtotal', () => {
    const lines = [computeLine({ priceMinor: 52500, quantity: 1 }), computeLine({ priceMinor: 4500, quantity: 2 })]
    const t = computeOrder({ lines, discountMinor: 6150, shippingMinor: 1500, taxMinor: 0 })
    assert.equal(t.subtotalMinor, 61500)
    assert.equal(t.totalMinor, 61500 - 6150 + 1500)
    assert.equal(code(() => computeOrder({ lines, discountMinor: 61501 })), 'discount_exceeds_subtotal')
    assert.equal(code(() => computeOrder({ lines: [] })), 'empty_order')
  })
})

describe('stock (SC-4)', () => {
  const products = new Map([
    ['1', { id: 1n, status: 'active', deletedAt: null, trackStock: true, stock: 3 }],
    ['2', { id: 2n, status: 'active', deletedAt: null, trackStock: false, stock: 0 }],
    ['3', { id: 3n, status: 'draft', deletedAt: null, trackStock: true, stock: 9 }],
  ])
  test('quantities of one product across lines are summed; untracked products are skipped', () => {
    const plan = planDeductions([{ productId: 1n, quantity: 2 }, { productId: 2n, quantity: 5 }, { productId: 1n, quantity: 1 }], products)
    assert.deepEqual(plan.deductions, [{ productId: 1n, quantity: 3 }])
    assert.deepEqual([...plan.deductedProductIds], ['1'])
  })
  test('insufficient stock and unavailable products are refused before any write', () => {
    assert.throws(() => planDeductions([{ productId: 1n, quantity: 4 }], products), (e) => e.code === 'insufficient_stock' && e.details[0].available === 3)
    assert.throws(() => planDeductions([{ productId: 3n, quantity: 1 }], products), (e) => e.code === 'product_unavailable')
    assert.throws(() => planDeductions([{ productId: 99n, quantity: 1 }], products), (e) => e.code === 'product_unavailable')
  })
  test('deductions come out in ascending id order (the lock order)', () => {
    const many = new Map([['10', { id: 10n, status: 'active', trackStock: true, stock: 5 }], ['9', { id: 9n, status: 'active', trackStock: true, stock: 5 }]])
    assert.deepEqual(planDeductions([{ productId: 10n, quantity: 1 }, { productId: 9n, quantity: 1 }], many).deductions.map((d) => d.productId), [9n, 10n])
  })
  test('partial releases: never more than remains; stock back only when it was deducted / restocked', () => {
    const item = { productId: 1n, quantity: 3, releasedQuantity: 1, stockDeducted: true }
    assert.equal(remainingQuantity(item), 2)
    assert.deepEqual(planRelease(item, { quantity: 2, kind: 'cancel' }), { expectedReleased: 1, nextReleased: 3, restoreQuantity: 2 })
    assert.equal(planRelease({ ...item, stockDeducted: false }, { quantity: 1, kind: 'cancel' }).restoreQuantity, 0)
    assert.equal(planRelease(item, { quantity: 1, kind: 'return' }).restoreQuantity, 0)
    assert.equal(planRelease(item, { quantity: 1, kind: 'return', restock: true }).restoreQuantity, 1)
    assert.equal(planRelease({ ...item, productId: null }, { quantity: 1, kind: 'cancel' }).restoreQuantity, 0)
    assert.equal(code(() => planRelease(item, { quantity: 3, kind: 'cancel' })), 'release_exceeds_remaining')
    assert.equal(code(() => planRelease(item, { quantity: 0, kind: 'cancel' })), 'invalid_quantity')
    assert.equal(code(() => planRelease(item, { quantity: 1, kind: 'refund' })), 'invalid_release_kind')
  })
  test('admin stock values are whole numbers 0..1,000,000', () => {
    assert.equal(stockChangeError(0), null)
    assert.equal(stockChangeError(1_000_000), null)
    assert.ok(stockChangeError(1_000_001))
    assert.ok(stockChangeError(-1))
    assert.ok(stockChangeError(1.5))
  })
})

describe('order and payment states are independent (U4)', () => {
  const o = (status, paymentStatus = 'pending', paymentMethod = 'bank_transfer') => ({ status, paymentStatus, paymentMethod })
  test('fulfilment follows the documented path', () => {
    assertFulfilmentTransition(o('pending'), 'confirmed')
    assertFulfilmentTransition(o('confirmed'), 'processing')
    assertFulfilmentTransition(o('shipped', 'paid'), 'delivered')
    assert.equal(code(() => assertFulfilmentTransition(o('pending'), 'shipped')), 'invalid_transition')
    assert.equal(code(() => assertFulfilmentTransition(o('delivered'), 'pending')), 'invalid_transition')
    assert.equal(code(() => assertFulfilmentTransition(o('pending'), 'lost')), 'invalid_status')
  })
  test('cancellation only before shipment', () => {
    for (const s of ['pending', 'confirmed', 'processing']) assertFulfilmentTransition(o(s), 'cancelled')
    for (const s of ['shipped', 'delivered', 'cancelled']) assert.equal(code(() => assertFulfilmentTransition(o(s, 'paid'), 'cancelled')), 'invalid_transition')
  })
  test('shipping requires paid, or cash on delivery', () => {
    assert.equal(code(() => assertFulfilmentTransition(o('processing'), 'shipped')), 'payment_required')
    assertFulfilmentTransition(o('processing', 'paid'), 'shipped')
    assertFulfilmentTransition(o('processing', 'pending', 'cash_on_delivery'), 'shipped')
  })
  test('payment transitions; refunded only when fully refunded; a cancelled order cannot become paid', () => {
    assertPaymentTransition(o('pending'), 'paid')
    assertPaymentTransition(o('pending'), 'failed')
    assertPaymentTransition(o('pending', 'failed'), 'pending')
    assert.equal(code(() => assertPaymentTransition(o('pending', 'refunded'), 'paid')), 'invalid_payment_transition')
    assert.equal(code(() => assertPaymentTransition(o('cancelled'), 'paid')), 'order_cancelled')
    assert.equal(code(() => assertPaymentTransition(o('delivered', 'paid'), 'refunded', { paidMinor: 100, refundedMinor: 50 })), 'refund_incomplete')
    assertPaymentTransition(o('delivered', 'paid'), 'refunded', { paidMinor: 100, refundedMinor: 100 })
  })
  test('refunds never exceed what was paid', () => {
    assertRefundAmount(50, { paidMinor: 100, refundedMinor: 50 })
    assert.equal(code(() => assertRefundAmount(51, { paidMinor: 100, refundedMinor: 50 })), 'refund_exceeds_paid')
    assert.equal(code(() => assertRefundAmount(0, { paidMinor: 100, refundedMinor: 0 })), 'invalid_amount')
  })
  test('order numbers', () => {
    assert.equal(formatOrderNumber(42n), 'VAL-000042')
    assert.equal(formatOrderNumber(12345678n), 'VAL-12345678')
    assert.throws(() => formatOrderNumber('x'))
  })
})

describe('custom options (SC-3 / SC-8)', () => {
  const active = [
    { part: 'case', optionKey: 'black', name: 'Black', status: 'active' },
    { part: 'dial', optionKey: 'mint', name: 'Mint', status: 'active' },
    { part: 'strap', optionKey: 'grey-blue', name: 'Grey Blue', status: 'active' },
    { part: 'strap', optionKey: 'old', name: 'Old', status: 'inactive' },
  ]
  const pick = { caseId: 'black', dialId: 'mint', strapId: 'grey-blue' }
  test('valid selection is normalised with a stable hash and a name snapshot', () => {
    const r = normalizeCustomOptions('custom', { strapId: 'grey-blue', caseId: 'black', dialId: 'mint' }, active)
    assert.deepEqual(r.options, pick)
    assert.deepEqual(r.snapshot.dial, { key: 'mint', name: 'Mint' })
    assert.equal(r.hash, optionsHash(pick))
    assert.match(r.hash, /^[0-9a-f]{64}$/)
  })
  test('inactive, unknown, missing or extra options are refused; watches take none', () => {
    assert.equal(code(() => normalizeCustomOptions('custom', { ...pick, strapId: 'old' }, active)), 'invalid_option')
    assert.equal(code(() => normalizeCustomOptions('custom', { caseId: 'black', dialId: 'mint' }, active)), 'invalid_option')
    assert.equal(code(() => normalizeCustomOptions('custom', { ...pick, engraving: 'x' }, active)), 'unknown_option')
    assert.equal(code(() => normalizeCustomOptions('custom', null, active)), 'options_required')
    assert.equal(code(() => normalizeCustomOptions('watch', pick, active)), 'options_not_allowed')
    assert.deepEqual(normalizeCustomOptions('strap', {}, active), { options: null, snapshot: null, hash: '' })
  })
})

describe('checkout idempotency token and request (SC-6)', () => {
  test('tokens are 43-char base64url and unique', () => {
    const a = newCheckoutToken()
    assert.ok(isCheckoutToken(a))
    assert.notEqual(a, newCheckoutToken())
    assert.equal(isCheckoutToken('short'), false)
  })
  test('unique-violation detection names checkout_token, not other keys', () => {
    assert.equal(isCheckoutTokenConflict({ code: 'P2002', meta: { target: ['checkoutToken'] } }), true)
    assert.equal(isCheckoutTokenConflict({ code: 'P2002', meta: { driverAdapterError: { cause: { constraint: { index: 'orders_checkout_token_key' } } } } }), true)
    assert.equal(isCheckoutTokenConflict({ code: 'P2002', meta: { target: ['order_number'] } }), false)
    assert.equal(isCheckoutTokenConflict({ code: 'P2025' }), false)
  })
  test('client cannot send prices or totals; quantities are 1..10', () => {
    const address = { firstName: 'A', line1: 'Street 1', city: 'X', country: 'PK' }
    const body = { checkoutToken: newCheckoutToken(), email: ' A@Example.com ', billing: address, shipping: address, paymentMethod: 'bank_transfer', lines: [{ productId: '1', quantity: 1 }] }
    const ok = checkoutSchema.parse(body)
    assert.equal(ok.email, 'a@example.com')
    assert.equal(ok.lines[0].productId, 1n)
    assert.equal(checkoutSchema.safeParse({ ...body, total: '1.00' }).success, false)
    assert.equal(checkoutSchema.safeParse({ ...body, lines: [{ productId: '1', quantity: 1, price: '1.00' }] }).success, false)
    assert.equal(checkoutSchema.safeParse({ ...body, lines: [{ productId: '1', quantity: 11 }] }).success, false)
    assert.equal(checkoutSchema.safeParse({ ...body, paymentMethod: 'card' }).success, false)
  })
})
