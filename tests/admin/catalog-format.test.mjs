// Pure client validation helpers for the product admin.
// Run: node --test --conditions=react-server "tests/admin/*.test.mjs"
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  parsePrice, validateSku, normalizeSku, parseQuantity, validateProductValues, publishChecklist,
  validateImageFile, partitionImageFiles, IMAGE_MAX_BYTES, toProductInput, productToValues,
  buildProductsSearch, buildDetailUpdate, formatDollars,
} from '../../src/admin/client/catalog/format.js'

describe('parsePrice', () => {
  test('accepts and normalises', () => {
    assert.deepEqual(parsePrice('499.99'), { amount: '499.99', minor: 49999 })
    assert.equal(parsePrice('525.5').amount, '525.50')
    assert.equal(parsePrice('1,200').amount, '1200.00')
    assert.equal(parsePrice('9999999.99').minor, 999999999)
  })
  test('rejects empty, zero, negative, too many decimals, too large', () => {
    for (const v of ['', '  ', '0', '0.00', '-5', '1.234', '10000000', 'abc', null]) assert.ok(parsePrice(v).error, String(v))
  })
})

describe('SKU', () => {
  test('normalises and validates', () => {
    assert.equal(normalizeSku(' luc-01 '), 'LUC-01')
    assert.equal(validateSku('luc-01'), undefined)
    assert.ok(validateSku(''))
    assert.ok(validateSku('LUC_01'))
    assert.ok(validateSku('A'.repeat(33)))
    assert.equal(validateSku('A'.repeat(32)), undefined)
  })
})

test('parseQuantity', () => {
  assert.equal(parseQuantity('0'), 0)
  assert.equal(parseQuantity('12'), 12)
  for (const v of ['-1', '1.5', '', 'x', '1000001']) assert.equal(parseQuantity(v), null)
})

describe('product values', () => {
  const ok = { name: 'Nova', description: '', sku: 'NOVA-1', categoryId: '', type: 'WATCH', price: '499.99', currency: 'USD', trackingMode: 'TRACKED', quantity: '3', status: 'DRAFT' }
  test('valid new product has no errors', () => assert.deepEqual(validateProductValues(ok), {}))
  test('tracked quantity required on new, not on edit', () => {
    assert.ok(validateProductValues({ ...ok, quantity: '' }).quantity)
    assert.equal(validateProductValues({ ...ok, quantity: '' }, { isNew: false }).quantity, undefined)
    assert.equal(validateProductValues({ ...ok, trackingMode: 'NOT_TRACKED', quantity: '' }).quantity, undefined)
  })
  test('checklist needs a main image', () => {
    assert.equal(publishChecklist(ok, []).find((c) => c.key === 'image').ok, false)
    assert.ok(publishChecklist(ok, [{ role: 'MAIN' }]).every((c) => c.ok))
  })
  test('toProductInput matches the contract', () => {
    assert.deepEqual(toProductInput({ ...ok, sku: 'nova-1' }), { name: 'Nova', description: '', sku: 'NOVA-1', categoryId: null, type: 'WATCH', price: '499.99', currency: 'USD', trackingMode: 'TRACKED', quantity: 3, status: 'DRAFT' })
    assert.equal(toProductInput({ ...ok, trackingMode: 'NOT_TRACKED' }).quantity, null)
  })
  test('productToValues reads priceAmount/statusCode', () => {
    const v = productToValues({ name: 'X', priceAmount: '10.00', statusCode: 'ACTIVE', typeCode: 'STRAP', trackingMode: 'NOT_TRACKED' })
    assert.equal(v.price, '10.00'); assert.equal(v.status, 'ACTIVE'); assert.equal(v.type, 'STRAP')
  })
  test('buildDetailUpdate only sends changed detail fields', () => {
    assert.deepEqual(buildDetailUpdate({ ...ok, sku: 'nova-2' }, ['sku', 'status', 'price']), { sku: 'NOVA-2' })
  })
})

test('never shows "Price on request"', () => {
  assert.equal(formatDollars(null), 'No price set')
  assert.equal(formatDollars(499.99), '$499.99')
})

describe('image files', () => {
  const f = (name, type, size = 1000) => ({ name, type, size })
  test('type by MIME and extension', () => {
    assert.equal(validateImageFile(f('a.jpg', 'image/jpeg')), undefined)
    assert.equal(validateImageFile(f('a.WEBP', 'image/webp')), undefined)
    assert.ok(validateImageFile(f('a.png', 'image/jpeg')))
    assert.ok(validateImageFile(f('a.gif', 'image/gif')))
    assert.ok(validateImageFile(f('a.svg', 'image/svg+xml')))
  })
  test('size limits', () => {
    assert.ok(validateImageFile(f('a.png', 'image/png', IMAGE_MAX_BYTES + 1)))
    assert.ok(validateImageFile(f('a.png', 'image/png', 0)))
    assert.equal(validateImageFile(f('a.png', 'image/png', IMAGE_MAX_BYTES)), undefined)
  })
  test('gallery limit of 12', () => {
    const r = partitionImageFiles([f('a.png', 'image/png'), f('b.png', 'image/png'), f('c.txt', 'text/plain')], 11)
    assert.equal(r.accepted.length, 1); assert.equal(r.errors.length, 2)
  })
})

test('buildProductsSearch', () => {
  assert.equal(buildProductsSearch({ q: 'nova', type: 'WATCH', page: 3 }, { status: 'ACTIVE' }), '?q=nova&type=WATCH&status=ACTIVE')
  assert.equal(buildProductsSearch({ type: 'WATCH' }, { page: 2 }), '?type=WATCH&page=2')
  assert.equal(buildProductsSearch({ type: 'WATCH' }, { type: '' }), '')
})
