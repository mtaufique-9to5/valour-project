import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toAdminRow, toInventoryRow, toOrderRow, toCustomerRow, toImageRow } from '../../src/server/catalog/mappers.js'

const watch = {
  id: 1, type: 'WATCH', slug: 'sunseeker-yellow', ref: 'LUC-01', name: 'Sunseeker Yellow', subtitle: 'Lucent Collection',
  status: 'ACTIVE', movement: 'automatic', collection: { id: 1, slug: 'lucent', name: 'Lucent Collection' },
  images: [
    { role: 'MAIN', position: 0, source: 'STATIC', url: '/m.jpeg', legacyRole: 'MAIN' },
    { role: 'GALLERY', position: 0, source: 'STATIC', url: '/images/watch-1.png', legacyRole: 'CARD' },
  ],
  prices: [{ currency: 'USD', amountMinor: 52500, confirmed: true }],
  inventory: { trackingMode: 'NOT_TRACKED', quantityOnHand: null },
  updatedAt: new Date('2026-10-01T00:00:00Z'),
}

test('toAdminRow', () => {
  assert.deepEqual(toAdminRow(watch), {
    id: 1, name: 'Sunseeker Yellow', ref: 'LUC-01', sku: 'LUC-01', subtitle: 'Lucent Collection', collection: 'lucent',
    category: { id: 1, name: 'Lucent Collection' }, movement: 'automatic', image: '/images/watch-1.png',
    price: 525, amountMinor: 52500, currency: 'USD', status: 'Active', statusCode: 'ACTIVE', slug: 'sunseeker-yellow',
    type: 'watch', typeCode: 'WATCH', trackingMode: 'NOT_TRACKED', quantity: null, updatedAt: '2026-10-01T00:00:00.000Z',
  })
})

test('toAdminRow: upload image url, tracked quantity, MAIN fallback', () => {
  const hex = 'c'.repeat(32)
  const row = toAdminRow({ ...watch, images: [{ role: 'MAIN', position: 0, source: 'UPLOAD', storageKey: `1/${hex}.webp` }], inventory: { trackingMode: 'TRACKED', quantityOnHand: 4 } })
  assert.equal(row.image, `/media/products/1/${hex}.webp`)
  assert.equal(row.quantity, 4)
  assert.deepEqual(toImageRow({ id: 9, source: 'UPLOAD', storageKey: `1/${hex}.webp`, role: 'MAIN', position: 0, isPrimary: true, width: 800, height: 600 }),
    { id: 9, url: `/media/products/1/${hex}.webp`, role: 'MAIN', position: 0, isPrimary: true, width: 800, height: 600 })
})

test('toAdminRow: legacy unpriced draft has null price; custom has null ref', () => {
  const custom = { id: 13, type: 'CUSTOM', slug: 'custom-watch', ref: null, name: 'Custom Watch', status: 'DRAFT', images: [], prices: [{ currency: 'USD', amountMinor: null, confirmed: false }] }
  const row = toAdminRow(custom)
  assert.equal(row.price, null)
  assert.equal(row.ref, null)
  assert.equal(row.image, null)
  assert.equal(row.type, 'custom')
  assert.equal(toAdminRow({ ...watch, prices: [{ currency: 'USD', amountMinor: 100, confirmed: false }] }).price, null)
  assert.equal(toAdminRow({ ...watch, prices: [] }).price, null)
})

test('toInventoryRow: untracked stays null, never 0', () => {
  const row = toInventoryRow({ ...watch, inventory: { quantityOnHand: null, reserved: 0, lowStockThreshold: null } })
  assert.deepEqual(
    { onHand: row.onHand, available: row.available, reserved: row.reserved, reorderPoint: row.reorderPoint, status: row.status },
    { onHand: null, available: null, reserved: 0, reorderPoint: null, status: 'Not tracked' })
  assert.equal(toInventoryRow({ ...watch, inventory: null }).status, 'Not tracked')
})

test('toInventoryRow: stock states', () => {
  const inv = (q, r, t) => toInventoryRow({ ...watch, inventory: { trackingMode: 'TRACKED', quantityOnHand: q, reserved: r, lowStockThreshold: t } })
  assert.equal(inv(10, 2, 3).status, 'In stock')
  assert.equal(inv(10, 2, 3).available, 8)
  assert.equal(inv(4, 1, 3).status, 'Low stock')
  assert.equal(inv(2, 2, null).status, 'Out of stock')
  assert.equal(inv(0, 0, null).status, 'Out of stock')
})

test('toOrderRow', () => {
  const row = toOrderRow({
    id: 7, number: 'VAL-000123', status: 'PAID', placedAt: new Date('2026-10-01T00:00:00Z'), totalMinor: 57000,
    customer: { name: null, email: 'a@example.com' }, items: [{ quantity: 1 }, { quantity: 2 }],
  })
  assert.deepEqual(row, { id: 'VAL-000123', dbId: 7, customer: 'a@example.com', email: 'a@example.com', date: '2026-10-01T00:00:00.000Z', status: 'Processing', payment: 'Paid', itemCount: 3, total: 570 })
  assert.equal(toOrderRow({ id: 1, number: 'VAL-000001', status: 'PENDING', placedAt: new Date(), totalMinor: 0, customer: null, items: [] }).customer, 'Guest')
})

test('toCustomerRow: spent counts paid/fulfilled only', () => {
  const row = toCustomerRow({
    id: 3, name: 'Ana', email: 'ana@example.com',
    orders: [
      { status: 'PAID', totalMinor: 52500, placedAt: new Date('2026-09-01T00:00:00Z') },
      { status: 'CANCELLED', totalMinor: 4500, placedAt: new Date('2026-10-01T00:00:00Z') },
      { status: 'FULFILLED', totalMinor: 4500, placedAt: new Date('2026-08-01T00:00:00Z') },
    ],
  })
  assert.deepEqual(row, { id: 3, name: 'Ana', email: 'ana@example.com', orders: 3, spent: 570, lastOrder: '2026-10-01T00:00:00.000Z', status: 'Active' })
})
