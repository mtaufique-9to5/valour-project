import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canTransition, activationProblems, statusChangeError, typeChangeError, priceError, slugFor } from '../../src/server/catalog/product-rules.js'

const ready = { name: 'Nova', ref: 'LUC-07', price: { amountMinor: 49999, confirmed: true, currency: 'USD' }, images: [{ role: 'MAIN', isPrimary: true }] }

test('status transitions', () => {
  assert.equal(canTransition('DRAFT', 'ACTIVE'), true)
  assert.equal(canTransition('ACTIVE', 'DRAFT'), true)
  assert.equal(canTransition('ACTIVE', 'ARCHIVED'), true)
  assert.equal(canTransition('ARCHIVED', 'DRAFT'), true)
  assert.equal(canTransition('ARCHIVED', 'ACTIVE'), false)
  assert.equal(canTransition('DRAFT', 'DELETED'), false)
  assert.match(statusChangeError('ARCHIVED', 'ACTIVE', ready), /Draft/)
})

test('ACTIVE requires name, SKU, price > 0 and a main image', () => {
  assert.deepEqual(activationProblems(ready), [])
  assert.equal(statusChangeError('DRAFT', 'ACTIVE', ready), null)
  assert.equal(activationProblems({ ...ready, price: null }).length, 1)
  assert.equal(activationProblems({ ...ready, price: { amountMinor: null, confirmed: false } }).length, 1) // legacy custom watch
  assert.equal(activationProblems({ ...ready, price: { amountMinor: 0, confirmed: true } }).length, 1)
  assert.equal(activationProblems({ ...ready, price: { amountMinor: -5, confirmed: true } }).length, 1)
  assert.equal(activationProblems({ ...ready, images: [{ role: 'GALLERY', isPrimary: false }] }).length, 1)
  assert.equal(activationProblems({ ...ready, ref: null }).length, 1)
  assert.equal(activationProblems({ ...ready, name: '  ' }).length, 1)
  assert.match(statusChangeError('DRAFT', 'ACTIVE', { ...ready, price: null, images: [] }), /price.*main image/)
  assert.equal(statusChangeError('DRAFT', 'ARCHIVED', { ...ready, price: null }), null) // archiving needs no price
})

test('type changes only while DRAFT, never CUSTOM', () => {
  assert.equal(typeChangeError('WATCH', 'DRAFT', 'STRAP'), null)
  assert.equal(typeChangeError('WATCH', 'ACTIVE', 'WATCH'), null)
  assert.notEqual(typeChangeError('WATCH', 'ACTIVE', 'STRAP'), null)
  assert.notEqual(typeChangeError('CUSTOM', 'DRAFT', 'WATCH'), null)
  assert.notEqual(typeChangeError('WATCH', 'DRAFT', 'CUSTOM'), null)
})

test('price rule and slug', () => {
  assert.equal(priceError(1), null)
  for (const v of [0, -1, null, 1.5]) assert.notEqual(priceError(v), null)
  assert.equal(slugFor('Sunseeker Yéllow!', 'LUC-07'), 'sunseeker-yellow-luc-07')
  const long = slugFor('x'.repeat(300), 'ABC-123')
  assert.ok(long.length <= 120 && long.endsWith('-abc-123'))
})
