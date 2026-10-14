// Cart reducer, selector and storage tests. Uses only Node's built-in test runner:
//   node --test tests/
import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

import reducer, {
  MAX_LINE_QUANTITY,
  addItem,
  clearCart,
  decrementQuantity,
  getAddOutcome,
  hydrateCart,
  incrementQuantity,
  makeLineId,
  removeItem,
  selectCartCount,
  selectCartLines,
  selectHasPricedItems,
  selectHasUnpricedItems,
  selectSubtotal,
  setQuantity,
} from '../src/app/features/cart/cartSlice.js'
import { CART_STORAGE_KEY, loadCart, saveCart } from '../src/app/features/cart/cartStorage.js'
import {
  CONFIRMED_PRICES,
  DEFAULT_CUSTOM_OPTIONS,
  customWatch,
  customizerOptions,
  describeOptions,
  getCatalogItem,
  getLineLayers,
  getUnitPrice,
  validateOptions,
  watches,
} from '../src/data/catalog.js'
import { PRICE_ON_REQUEST, formatBadgeCount, formatPrice, getTotalLabels } from '../src/app/features/cart/cartFormat.js'

const [W1, W2] = watches.map((w) => w.id)
const CUSTOM = 'custom-watch'
const CONFIG_A = { caseId: 'black', dialId: 'mint', strapId: 'grey-grey' }
const CONFIG_B = { caseId: 'gold', dialId: 'light-blue', strapId: 'grey-teal' }

const run = (...actions) => actions.reduce((state, action) => reducer(state, action), reducer(undefined, { type: '@@init' }))
const root = (cart) => ({ cart })

describe('cart identity and quantities', () => {
  test('starts empty and not hydrated', () => {
    const state = run()
    assert.deepEqual(state.lines, [])
    assert.equal(state.hydrated, false)
  })

  test('adding the same product again merges into one line', () => {
    const state = run(addItem({ kind: 'watch', productId: W1 }), addItem({ kind: 'watch', productId: W1 }))
    assert.equal(state.lines.length, 1)
    assert.equal(state.lines[0].quantity, 2)
  })

  test('different products stay separate', () => {
    const state = run(addItem({ kind: 'watch', productId: W1 }), addItem({ kind: 'watch', productId: W2 }))
    assert.equal(state.lines.length, 2)
  })

  test('different options stay separate; identical options merge regardless of key order', () => {
    const state = run(
      addItem({ kind: 'custom', productId: CUSTOM, options: { caseId: 'black', dialId: 'mint', strapId: 'grey-grey' } }),
      addItem({ kind: 'custom', productId: CUSTOM, options: { caseId: 'silver', dialId: 'mint', strapId: 'grey-grey' } }),
      addItem({ kind: 'custom', productId: CUSTOM, options: { strapId: 'grey-grey', dialId: 'mint', caseId: 'black' } }),
      addItem({ kind: 'watch', productId: W1 }),
    )
    assert.equal(state.lines.length, 3)
    const black = state.lines.find((l) => l.lineId === makeLineId('custom', CUSTOM, { caseId: 'black', dialId: 'mint', strapId: 'grey-grey' }))
    assert.equal(black.quantity, 2)
  })

  test(`quantities are capped at ${MAX_LINE_QUANTITY}`, () => {
    const id = makeLineId('watch', W1)
    let state = run(addItem({ kind: 'watch', productId: W1, quantity: 8 }), addItem({ kind: 'watch', productId: W1, quantity: 5 }))
    assert.equal(state.lines[0].quantity, MAX_LINE_QUANTITY)
    state = reducer(state, incrementQuantity(id))
    assert.equal(state.lines[0].quantity, MAX_LINE_QUANTITY)
    state = reducer(state, setQuantity({ lineId: id, quantity: 15 }))
    assert.equal(state.lines[0].quantity, MAX_LINE_QUANTITY)
  })

  test('invalid quantities are ignored and decrement stops at 1', () => {
    const id = makeLineId('watch', W1)
    let state = run(addItem({ kind: 'watch', productId: W1, quantity: 3 }))
    for (const quantity of [0, -2, 2.5, '4', null]) {
      state = reducer(state, setQuantity({ lineId: id, quantity }))
    }
    assert.equal(state.lines[0].quantity, 3)
    state = run(addItem({ kind: 'watch', productId: W1 }), decrementQuantity(id))
    assert.equal(state.lines[0].quantity, 1)
    assert.equal(run(addItem({ kind: 'watch', productId: W1, quantity: 0 })).lines.length, 0)
  })

  test('remove affects only the target line; clear empties the cart', () => {
    let state = run(addItem({ kind: 'watch', productId: W1 }), addItem({ kind: 'watch', productId: W2, quantity: 3 }))
    state = reducer(state, removeItem(makeLineId('watch', W1)))
    assert.deepEqual(state.lines.map((l) => [l.productId, l.quantity]), [[W2, 3]])
    state = reducer(state, clearCart())
    assert.deepEqual(state.lines, [])
  })

  test('unknown products and kinds are rejected', () => {
    const state = run(
      addItem({ kind: 'watch', productId: 9999 }),
      addItem({ kind: 'watch', productId: String(W1) }),
      addItem({ kind: 'strap', productId: W1 }),
      addItem({ kind: 'constructor', productId: W1 }),
      addItem({ kind: 'watch', productId: W1, options: ['x'] }),
      addItem({ kind: 'watch', productId: W1, options: { nested: { a: 1 } } }),
    )
    assert.deepEqual(state.lines, [])
  })
})

describe('hydration', () => {
  test('keeps valid lines, drops invalid ones, merges duplicates, clamps, recomputes lineId', () => {
    const state = run(hydrateCart([
      { kind: 'watch', productId: W1, options: {}, quantity: 2, lineId: 'forged' },
      { kind: 'watch', productId: W1, quantity: 1 },
      { kind: 'watch', productId: W2, quantity: 50 },
      { kind: 'watch', productId: 9999, quantity: 1 },
      { kind: 'watch', productId: W2, quantity: 0 },
      null,
      'junk',
      { id: 1, name: 'Sunseeker Yellow', price: 499, quantity: 1 }, // legacy shape
    ]))
    assert.equal(state.hydrated, true)
    assert.deepEqual(
      state.lines.map((l) => [l.lineId, l.quantity]),
      [[makeLineId('watch', W1), 3], [makeLineId('watch', W2), MAX_LINE_QUANTITY]],
    )
  })

  test('non-array payloads give an empty, hydrated cart', () => {
    for (const payload of [null, undefined, {}, 'x', 42]) {
      const state = run(hydrateCart(payload))
      assert.deepEqual(state.lines, [])
      assert.equal(state.hydrated, true)
    }
  })
})

describe('pricing selectors', () => {
  afterEach(() => { CONFIRMED_PRICES.watch = {} })

  test('watches have no confirmed price: shown as unpriced, never 499 or 3200', () => {
    const state = root(run(addItem({ kind: 'watch', productId: W1, quantity: 2 })))
    const [line] = selectCartLines(state)
    assert.equal(line.unitPrice, null)
    assert.equal(line.lineTotal, null)
    assert.equal(selectSubtotal(state), 0)
    assert.equal(selectHasUnpricedItems(state), true)
    assert.equal(selectHasPricedItems(state), false)
    assert.equal(selectCartCount(state), 2)
  })

  test('prices stored with a line are ignored (tampering)', () => {
    const state = root(run(hydrateCart([{ kind: 'watch', productId: W1, quantity: 1, price: 1, unitPrice: 1, lineTotal: 1 }])))
    const [line] = selectCartLines(state)
    assert.equal(line.unitPrice, null)
    assert.equal(selectSubtotal(state), 0)
  })

  test('confirmed prices drive line totals and subtotal; unpriced lines are excluded', () => {
    CONFIRMED_PRICES.watch = { [W1]: 250 }
    const state = root(run(
      addItem({ kind: 'watch', productId: W1, quantity: 3 }),
      addItem({ kind: 'watch', productId: W2, quantity: 2 }),
    ))
    const lines = selectCartLines(state)
    assert.equal(lines[0].unitPrice, 250)
    assert.equal(lines[0].lineTotal, 750)
    assert.equal(lines[1].lineTotal, null)
    assert.equal(selectSubtotal(state), 750)
    assert.equal(selectHasUnpricedItems(state), true)
    assert.equal(selectHasPricedItems(state), true)
    assert.equal(selectCartCount(state), 5)
  })

  test('display fields come from the catalog', () => {
    const state = root(run(addItem({ kind: 'watch', productId: W1 })))
    const [line] = selectCartLines(state)
    assert.equal(line.name, watches[0].name)
    assert.equal(line.image, watches[0].image)
    assert.equal(line.slug, watches[0].slug)
  })
})

describe('display formatting', () => {
  test('formatPrice shows "Price on request" for unpriced items', () => {
    assert.equal(formatPrice(null), PRICE_ON_REQUEST)
    assert.equal(formatPrice(1250), '$1,250')
    assert.equal(formatPrice(0), '$0')
  })

  test('all unpriced: no number anywhere', () => {
    assert.deepEqual(getTotalLabels({ subtotal: 0, hasPricedItems: false, hasUnpricedItems: true }),
      { subtotal: PRICE_ON_REQUEST, total: PRICE_ON_REQUEST, excludesUnpriced: false })
  })

  test('mixed: subtotal is the priced sum (flagged), total stays "Price on request"', () => {
    assert.deepEqual(getTotalLabels({ subtotal: 750, hasPricedItems: true, hasUnpricedItems: true }),
      { subtotal: '$750', total: PRICE_ON_REQUEST, excludesUnpriced: true })
  })

  test('all priced: real subtotal and total', () => {
    assert.deepEqual(getTotalLabels({ subtotal: 1500, hasPricedItems: true, hasUnpricedItems: false }),
      { subtotal: '$1,500', total: '$1,500 USD', excludesUnpriced: false })
  })

  test('labels match the selectors end to end', () => {
    CONFIRMED_PRICES.watch = { [W1]: 250 }
    try {
      const state = root(run(addItem({ kind: 'watch', productId: W1, quantity: 2 }), addItem({ kind: 'watch', productId: W2 })))
      const labels = getTotalLabels({ subtotal: selectSubtotal(state), hasPricedItems: selectHasPricedItems(state), hasUnpricedItems: selectHasUnpricedItems(state) })
      assert.deepEqual(labels, { subtotal: '$500', total: PRICE_ON_REQUEST, excludesUnpriced: true })
    } finally {
      CONFIRMED_PRICES.watch = {}
    }
  })

  test('badge count caps at 99+', () => {
    assert.equal(formatBadgeCount(4), '4')
    assert.equal(formatBadgeCount(99), '99')
    assert.equal(formatBadgeCount(100), '99+')
  })
})

describe('storage', () => {
  let store
  beforeEach(() => {
    store = new Map()
    globalThis.localStorage = {
      writes: 0,
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem(k, v) { this.writes++; store.set(k, String(v)) },
      removeItem: (k) => store.delete(k),
    }
  })
  afterEach(() => { delete globalThis.localStorage })

  test('drops the legacy "cart" key and ignores its contents', () => {
    store.set('cart', JSON.stringify([{ id: 1, price: 499, quantity: 1 }]))
    assert.deepEqual(loadCart(), [])
    assert.equal(store.has('cart'), false)
  })

  test('bad JSON, wrong version or wrong shape load as empty', () => {
    for (const raw of ['{bad', JSON.stringify({ version: 2, lines: [] }), JSON.stringify({ version: 1, lines: 'x' }), 'null']) {
      store.set(CART_STORAGE_KEY, raw)
      assert.deepEqual(loadCart(), [])
    }
  })

  test('saves only references (no prices, no lineId) and round-trips', () => {
    const lines = run(addItem({ kind: 'custom', productId: CUSTOM, quantity: 2, options: CONFIG_A })).lines
    saveCart(lines)
    const saved = JSON.parse(store.get(CART_STORAGE_KEY))
    assert.deepEqual(saved, { version: 1, lines: [{ kind: 'custom', productId: CUSTOM, options: CONFIG_A, quantity: 2 }] })
    assert.deepEqual(run(hydrateCart(loadCart())).lines, lines)
  })

  test('identical saves do not rewrite storage', () => {
    const lines = run(addItem({ kind: 'watch', productId: W1 })).lines
    saveCart(lines)
    saveCart(lines)
    assert.equal(globalThis.localStorage.writes, 1)
  })

  test('storage that throws does not break load or save', () => {
    globalThis.localStorage = {
      getItem() { throw new Error('blocked') },
      setItem() { throw new Error('blocked') },
      removeItem() { throw new Error('blocked') },
    }
    assert.deepEqual(loadCart(), [])
    assert.doesNotThrow(() => saveCart([]))
  })
})

describe('Step 3: catalog options and custom watches', () => {
  test('custom watch is a catalog item named "Custom Watch" with no confirmed price', () => {
    assert.equal(getCatalogItem('custom', CUSTOM), customWatch)
    assert.equal(customWatch.name, 'Custom Watch')
    assert.equal(getUnitPrice('custom', CUSTOM), null)
  })

  test('option lists match the Customizer (3 cases, 10 dials, 13 straps) and defaults are valid', () => {
    assert.equal(customizerOptions.case.length, 3)
    assert.equal(customizerOptions.dial.length, 10)
    assert.equal(customizerOptions.strap.length, 13)
    for (const list of Object.values(customizerOptions)) {
      assert.equal(new Set(list.map((o) => o.id)).size, list.length, 'ids are unique')
      for (const o of list) assert.ok(o.id && o.name && o.image.startsWith('/images/customizer/'))
    }
    assert.deepEqual(DEFAULT_CUSTOM_OPTIONS, { caseId: 'black', dialId: 'black', strapId: 'black-black' })
    assert.equal(validateOptions('custom', CUSTOM, DEFAULT_CUSTOM_OPTIONS), true)
  })

  test('validateOptions: watches take no options; custom needs exactly caseId, dialId, strapId with known ids', () => {
    assert.equal(validateOptions('watch', W1, {}), true)
    assert.equal(validateOptions('watch', W1, { caseId: 'black' }), false)
    assert.equal(validateOptions('custom', CUSTOM, CONFIG_A), true)
    assert.equal(validateOptions('custom', CUSTOM, { caseId: 'black', dialId: 'mint' }), false, 'missing strap')
    assert.equal(validateOptions('custom', CUSTOM, { ...CONFIG_A, engraving: 'x' }), false, 'extra option')
    assert.equal(validateOptions('custom', CUSTOM, { ...CONFIG_A, caseId: 'platinum' }), false, 'unknown case')
    assert.equal(validateOptions('custom', CUSTOM, { ...CONFIG_A, dialId: 'grey-grey' }), false, 'strap id used as dial')
    for (const bad of [null, undefined, [], 'x', 3]) {
      assert.doesNotThrow(() => validateOptions('custom', CUSTOM, bad))
      assert.equal(validateOptions('custom', CUSTOM, bad), false)
    }
    assert.equal(validateOptions('strap', 1, {}), false, 'unsupported kind')
  })

  test('describeOptions and getLineLayers', () => {
    assert.deepEqual(describeOptions('custom', CONFIG_B), [
      { label: 'Case', value: 'Gold' }, { label: 'Dial', value: 'Light Blue' }, { label: 'Strap', value: 'Grey Teal' },
    ])
    assert.deepEqual(describeOptions('watch', {}), [])
    assert.deepEqual(getLineLayers('custom', CONFIG_B), [
      '/images/customizer/straps/strap_grey_Teal.png', '/images/customizer/case/case-dold.png', '/images/customizer/dial/diallightblue.png',
    ])
    assert.equal(getLineLayers('watch', {}), null)
  })

  test('cart rejects invalid custom configurations and watch options', () => {
    const state = run(
      addItem({ kind: 'custom', productId: CUSTOM, options: { caseId: 'black' } }),
      addItem({ kind: 'custom', productId: CUSTOM, options: { ...CONFIG_A, caseId: 'nope' } }),
      addItem({ kind: 'custom', productId: CUSTOM, options: { ...CONFIG_A, extra: 'x' } }),
      addItem({ kind: 'custom', productId: 'other', options: CONFIG_A }),
      addItem({ kind: 'watch', productId: W1, options: { caseId: 'black' } }),
    )
    assert.deepEqual(state.lines, [])
  })

  test('two configurations stay separate; the same configuration merges', () => {
    const state = run(
      addItem({ kind: 'custom', productId: CUSTOM, options: CONFIG_A }),
      addItem({ kind: 'custom', productId: CUSTOM, options: CONFIG_B }),
      addItem({ kind: 'custom', productId: CUSTOM, options: { ...CONFIG_A } }),
    )
    assert.deepEqual(state.lines.map((l) => l.quantity), [2, 1])
  })

  test('selectCartLines exposes name, option labels, layers and href', () => {
    const [watch, custom] = selectCartLines(root(run(
      addItem({ kind: 'watch', productId: W1 }),
      addItem({ kind: 'custom', productId: CUSTOM, options: CONFIG_A }),
    )))
    assert.equal(watch.href, `/our-shop/${watches[0].slug}`)
    assert.deepEqual(watch.optionLabels, [])
    assert.equal(watch.layers, null)
    assert.equal(custom.name, 'Custom Watch')
    assert.equal(custom.href, '/customizer')
    assert.deepEqual(custom.optionLabels.map((o) => o.value), ['Black', 'Mint', 'Grey'])
    assert.equal(custom.layers.length, 3)
    assert.equal(custom.unitPrice, null)
    assert.equal(custom.lineTotal, null)
  })

  test('stored custom lines survive hydration; invalid stored configs are dropped', () => {
    const state = run(hydrateCart([
      { kind: 'custom', productId: CUSTOM, options: CONFIG_A, quantity: 2 },
      { kind: 'custom', productId: CUSTOM, options: { caseId: 'black' }, quantity: 1 },
      { kind: 'watch', productId: W1, options: { caseId: 'black' }, quantity: 1 },
    ]))
    assert.deepEqual(state.lines.map((l) => [l.kind, l.quantity]), [['custom', 2]])
  })
})

describe('Step 3: getAddOutcome', () => {
  const linesWith = (qty) => run(addItem({ kind: 'watch', productId: W1, quantity: qty })).lines

  test('added for a new or below-limit line', () => {
    assert.deepEqual(getAddOutcome([], { kind: 'watch', productId: W1 }), { outcome: 'added', lineId: makeLineId('watch', W1) })
    assert.equal(getAddOutcome(linesWith(9), { kind: 'watch', productId: W1 }).outcome, 'added')
  })

  test('max when the line is already at the limit; capped when the add would exceed it', () => {
    assert.equal(getAddOutcome(linesWith(MAX_LINE_QUANTITY), { kind: 'watch', productId: W1 }).outcome, 'max')
    assert.equal(getAddOutcome(linesWith(8), { kind: 'watch', productId: W1, quantity: 5 }).outcome, 'capped')
  })

  test('invalid for unknown products, bad quantities and unsupported options', () => {
    for (const payload of [
      { kind: 'watch', productId: 999 },
      { kind: 'watch', productId: W1, quantity: 0 },
      { kind: 'watch', productId: W1, options: { caseId: 'black' } },
      { kind: 'custom', productId: CUSTOM, options: { caseId: 'black' } },
      { kind: 'strap', productId: 1 },
    ]) {
      assert.deepEqual(getAddOutcome([], payload), { outcome: 'invalid', lineId: null }, JSON.stringify(payload))
    }
  })

  test('outcome is per configuration', () => {
    const lines = run(addItem({ kind: 'custom', productId: CUSTOM, options: CONFIG_A, quantity: MAX_LINE_QUANTITY })).lines
    assert.equal(getAddOutcome(lines, { kind: 'custom', productId: CUSTOM, options: CONFIG_A }).outcome, 'max')
    assert.equal(getAddOutcome(lines, { kind: 'custom', productId: CUSTOM, options: CONFIG_B }).outcome, 'added')
  })
})
