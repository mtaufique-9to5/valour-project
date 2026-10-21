import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseAmountToMinor, parsePositiveAmountToMinor, isPositiveAmountString, formatMinor, minorToDollars, minorToAmountString, isAmountString, MAX_AMOUNT_MINOR } from '../../src/server/catalog/money.js'

test('parseAmountToMinor: exact cents', () => {
  assert.equal(parseAmountToMinor('525.00'), 52500)
  assert.equal(parseAmountToMinor('525'), 52500)
  assert.equal(parseAmountToMinor('45.5'), 4550)
  assert.equal(parseAmountToMinor(' 0.07 '), 7)
  assert.equal(parseAmountToMinor('0'), 0)
  assert.equal(parseAmountToMinor('9999999.99'), MAX_AMOUNT_MINOR)
  assert.equal(parseAmountToMinor('19.99'), 1999) // no float drift
})

test('parseAmountToMinor: rejects bad input', () => {
  for (const v of ['-1', '-0.01', '1.234', 'abc', '', '1e3', '1,000', '10000000', '.5', null, 525]) {
    assert.throws(() => parseAmountToMinor(v), RangeError, String(v))
  }
  assert.equal(isAmountString('-5'), false)
})

test('parsePositiveAmountToMinor: > 0 only', () => {
  assert.equal(parsePositiveAmountToMinor('499.99'), 49999)
  assert.equal(parsePositiveAmountToMinor('0.01'), 1)
  for (const v of ['0', '0.00', '-1', 'x', null]) assert.throws(() => parsePositiveAmountToMinor(v), RangeError, String(v))
  assert.equal(isPositiveAmountString('0'), false)
  assert.equal(isPositiveAmountString('1.5'), true)
})

test('format helpers: null is "No price set", never 0', () => {
  assert.equal(formatMinor(52500), '$525.00')
  assert.equal(formatMinor(null), 'No price set')
  assert.equal(formatMinor(undefined), 'No price set')
  assert.equal(minorToDollars(4500), 45)
  assert.equal(minorToDollars(null), null)
  assert.equal(minorToAmountString(52500), '525.00')
  assert.equal(minorToAmountString(7), '0.07')
  assert.equal(minorToAmountString(null), '')
})
