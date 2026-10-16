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
  getRelatedStraps,
  getStrapBySlug,
  getUnitPrice,
  validateOptions,
  straps,
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
      addItem({ kind: 'bracelet', productId: W1 }),
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
    assert.equal(formatPrice(1250), '$1,250.00')
    assert.equal(formatPrice(0), '$0.00')
  })

  test('all unpriced: no number anywhere', () => {
    assert.deepEqual(getTotalLabels({ subtotal: 0, hasPricedItems: false, hasUnpricedItems: true }),
      { subtotal: PRICE_ON_REQUEST, total: PRICE_ON_REQUEST, excludesUnpriced: false })
  })

  test('mixed: subtotal is the priced sum (flagged), total stays "Price on request"', () => {
    assert.deepEqual(getTotalLabels({ subtotal: 750, hasPricedItems: true, hasUnpricedItems: true }),
      { subtotal: '$750.00', total: PRICE_ON_REQUEST, excludesUnpriced: true })
  })

  test('all priced: real subtotal and total', () => {
    assert.deepEqual(getTotalLabels({ subtotal: 1500, hasPricedItems: true, hasUnpricedItems: false }),
      { subtotal: '$1,500.00', total: '$1,500.00 USD', excludesUnpriced: false })
  })

  test('labels match the selectors end to end', () => {
    CONFIRMED_PRICES.watch = { [W1]: 250 }
    try {
      const state = root(run(addItem({ kind: 'watch', productId: W1, quantity: 2 }), addItem({ kind: 'watch', productId: W2 })))
      const labels = getTotalLabels({ subtotal: selectSubtotal(state), hasPricedItems: selectHasPricedItems(state), hasUnpricedItems: selectHasUnpricedItems(state) })
      assert.deepEqual(labels, { subtotal: '$500.00', total: PRICE_ON_REQUEST, excludesUnpriced: true })
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
    assert.equal(validateOptions('bracelet', 1, {}), false, 'unsupported kind')
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
    assert.equal(watch.href, `/our-shop/${watches[0].slug}/`)
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
      { kind: 'bracelet', productId: 1 },
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

// ─── Audit Step 1 fixes ─────────────────────────────────────────────────────

import { configureStore } from '@reduxjs/toolkit'
import { createClickGuard } from '../src/app/features/cart/clickGuard.js'
import { isUnrecognizedLine, isWellFormedLine } from '../src/app/features/cart/cartSlice.js'
import { setPreservedLines } from '../src/app/features/cart/cartStorage.js'
import { createCartPersistence } from '../src/app/features/cart/cartPersistence.js'
import sidebarReducer, { clearCartNotice, showCartNotice, toggleCartSidebar } from '../src/app/features/cart/cSidebarSlice.js'

describe('F-15: click guard (a rapid burst adds once; a later click adds again)', () => {
  const accepted = (times, lineIds = times.map(() => 'a')) => {
    const guard = createClickGuard(400)
    return times.filter((t, i) => !guard.isRepeat(lineIds[i], t)).length
  }

  test('a burst where every gap is under 400 ms counts once', () => {
    assert.equal(accepted([0, 200, 400, 600, 800]), 1)
    assert.equal(accepted([0, 100, 150, 399]), 1)
  })

  test('ignored clicks restart the window', () => {
    // Before the fix, 0 / 200 / 400 added twice (400 was 400 ms after the first accepted click).
    assert.equal(accepted([0, 200, 400]), 1)
  })

  test('a click 400 ms or more after the previous one starts a new burst', () => {
    assert.equal(accepted([0, 450]), 2)
    assert.equal(accepted([0, 200, 600]), 2)
    assert.equal(accepted([0, 400, 800]), 3)
  })

  test('different lines never block each other', () => {
    assert.equal(accepted([0, 100, 150], ['a', 'b', 'a']), 3)
  })
})

describe('F-14: lines from other tabs are never deleted', () => {
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
  afterEach(() => { delete globalThis.localStorage; setPreservedLines([]) })

  const makeStore = () => configureStore({
    reducer: { cart: reducer },
    middleware: (getDefault) => getDefault().prepend(createCartPersistence()),
  })
  const savedLines = () => JSON.parse(store.get(CART_STORAGE_KEY)).lines
  const UNKNOWN = { kind: 'watch', productId: 77, options: {}, quantity: 2 }

  test('isWellFormedLine / isUnrecognizedLine separate unknown-but-valid from corrupt', () => {
    assert.equal(isWellFormedLine(UNKNOWN), true)
    assert.equal(isUnrecognizedLine(UNKNOWN), true)
    assert.equal(isUnrecognizedLine({ kind: 'watch', productId: W1, options: {}, quantity: 1 }), false, 'known line')
    assert.equal(isUnrecognizedLine({ kind: 'strap', productId: 'new-strap', options: { size: 22 }, quantity: 1 }), true, 'unknown kind')
    for (const bad of [null, 'x', [], { kind: 'watch', productId: 77, quantity: 0 }, { kind: 'watch', productId: 77, quantity: 11 },
      { kind: 'watch', productId: 1.5, quantity: 1 }, { kind: 3, productId: 77, quantity: 1 }, { kind: 'watch', productId: 77, options: [], quantity: 1 },
      { kind: 'watch', productId: 77, options: { a: { b: 1 } }, quantity: 1 }]) {
      assert.equal(isWellFormedLine(bad), false, JSON.stringify(bad))
    }
  })

  test('loading the cart never writes to storage', () => {
    const s = makeStore()
    s.dispatch(hydrateCart([{ kind: 'watch', productId: W1, options: {}, quantity: 1 }, UNKNOWN]))
    assert.equal(globalThis.localStorage.writes, 0)
  })

  test('user actions save; nothing saves before the cart has loaded', () => {
    const s = makeStore()
    s.dispatch(addItem({ kind: 'watch', productId: W1 }))
    assert.equal(globalThis.localStorage.writes, 0, 'not hydrated yet')
    s.dispatch(hydrateCart([]))
    s.dispatch(addItem({ kind: 'watch', productId: W1 }))
    assert.deepEqual(savedLines(), [{ kind: 'watch', productId: W1, options: {}, quantity: 1 }])
  })

  test("a line this tab doesn't recognise survives this tab's own saves", () => {
    const raw = [{ kind: 'watch', productId: W2, options: {}, quantity: 1 }, UNKNOWN, { kind: 'watch', productId: 'junk', quantity: -1 }]
    setPreservedLines(raw.filter(isUnrecognizedLine)) // what CartHydrator does
    const s = makeStore()
    s.dispatch(hydrateCart(raw))
    s.dispatch(incrementQuantity(makeLineId('watch', W2)))
    assert.deepEqual(savedLines(), [{ kind: 'watch', productId: W2, options: {}, quantity: 2 }, UNKNOWN], 'corrupt line dropped, unknown kept')
    s.dispatch(removeItem(makeLineId('watch', W2)))
    assert.deepEqual(savedLines(), [UNKNOWN])
  })

  test('clear cart removes preserved lines too', () => {
    setPreservedLines([UNKNOWN])
    const s = makeStore()
    s.dispatch(hydrateCart([{ kind: 'watch', productId: W1, options: {}, quantity: 1 }, UNKNOWN]))
    s.dispatch(clearCart())
    assert.deepEqual(savedLines(), [])
  })

  test('preserved lines are capped at 50', () => {
    setPreservedLines(Array.from({ length: 80 }, (_, i) => ({ ...UNKNOWN, productId: 1000 + i })))
    const s = makeStore()
    s.dispatch(hydrateCart([]))
    s.dispatch(addItem({ kind: 'watch', productId: W1 }))
    assert.equal(savedLines().length, 51)
  })
})

describe('F-12: sidebar notice', () => {
  const run2 = (...actions) => actions.reduce((s, a) => sidebarReducer(s, a), sidebarReducer(undefined, { type: '@@init' }))

  test('shows a notice with a fresh id; clearing an old id keeps a newer notice', () => {
    let s = run2(toggleCartSidebar(true), showCartNotice({ type: 'success', text: 'A added' }))
    assert.deepEqual(s.notice, { type: 'success', text: 'A added', id: 1 })
    s = sidebarReducer(s, showCartNotice({ type: 'error', text: 'Maximum 10 per item.' }))
    assert.equal(s.notice.id, 2)
    s = sidebarReducer(s, clearCartNotice(1))
    assert.equal(s.notice.text, 'Maximum 10 per item.', 'stale timer must not clear the newer notice')
    s = sidebarReducer(s, clearCartNotice(2))
    assert.equal(s.notice, null)
  })

  test('closing the sidebar clears its notice', () => {
    const s = run2(toggleCartSidebar(true), showCartNotice({ type: 'success', text: 'x' }), toggleCartSidebar(false))
    assert.equal(s.notice, null)
    assert.equal(s.value, false)
  })
})

describe('Straps: catalog, $45.00 price and cart behaviour', () => {
  const S1 = straps[0].id
  const S2 = straps[1].id

  test('six straps with the approved names, slugs and existing images, in catalog order', () => {
    assert.deepEqual(straps.map((s) => s.name), ['Black Strap', 'Blue Strap', 'Yellow Strap', 'Silver Strap', 'Red Strap', 'Grey Strap'])
    assert.deepEqual(straps.map((s) => s.slug), ['black', 'blue', 'yellow', 'silver', 'red', 'grey'])
    assert.deepEqual(straps.map((s) => s.image), [1, 2, 3, 4, 5, 6].map((n) => `/images/strap-${n}.png`))
    assert.equal(getStrapBySlug('grey').name, 'Grey Strap')
    assert.equal(getStrapBySlug('nope'), undefined)
  })

  test('every strap costs exactly 45; watches and the custom watch stay unpriced', () => {
    for (const s of straps) assert.equal(getUnitPrice('strap', s.id), 45)
    for (const w of watches) assert.equal(getUnitPrice('watch', w.id), null)
    assert.equal(getUnitPrice('custom', CUSTOM), null)
    assert.equal(formatPrice(getUnitPrice('strap', S1)), '$45.00')
  })

  test('related straps are the next four in catalog order, wrapping, never the current one', () => {
    assert.deepEqual(getRelatedStraps(1).map((s) => s.slug), ['blue', 'yellow', 'silver', 'red'])
    assert.deepEqual(getRelatedStraps(5).map((s) => s.slug), ['grey', 'black', 'blue', 'yellow'])
    assert.deepEqual(getRelatedStraps(6).map((s) => s.slug), ['black', 'blue', 'yellow', 'silver'])
    for (const s of straps) assert.ok(!getRelatedStraps(s.id).some((r) => r.id === s.id))
  })

  test('each strap has its own stable cart identity; options are rejected', () => {
    assert.equal(makeLineId('strap', S1), 'strap:1')
    assert.notEqual(makeLineId('strap', S1), makeLineId('watch', S1))
    assert.equal(validateOptions('strap', S1, {}), true)
    assert.equal(validateOptions('strap', S1, { color: 'red' }), false)
    assert.equal(getAddOutcome([], { kind: 'strap', productId: 99 }).outcome, 'invalid')
    assert.equal(getAddOutcome([], { kind: 'strap', productId: '1' }).outcome, 'invalid')
  })

  test('the same strap merges, different straps stay separate, max 10', () => {
    let state = run(addItem({ kind: 'strap', productId: S1 }), addItem({ kind: 'strap', productId: S1 }), addItem({ kind: 'strap', productId: S2 }))
    assert.deepEqual(state.lines.map((l) => [l.lineId, l.quantity]), [['strap:1', 2], ['strap:2', 1]])
    state = run(addItem({ kind: 'strap', productId: S1, quantity: 9 }), addItem({ kind: 'strap', productId: S1, quantity: 5 }))
    assert.equal(state.lines[0].quantity, MAX_LINE_QUANTITY)
    assert.equal(getAddOutcome(state.lines, { kind: 'strap', productId: S1 }).outcome, 'max')
  })

  test('strap lines show name, image, $45 unit price, line total and their strap page', () => {
    const [line] = selectCartLines(root(run(addItem({ kind: 'strap', productId: S2, quantity: 3 }))))
    assert.equal(line.name, 'Blue Strap')
    assert.equal(line.image, '/images/strap-2.png')
    assert.equal(line.href, '/our-shop/blue/')
    assert.equal(line.unitPrice, 45)
    assert.equal(line.lineTotal, 135)
    assert.deepEqual(line.optionLabels, [])
    assert.equal(line.layers, null)
  })

  test('straps only: real subtotal and total', () => {
    const state = root(run(addItem({ kind: 'strap', productId: S1, quantity: 2 }), addItem({ kind: 'strap', productId: S2 })))
    const labels = getTotalLabels({ subtotal: selectSubtotal(state), hasPricedItems: selectHasPricedItems(state), hasUnpricedItems: selectHasUnpricedItems(state) })
    assert.deepEqual(labels, { subtotal: '$135.00', total: '$135.00 USD', excludesUnpriced: false })
  })

  test('mixed with a watch and a custom watch: subtotal is the straps only, total stays on request', () => {
    const state = root(run(
      addItem({ kind: 'strap', productId: S1 }),
      addItem({ kind: 'watch', productId: W1 }),
      addItem({ kind: 'custom', productId: CUSTOM, options: CONFIG_A }),
    ))
    assert.equal(selectCartCount(state), 3)
    const labels = getTotalLabels({ subtotal: selectSubtotal(state), hasPricedItems: selectHasPricedItems(state), hasUnpricedItems: selectHasUnpricedItems(state) })
    assert.deepEqual(labels, { subtotal: '$45.00', total: PRICE_ON_REQUEST, excludesUnpriced: true })
  })

  test('a price stored with a strap line is ignored', () => {
    const [line] = selectCartLines(root(run(hydrateCart([{ kind: 'strap', productId: S1, quantity: 1, price: 1, unitPrice: 1 }]))))
    assert.equal(line.unitPrice, 45)
  })

  describe('persistence', () => {
    let store
    beforeEach(() => {
      store = new Map()
      globalThis.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
      }
    })
    afterEach(() => { delete globalThis.localStorage })

    test('strap lines save as references and survive a reload next to existing watch/custom lines', () => {
      // A cart saved before straps existed still loads unchanged.
      store.set(CART_STORAGE_KEY, JSON.stringify({ version: 1, lines: [
        { kind: 'watch', productId: W1, options: {}, quantity: 1 },
        { kind: 'custom', productId: CUSTOM, options: CONFIG_A, quantity: 1 },
      ] }))
      let state = run(hydrateCart(loadCart()))
      assert.equal(state.lines.length, 2)
      state = reducer(state, addItem({ kind: 'strap', productId: S1, quantity: 2 }))
      saveCart(state.lines)
      const saved = JSON.parse(store.get(CART_STORAGE_KEY))
      assert.deepEqual(saved.lines[2], { kind: 'strap', productId: S1, options: {}, quantity: 2 })
      assert.deepEqual(run(hydrateCart(loadCart())).lines, state.lines)
    })
  })
})
