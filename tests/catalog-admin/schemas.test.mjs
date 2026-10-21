import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  priceUpdateSchema, productCreateSchema, productUpdateSchema, inventoryAdjustSchema, productIdSchema,
  trackingSchema, listQuerySchema, skuSchema, fieldErrorsOf,
} from '../../src/server/catalog/schemas.js'
import { ACTION_ALLOWLIST } from '../../src/server/audit/audit.js'
import { CATALOG_AUDIT_ACTIONS } from '../../src/server/catalog/audit-allowlist.js'

const base = { name: 'Nova Red', sku: 'luc-07', type: 'WATCH', price: '499.99', trackingMode: 'NOT_TRACKED' }

test('price: decimal string -> minor units; no null (no Price on request)', () => {
  assert.deepEqual(priceUpdateSchema.parse({ amount: '499.99', reason: 'new' }), { amountMinor: 49999, reason: 'new' })
  assert.deepEqual(priceUpdateSchema.parse({ amount: '525', reason: 'x', currency: 'USD' }), { amountMinor: 52500, reason: 'x' })
  assert.equal(priceUpdateSchema.parse({ amount: '0.01', reason: 'x' }).amountMinor, 1)
})

test('price: rejects null, zero, negative, numbers, bad decimals, other currency', () => {
  for (const input of [
    { amount: null, reason: 'x' }, { amount: '0', reason: 'x' }, { amount: '0.00', reason: 'x' },
    { amount: '-1', reason: 'x' }, { amount: 525, reason: 'x' }, { amount: '1.001', reason: 'x' }, { amount: 'abc', reason: 'x' },
    { amount: '5', reason: '' }, { amount: '5' }, { amount: '5', reason: 'x', currency: 'EUR' }, { amount: '5', reason: 'x', extra: 1 },
  ]) assert.equal(priceUpdateSchema.safeParse(input).success, false, JSON.stringify(input))
})

test('sku: uppercased, A-Z0-9-, max 32', () => {
  assert.equal(skuSchema.parse(' luc-07 '), 'LUC-07')
  for (const v of ['', 'LUC 07', 'LUC_07', 'X'.repeat(33), 'ÄBC']) assert.equal(skuSchema.safeParse(v).success, false, v)
  assert.equal(skuSchema.parse('X'.repeat(32)).length, 32)
})

test('create: valid input -> DRAFT payload with minor units', () => {
  assert.deepEqual(productCreateSchema.parse(base), {
    name: 'Nova Red', description: null, sku: 'LUC-07', categoryId: null, type: 'WATCH',
    currency: 'USD', trackingMode: 'NOT_TRACKED', quantity: null, amountMinor: 49999,
  })
  const tracked = productCreateSchema.parse({ ...base, trackingMode: 'TRACKED', quantity: 0, categoryId: '3', description: ' Steel ' })
  assert.deepEqual([tracked.quantity, tracked.categoryId, tracked.description], [0, 3, 'Steel'])
})

test('create: rules', () => {
  const bad = (patch) => assert.equal(productCreateSchema.safeParse({ ...base, ...patch }).success, false, JSON.stringify(patch))
  bad({ type: 'CUSTOM' })
  bad({ price: undefined })
  bad({ price: null })
  bad({ price: '0' })
  bad({ price: '-10' })
  bad({ status: 'ACTIVE' })
  bad({ trackingMode: 'TRACKED' }) // quantity required
  bad({ trackingMode: 'TRACKED', quantity: -1 })
  bad({ trackingMode: 'TRACKED', quantity: 1.5 })
  bad({ trackingMode: 'NOT_TRACKED', quantity: 4 })
  bad({ currency: 'EUR' })
  bad({ name: '' })
  bad({ slug: 'x' })
  assert.equal(productCreateSchema.safeParse({ ...base, status: 'DRAFT' }).success, true)
})

test('create: fieldErrors name the failing fields', () => {
  const r = productCreateSchema.safeParse({ ...base, sku: 'bad sku', price: '0', trackingMode: 'TRACKED' })
  const fe = fieldErrorsOf(r.error)
  assert.ok(fe.sku && fe.price && fe.quantity, JSON.stringify(fe))
})

test('update: partial, strict, trims, empty -> null; price -> amountMinor', () => {
  assert.deepEqual(productUpdateSchema.parse({ name: '  Nova Red ', subtitle: '' }), { name: 'Nova Red', subtitle: null })
  assert.deepEqual(productUpdateSchema.parse({ price: '12.50' }), { amountMinor: 1250 })
  assert.deepEqual(productUpdateSchema.parse({ status: 'ACTIVE' }), { status: 'ACTIVE' })
  assert.equal(productUpdateSchema.safeParse({}).success, false)
  assert.equal(productUpdateSchema.safeParse({ slug: 'x' }).success, false)
  assert.equal(productUpdateSchema.safeParse({ status: 'DELETED' }).success, false)
  assert.equal(productUpdateSchema.safeParse({ name: '' }).success, false)
  assert.equal(productUpdateSchema.safeParse({ price: null }).success, false)
  assert.equal(productUpdateSchema.safeParse({ type: 'CUSTOM' }).success, false)
  assert.equal(productUpdateSchema.safeParse({ quantity: 5 }).success, false) // needs trackingMode
  assert.equal(productUpdateSchema.safeParse({ trackingMode: 'TRACKED', quantity: 5 }).success, true)
})

test('tracking mode', () => {
  assert.equal(trackingSchema.safeParse({ trackingMode: 'TRACKED', quantity: 0 }).success, true)
  assert.equal(trackingSchema.safeParse({ trackingMode: 'TRACKED' }).success, false)
  assert.equal(trackingSchema.safeParse({ trackingMode: 'NOT_TRACKED' }).success, true)
  assert.equal(trackingSchema.safeParse({ trackingMode: 'NOT_TRACKED', quantity: 2 }).success, false)
  assert.equal(trackingSchema.safeParse({ trackingMode: 'SOMETIMES' }).success, false)
})

test('inventory: exactly one of delta / setQuantity', () => {
  assert.equal(inventoryAdjustSchema.safeParse({ delta: 5, reason: 'RESTOCK' }).success, true)
  assert.equal(inventoryAdjustSchema.safeParse({ setQuantity: 0, reason: 'INITIAL_COUNT', note: 'count' }).success, true)
  assert.equal(inventoryAdjustSchema.safeParse({ delta: 0, reason: 'RESTOCK' }).success, false)
  assert.equal(inventoryAdjustSchema.safeParse({ delta: 1, setQuantity: 1, reason: 'RESTOCK' }).success, false)
  assert.equal(inventoryAdjustSchema.safeParse({ reason: 'RESTOCK' }).success, false)
  assert.equal(inventoryAdjustSchema.safeParse({ setQuantity: -1, reason: 'CORRECTION' }).success, false)
  assert.equal(inventoryAdjustSchema.safeParse({ delta: 1.5, reason: 'RESTOCK' }).success, false)
  assert.equal(inventoryAdjustSchema.safeParse({ delta: 1, reason: 'THEFT' }).success, false)
})

test('list query: defaults, caps, case-insensitive enums', () => {
  assert.deepEqual(listQuerySchema.parse({}), { page: 1, pageSize: 20, sort: 'position' })
  const q = listQuerySchema.parse({ q: ' nova ', type: 'watch', status: 'active', page: '2', pageSize: '500', sort: '-name' })
  assert.deepEqual(q, { q: 'nova', type: 'WATCH', status: 'ACTIVE', page: 2, pageSize: 20, sort: '-name' })
  assert.equal(listQuerySchema.parse({ pageSize: 50 }).pageSize, 50)
  assert.equal(listQuerySchema.parse({ type: 'bogus', sort: 'drop table' }).type, undefined)
  assert.equal(listQuerySchema.parse(null).page, 1)
})

test('product id', () => {
  assert.equal(productIdSchema.parse('3'), 3)
  assert.equal(productIdSchema.safeParse(0).success, false)
  assert.equal(productIdSchema.safeParse('abc').success, false)
})

test('every catalog audit action is allowlisted', () => {
  for (const a of CATALOG_AUDIT_ACTIONS) assert.ok(Object.hasOwn(ACTION_ALLOWLIST, a), a)
})
