// Level-1 tests for the transactional commerce services against a fake
// transaction (tests/commerce/fake-tx.mjs). They check the guarded SQL, the
// lock order and the decisions; MariaDB itself is not involved.
// Run with: node --conditions=react-server --test tests/commerce
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { fakeTx } from './fake-tx.mjs'
import { applyDeductions, releaseOrderItem, setStock, lockProducts } from '../../src/server/commerce/services/stock.js'
import { consumeCoupon, releaseCouponForOrder } from '../../src/server/commerce/services/coupons.js'
import { placeOrder, findOrCreateCustomer } from '../../src/server/commerce/services/checkout.js'
import { changeOrderStatus } from '../../src/server/commerce/services/orders.js'
import { confirmManualPayment, recordRefund, paymentTotals } from '../../src/server/commerce/services/payments.js'
import { newCheckoutToken } from '../../src/server/commerce/checkout-token.js'

const ADMIN = { actorType: 'ADMIN', actorId: 'admin-1', actorLabel: 'admin@example.com' }
const rejects = (p, code) => assert.rejects(p, (e) => e.code === code)

describe('stock service', () => {
  test('deduction is a guarded UPDATE that must hit exactly one tracked row', async () => {
    const tx = fakeTx()
    await applyDeductions(tx, [{ productId: 7n, quantity: 2 }])
    const [u] = tx.raw(/UPDATE products/)
    assert.match(u.sql, /SET stock = stock - \?/)
    assert.match(u.sql, /track_stock = TRUE AND stock >= \?/)
    assert.deepEqual(u.values, [2, 7n, 2])
    await rejects(applyDeductions(fakeTx({ execute: () => 0 }), [{ productId: 7n, quantity: 2 }]), 'insufficient_stock')
  })
  test('release checks the expected released_quantity and restores stock only for tracked products', async () => {
    const tx = fakeTx()
    await releaseOrderItem(tx, { id: 5n, productId: 7n, quantity: 3, releasedQuantity: 1, stockDeducted: true }, { quantity: 2, kind: 'cancel' })
    const [item, product] = tx.raw(/^UPDATE/)
    assert.match(item.sql, /released_quantity = released_quantity \+ \?.*released_quantity = \? AND released_quantity \+ \? <= quantity/)
    assert.deepEqual(item.values, [2, 5n, 1, 2])
    assert.match(product.sql, /stock = stock \+ \?.*track_stock = TRUE/)
    assert.deepEqual(product.values, [2, 7n])
  })
  test('a concurrent release is detected; nothing is restored twice', async () => {
    const tx = fakeTx({ execute: () => 0 })
    await rejects(releaseOrderItem(tx, { id: 5n, productId: 7n, quantity: 3, releasedQuantity: 0, stockDeducted: true }, { quantity: 1, kind: 'cancel' }), 'release_conflict')
    assert.equal(tx.raw(/UPDATE products/).length, 0)
  })
  test('a line that never deducted stock gives none back', async () => {
    const tx = fakeTx()
    await releaseOrderItem(tx, { id: 5n, productId: 7n, quantity: 1, releasedQuantity: 0, stockDeducted: false }, { quantity: 1, kind: 'cancel' })
    assert.equal(tx.raw(/UPDATE products/).length, 0)
  })
  test('admin stock change is optimistic on the value the admin saw', async () => {
    await rejects(setStock(fakeTx({ execute: () => 0 }), 1n, { expected: 4, next: 9 }), 'stock_conflict')
  })
  test('products are locked in ascending id order, each once', async () => {
    const tx = fakeTx({ query: (sql, [id]) => [{ id, trackStock: 1, stock: 1n }] })
    await lockProducts(tx, [10n, '2', 10n, 3n])
    assert.deepEqual(tx.raw(/FOR UPDATE/).map((c) => c.values[0]), [2n, 3n, 10n])
  })
})

describe('coupon service', () => {
  test('consumption is a conditional UPDATE on status and usage limit', async () => {
    const tx = fakeTx()
    await consumeCoupon(tx, 3n)
    assert.match(tx.raw(/UPDATE coupons/)[0].sql, /used_count = used_count \+ 1.*status = TRUE AND \(usage_limit IS NULL OR used_count < usage_limit\)/)
    await rejects(consumeCoupon(fakeTx({ execute: () => 0 }), 3n), 'coupon_unavailable')
  })
  test('release marks the order first and gives the use back once', async () => {
    const order = { id: 9n, couponCode: 'SAVE', couponReleasedAt: null, status: 'cancelled', paymentStatus: 'pending' }
    const tx = fakeTx()
    assert.equal(await releaseCouponForOrder(tx, order), true)
    const [mark, give] = tx.raw(/^UPDATE/)
    assert.match(mark.sql, /UPDATE orders SET coupon_released_at.*coupon_released_at IS NULL/)
    assert.match(give.sql, /used_count = used_count - 1.*used_count > 0/)

    const again = fakeTx({ execute: () => 0 })
    assert.equal(await releaseCouponForOrder(again, order), false)
    assert.equal(again.raw(/UPDATE coupons/).length, 0)

    const paid = fakeTx()
    assert.equal(await releaseCouponForOrder(paid, { ...order, paymentStatus: 'paid' }), false)
    assert.equal(paid.calls.length, 0)
  })
})

// ---- checkout -------------------------------------------------------------

function checkoutWorld({ existingOrder = null, coupon = null, products = [], user = null, couponExecute = 1 } = {}) {
  const state = { orders: [], items: [], payments: [] }
  const tx = fakeTx({
    query: (sql, values) => {
      if (/FROM coupons/.test(sql)) return coupon && coupon.code === values[0] ? [coupon] : []
      if (/FROM products/.test(sql)) return products.filter((p) => p.id === values[0])
      return []
    },
    execute: (sql) => (/UPDATE coupons/.test(sql) ? couponExecute : 1),
    models: {
      order: {
        findUnique: () => existingOrder,
        create: ({ data }) => { state.orders.push(data); return { id: 41n } },
        update: ({ where, data }) => ({ id: where.id, ...state.orders[0], ...data }),
      },
      orderItem: { createMany: ({ data }) => { state.items.push(...data); return { count: data.length } } },
      payment: { create: ({ data }) => { state.payments.push(data); return { id: 1n } } },
      customizerOption: { findMany: () => [] },
      user: { findUnique: () => user, create: ({ data }) => ({ id: 77n, status: true, deletedAt: null, ...data }) },
      role: { findUnique: () => ({ id: 1n }) },
    },
  })
  return { tx, state }
}

const watch = { id: 1n, name: 'Sunseeker Yellow', sku: 'LUC-01', type: 'watch', status: 'active', deletedAt: null, trackStock: 1, stock: 5n, basePrice: '525.00', salePrice: null, mainImage: '/images/a.png' }
const strap = { id: 2n, name: 'Red Strap', sku: 'P-5', type: 'strap', status: 'active', deletedAt: null, trackStock: 0, stock: 0n, basePrice: '45.00', salePrice: null, mainImage: null }
const address = { firstName: 'Sam', lastName: null, phone: null, line1: 'Street 1', line2: null, city: 'Lahore', state: null, zip: null, country: 'PK' }
const input = (over = {}) => ({
  checkoutToken: newCheckoutToken(), email: 'sam@example.com', billing: address, shipping: address,
  shippingMethod: null, paymentMethod: 'bank_transfer', couponCode: null, notes: null,
  lines: [{ productId: 1n, quantity: 2 }, { productId: 2n, quantity: 1 }], ...over,
})
const SETTINGS = { currency: 'USD', allowCashOnDelivery: false, now: new Date('2026-10-21T12:00:00Z') }

describe('checkout service', () => {
  test('places one order: server prices, stock deducted for tracked lines, pending payment row', async () => {
    const { tx, state } = checkoutWorld({ products: [watch, strap] })
    const { order, replayed } = await placeOrder(tx, input(), SETTINGS)
    assert.equal(replayed, false)
    assert.equal(order.orderNumber, 'VAL-000041')
    const o = state.orders[0]
    assert.equal(o.subtotal, '1095.00')
    assert.equal(o.total, '1095.00')
    assert.equal(o.currency, 'USD')
    assert.deepEqual(state.items.map((i) => [i.sku, i.price, i.quantity, i.total, i.stockDeducted]), [['LUC-01', '525.00', 2, '1050.00', true], ['P-5', '45.00', 1, '45.00', false]])
    assert.deepEqual(state.payments, [{ orderId: 41n, paymentMethod: 'bank_transfer', amount: '1095.00', status: 'pending' }])
    assert.equal(tx.raw(/UPDATE products SET stock = stock -/).length, 1)
  })
  test('a repeated checkout token returns the existing order and writes nothing', async () => {
    const existing = { id: 41n, orderNumber: 'VAL-000041' }
    const { tx, state } = checkoutWorld({ existingOrder: existing, products: [watch] })
    const r = await placeOrder(tx, input(), SETTINGS)
    assert.deepEqual(r, { order: existing, replayed: true })
    assert.equal(state.orders.length, 0)
    assert.equal(tx.raw(/^UPDATE/).length, 0)
  })
  test('a lost race on checkout_token returns the winner’s order', async () => {
    const winner = { id: 50n, orderNumber: 'VAL-000050' }
    let lookups = 0
    const db = {
      $transaction: async () => { const e = new Error('dup'); e.code = 'P2002'; e.meta = { target: ['checkoutToken'] }; throw e },
      order: { findUnique: async () => { lookups++; return winner } },
    }
    assert.deepEqual(await placeOrder(db, input(), SETTINGS), { order: winner, replayed: true })
    assert.equal(lookups, 1)
  })
  test('coupon: validated, discount applied to the order (not the lines), use consumed in the same transaction', async () => {
    const coupon = { id: 3n, code: 'SAVE10', type: 'percentage', value: '10.00', minOrderAmount: '0.00', maxDiscount: null, usageLimit: 10, usedCount: 2, startsAt: null, expiresAt: null, status: 1 }
    const { tx, state } = checkoutWorld({ products: [watch, strap], coupon })
    await placeOrder(tx, input({ couponCode: ' save10 ' }), SETTINGS)
    assert.equal(state.orders[0].discount, '109.50')
    assert.equal(state.orders[0].total, '985.50')
    assert.equal(state.orders[0].couponCode, 'SAVE10')
    assert.ok(state.items.every((i) => i.discount === '0.00'))
    assert.equal(tx.raw(/UPDATE coupons SET used_count = used_count \+ 1/).length, 1)
  })
  test('unknown, expired or exhausted coupons fail the checkout before any write', async () => {
    const { tx } = checkoutWorld({ products: [watch] })
    await rejects(placeOrder(tx, input({ couponCode: 'NOPE' }), SETTINGS), 'coupon_invalid')
    const expired = { id: 3n, code: 'OLD', type: 'fixed', value: '5.00', minOrderAmount: '0.00', maxDiscount: null, usageLimit: null, usedCount: 0, startsAt: null, expiresAt: new Date('2026-01-01'), status: 1 }
    const w = checkoutWorld({ products: [watch], coupon: expired })
    await rejects(placeOrder(w.tx, input({ couponCode: 'OLD', lines: [{ productId: 1n, quantity: 1 }] }), SETTINGS), 'coupon_expired')
    assert.equal(w.tx.raw(/^UPDATE/).length, 0)
    const race = checkoutWorld({ products: [watch], coupon: { ...expired, expiresAt: null }, couponExecute: 0 })
    await rejects(placeOrder(race.tx, input({ couponCode: 'OLD', lines: [{ productId: 1n, quantity: 1 }] }), SETTINGS), 'coupon_unavailable')
  })
  test('insufficient stock and inactive products are refused; nothing is written', async () => {
    const low = checkoutWorld({ products: [{ ...watch, stock: 1n }] })
    await rejects(placeOrder(low.tx, input({ lines: [{ productId: 1n, quantity: 2 }] }), SETTINGS), 'insufficient_stock')
    assert.equal(low.state.orders.length, 0)
    const draft = checkoutWorld({ products: [{ ...watch, status: 'draft' }] })
    await rejects(placeOrder(draft.tx, input({ lines: [{ productId: 1n, quantity: 1 }] }), SETTINGS), 'product_unavailable')
  })
  test('settings gate: currency must be configured; cash on delivery only when enabled', async () => {
    const { tx } = checkoutWorld({ products: [watch] })
    await rejects(placeOrder(tx, input(), { ...SETTINGS, currency: undefined }), 'currency_not_configured')
    await rejects(placeOrder(tx, input({ paymentMethod: 'cash_on_delivery' }), SETTINGS), 'payment_method_disabled')
  })
  test('guest records: existing customers are reused untouched; inactive customers cannot order', async () => {
    const existing = fakeTx({ models: { user: { findUnique: () => ({ id: 5n, status: true, deletedAt: null }) } } })
    assert.equal(await findOrCreateCustomer(existing, { email: 'a@b.c', firstName: 'New Name' }), 5n)
    assert.equal(existing.calls.filter((c) => c.method === 'update' || c.method === 'create').length, 0)
    const inactive = fakeTx({ models: { user: { findUnique: () => ({ id: 5n, status: false, deletedAt: null }) } } })
    await rejects(findOrCreateCustomer(inactive, { email: 'a@b.c', firstName: 'X' }), 'customer_inactive')
    const fresh = fakeTx({ models: { user: { findUnique: () => null, create: ({ data }) => ({ id: 6n, status: true, deletedAt: null, ...data }) }, role: { findUnique: () => ({ id: 1n }) } } })
    assert.equal(await findOrCreateCustomer(fresh, { email: 'n@b.c', firstName: 'N' }), 6n)
    assert.equal(fresh.calls.find((c) => c.method === 'create').args.data.password, null)
  })
})

// ---- order status & payments ---------------------------------------------

function orderWorld(order, { items = [], payments = [], execute = () => 1 } = {}) {
  return fakeTx({
    query: (sql) => {
      if (/FROM orders/.test(sql)) return [order]
      if (/SELECT DISTINCT product_id/.test(sql)) return [...new Set(items.map((i) => i.productId))].filter(Boolean).map((productId) => ({ productId }))
      if (/FROM products/.test(sql)) return [{ id: 1n, trackStock: 1, stock: 0n }]
      if (/FROM order_items/.test(sql)) return items
      return []
    },
    execute,
    models: {
      order: { updateMany: () => ({ count: 1 }) },
      payment: { updateMany: () => ({ count: 1 }), findMany: () => payments, create: ({ data }) => ({ id: 2n, ...data }) },
    },
  })
}

describe('order service', () => {
  test('cancelling releases every remaining unit and the coupon, in lock order, and audits it', async () => {
    const order = { id: 9n, status: 'processing', paymentStatus: 'pending', paymentMethod: 'bank_transfer', couponCode: 'SAVE', couponReleasedAt: null }
    const items = [{ id: 1n, productId: 1n, quantity: 2n, releasedQuantity: 0n, stockDeducted: 1 }, { id: 2n, productId: null, quantity: 1n, releasedQuantity: 1n, stockDeducted: 0 }]
    const tx = orderWorld(order, { items })
    const r = await changeOrderStatus(tx, 9n, 'cancelled', ADMIN)
    assert.equal(r.couponReleased, true)
    assert.deepEqual(r.released, [{ itemId: '1', quantity: 2, restored: 2 }])
    const order_ = tx.calls.findIndex((c) => /FROM orders .*FOR UPDATE/.test(c.sql ?? ''))
    const coupon = tx.calls.findIndex((c) => /UPDATE coupons/.test(c.sql ?? ''))
    const product = tx.calls.findIndex((c) => /FROM products .*FOR UPDATE/.test(c.sql ?? ''))
    const items_ = tx.calls.findIndex((c) => /FROM order_items .*FOR UPDATE/.test(c.sql ?? ''))
    assert.ok(order_ < coupon && coupon < product && product < items_, 'lock order: order -> coupon -> products -> items')
    assert.equal(tx.audits()[0].action, 'order.cancel')
  })
  test('payment status is not touched by fulfilment changes', async () => {
    const tx = orderWorld({ id: 9n, status: 'pending', paymentStatus: 'pending', paymentMethod: 'bank_transfer' })
    await changeOrderStatus(tx, 9n, 'confirmed', ADMIN)
    assert.ok(tx.raw(/UPDATE orders/).every((c) => !/payment_status =/.test(c.sql.split('WHERE')[0])))
  })
  test('invalid transitions and concurrent changes are refused', async () => {
    await rejects(changeOrderStatus(orderWorld({ id: 9n, status: 'processing', paymentStatus: 'pending', paymentMethod: 'bank_transfer' }), 9n, 'shipped', ADMIN), 'payment_required')
    await rejects(changeOrderStatus(orderWorld({ id: 9n, status: 'pending', paymentStatus: 'pending' }, { execute: () => 0 }), 9n, 'confirmed', ADMIN), 'order_conflict')
  })
})

describe('payment service', () => {
  test('confirming a bank transfer updates only a pending payment and the order payment status', async () => {
    const tx = orderWorld({ id: 9n, status: 'pending', paymentStatus: 'pending', paymentMethod: 'bank_transfer' })
    await confirmManualPayment(tx, { orderId: 9n, paymentId: 4n, transactionId: ' BANK-123 ', actor: ADMIN })
    const pay = tx.calls.find((c) => c.model === 'payment' && c.method === 'updateMany')
    assert.deepEqual(pay.args.where, { id: 4n, orderId: 9n, status: 'pending' })
    assert.equal(pay.args.data.transactionId, 'BANK-123')
    const ord = tx.calls.find((c) => c.model === 'order' && c.method === 'updateMany')
    assert.deepEqual(ord.args.where, { id: 9n, paymentStatus: 'pending' })
    assert.equal(ord.args.data.status, undefined, 'fulfilment status untouched')
  })
  test('a reused bank reference and a cancelled order are refused', async () => {
    const dup = orderWorld({ id: 9n, status: 'pending', paymentStatus: 'pending' })
    dup.payment.updateMany = async () => { const e = new Error('dup'); e.code = 'P2002'; throw e }
    await rejects(confirmManualPayment(dup, { orderId: 9n, paymentId: 4n, transactionId: 'X', actor: ADMIN }), 'duplicate_reference')
    await rejects(confirmManualPayment(orderWorld({ id: 9n, status: 'cancelled', paymentStatus: 'pending' }), { orderId: 9n, paymentId: 4n, transactionId: 'X', actor: ADMIN }), 'order_cancelled')
    await rejects(confirmManualPayment(orderWorld({ id: 9n, status: 'pending', paymentStatus: 'pending' }), { orderId: 9n, paymentId: 4n, transactionId: '  ', actor: ADMIN }), 'invalid_reference')
  })
  test('refunds: partial keeps paid, full becomes refunded, over-refund refused, fulfilment untouched', async () => {
    const order = { id: 9n, status: 'delivered', paymentStatus: 'paid', paymentMethod: 'bank_transfer' }
    const payments = [{ status: 'paid', amount: '100.00' }, { status: 'refunded', amount: '30.00' }]
    assert.deepEqual(paymentTotals(payments), { paidMinor: 10000, refundedMinor: 3000 })

    const partial = orderWorld(order, { payments })
    assert.equal((await recordRefund(partial, { orderId: 9n, amountMinor: 2000, actor: ADMIN })).paymentStatus, 'paid')
    assert.equal(partial.calls.filter((c) => c.model === 'order').length, 0)

    const full = orderWorld(order, { payments })
    assert.equal((await recordRefund(full, { orderId: 9n, amountMinor: 7000, actor: ADMIN })).paymentStatus, 'refunded')
    assert.deepEqual(full.calls.find((c) => c.model === 'order').args.data, { paymentStatus: 'refunded' })

    await rejects(recordRefund(orderWorld(order, { payments }), { orderId: 9n, amountMinor: 7001, actor: ADMIN }), 'refund_exceeds_paid')
    await rejects(recordRefund(orderWorld({ ...order, paymentStatus: 'pending' }, { payments }), { orderId: 9n, amountMinor: 1, actor: ADMIN }), 'not_paid')
  })
})
