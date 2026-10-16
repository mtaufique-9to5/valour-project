// Unified product catalog tests (Stage A). Run with: node --test tests/catalog.test.mjs
import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

import {
  CONFIRMED_PRICES,
  PRODUCT_TYPES,
  STRAP_DESCRIPTION,
  STRAP_SPECS,
  assertValidProducts,
  customWatch,
  getCatalogItem,
  getProductBySlug,
  getProductPrice,
  getProductsByType,
  getRelatedProducts,
  getRelatedStraps,
  getStrapBySlug,
  getUnitPrice,
  products,
  straps,
  watches,
} from '../src/data/catalog.js'
import reducer, { addItem, hydrateCart, makeLineId, selectCartLines } from '../src/app/features/cart/cartSlice.js'
import { CART_STORAGE_KEY, loadCart, saveCart } from '../src/app/features/cart/cartStorage.js'
import { getProductHref } from '../src/app/features/product/productUrl.js'

const WATCH_SLUGS = ['sunseeker-yellow', 'astral-blue', 'aurora-mint', 'nova-red', 'frost-silver', 'eclipse-black']
const WATCH_NAMES = ['Sunseeker Yellow', 'Astral Blue', 'Aurora Mint', 'Nova Red', 'Frost Silver', 'Eclipse Black']
const STRAP_SLUGS = ['black', 'blue', 'yellow', 'silver', 'red', 'grey']
const run = (...actions) => actions.reduce((state, action) => reducer(state, action), reducer(undefined, { type: '@@init' }))

describe('unified collection', () => {
  test('12 products: six watches then six straps, in catalog order', () => {
    assert.equal(products.length, 12)
    assert.deepEqual(products.map((p) => p.slug), [...WATCH_SLUGS, ...STRAP_SLUGS])
    assert.deepEqual(PRODUCT_TYPES, ['watch', 'strap'])
  })

  test('type is the product category', () => {
    assert.deepEqual(products.map((p) => p.type), [...Array(6).fill('watch'), ...Array(6).fill('strap')])
    assert.deepEqual(getProductsByType('watch').map((p) => p.slug), WATCH_SLUGS)
    assert.deepEqual(getProductsByType('strap').map((p) => p.slug), STRAP_SLUGS)
    assert.deepEqual(getProductsByType('custom'), [])
  })

  test('keys are globally unique and built from the existing per-type ids', () => {
    assert.deepEqual(products.map((p) => p.key), [1, 2, 3, 4, 5, 6].map((n) => `watch:${n}`).concat([1, 2, 3, 4, 5, 6].map((n) => `strap:${n}`)))
    assert.equal(new Set(products.map((p) => p.key)).size, 12)
    assert.equal(new Set(products.map((p) => p.slug)).size, 12)
    for (const p of products) {
      assert.equal(p.productId, p.id)
      // Same string the cart uses as the line id for an item with no options.
      assert.equal(p.key, makeLineId(p.type, p.productId))
    }
  })

  test('existing names, ids and image paths are preserved', () => {
    assert.deepEqual(watches.map((w) => [w.id, w.name, w.image]), WATCH_NAMES.map((name, i) => [i + 1, name, `/images/watch-${i + 1}.png`]))
    assert.deepEqual(straps.map((s) => [s.id, s.name, s.image]), ['Black', 'Blue', 'Yellow', 'Silver', 'Red', 'Grey'].map((c, i) => [i + 1, `${c} Strap`, `/images/strap-${i + 1}.png`]))
    for (const p of products) assert.deepEqual(p.images, [p.image])
    // Watch-page fields still present.
    for (const w of watches) for (const field of ['mainImage', 'secbgImage', 'secbgImage3', 'futureHeading', 'secTitle', 'accent']) assert.ok(w[field], `${w.slug}.${field}`)
  })

  test('watch movement moved from type to movement; range removed', () => {
    for (const w of watches) {
      assert.equal(w.type, 'watch')
      assert.equal(w.movement, 'automatic')
      assert.equal('range' in w, false)
    }
    // The shop's "Automatic" type filter (now reading movement) still matches all six.
    assert.equal(watches.filter((w) => w.movement === 'automatic').length, 6)
  })

  test('no product carries a price; the old 499 / 3200 fields are gone', () => {
    for (const p of products) {
      assert.equal('price' in p, false, p.key)
      assert.equal('pdpPrice' in p, false, p.key)
    }
  })

  test('strap description and specifications are unchanged', () => {
    assert.ok(STRAP_DESCRIPTION.startsWith('This hybrid sailcloth/FKM rubber strap is an original design'))
    assert.deepEqual(STRAP_SPECS.map((s) => s.label), ['Strap Length', 'Strap Width', 'Strap Material', 'Deployant', 'Lug Attachment'])
  })
})

describe('validation', () => {
  const p = (type, id, slug) => ({ type, id, productId: id, key: `${type}:${id}`, slug })

  test('accepts the real catalog', () => {
    assert.doesNotThrow(() => assertValidProducts(products))
  })

  test('rejects a slug used by two products, even across types', () => {
    assert.throws(() => assertValidProducts([p('watch', 1, 'blue'), p('strap', 2, 'blue')]), /Duplicate product slug "blue"/)
  })

  test('rejects a duplicate key', () => {
    assert.throws(() => assertValidProducts([p('strap', 1, 'a'), p('strap', 1, 'b')]), /Duplicate product key "strap:1"/)
  })

  test('the same numeric id in different types is allowed', () => {
    assert.doesNotThrow(() => assertValidProducts([p('watch', 1, 'a'), p('strap', 1, 'b')]))
  })

  test('rejects unknown types and missing slugs', () => {
    assert.throws(() => assertValidProducts([p('bracelet', 1, 'x')]), /Unknown product type/)
    assert.throws(() => assertValidProducts([p('strap', 1, '')]), /Missing slug/)
  })
})

describe('lookups', () => {
  test('getProductBySlug resolves all 12 products', () => {
    for (const slug of [...WATCH_SLUGS, ...STRAP_SLUGS]) assert.equal(getProductBySlug(slug)?.slug, slug)
    assert.equal(getProductBySlug('astral-blue').type, 'watch')
    assert.equal(getProductBySlug('blue').type, 'strap')
  })

  test('unknown or invalid slugs return undefined', () => {
    for (const slug of ['', 'green', 'Blue', 'blue/', 'custom-watch', undefined, null, 1, {}]) assert.equal(getProductBySlug(slug), undefined)
  })

  test('getStrapBySlug only returns straps', () => {
    assert.equal(getStrapBySlug('red').name, 'Red Strap')
    assert.equal(getStrapBySlug('nova-red'), undefined)
  })

  test('related products: same type, next four in catalog order, wrapping, never itself', () => {
    assert.deepEqual(getRelatedProducts(getProductBySlug('red')).map((r) => r.slug), ['grey', 'black', 'blue', 'yellow'])
    assert.deepEqual(getRelatedProducts(getProductBySlug('eclipse-black')).map((r) => r.slug), ['sunseeker-yellow', 'astral-blue', 'aurora-mint', 'nova-red'])
    for (const product of products) {
      const related = getRelatedProducts(product)
      assert.equal(related.length, 4)
      assert.ok(related.every((r) => r.type === product.type && r.key !== product.key))
    }
    assert.deepEqual(getRelatedProducts(getProductBySlug('blue'), 2).map((r) => r.slug), ['yellow', 'silver'])
    assert.deepEqual(getRelatedProducts(undefined), [])
    assert.deepEqual(getRelatedStraps(1).map((s) => s.slug), ['blue', 'yellow', 'silver', 'red'])
  })

  test('cart lookups (getCatalogItem) still resolve by kind and numeric id', () => {
    assert.equal(getCatalogItem('watch', 1).name, 'Sunseeker Yellow')
    assert.equal(getCatalogItem('strap', 1).name, 'Black Strap')
    assert.equal(getCatalogItem('custom', 'custom-watch'), customWatch)
    assert.equal(getCatalogItem('strap', '1'), undefined)
    assert.equal(getCatalogItem('product', 1), undefined)
  })
})

describe('pricing', () => {
  test('CONFIRMED_PRICES is the only source: six watches 525, straps 45, the custom watch unpriced', () => {
    assert.deepEqual(Object.keys(CONFIRMED_PRICES).sort(), ['custom', 'strap', 'watch'])
    assert.deepEqual(CONFIRMED_PRICES.watch, { 1: 525, 2: 525, 3: 525, 4: 525, 5: 525, 6: 525 })
    assert.deepEqual(CONFIRMED_PRICES.custom, {})
    for (const s of straps) assert.equal(getProductPrice(s), 45)
    for (const w of watches) assert.equal(getProductPrice(w), 525, w.slug)
    assert.equal(getUnitPrice('custom', 'custom-watch'), null)
    assert.equal(getProductPrice(undefined), null)
  })

  test('getProductPrice follows CONFIRMED_PRICES rather than any product field', () => {
    const watch = getProductBySlug('astral-blue')
    const original = CONFIRMED_PRICES.watch
    CONFIRMED_PRICES.watch = { [watch.productId]: 1234 }
    try {
      assert.equal(getProductPrice(watch), 1234)
      assert.equal(getProductPrice(getProductBySlug('sunseeker-yellow')), null)
    } finally {
      CONFIRMED_PRICES.watch = original
    }
  })
})

describe('saved-cart compatibility', () => {
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

  test('a cart saved before the unified catalog loads unchanged, with watch:1 and strap:1 kept apart', () => {
    const saved = { version: 1, lines: [
      { kind: 'watch', productId: 1, options: {}, quantity: 2 },
      { kind: 'strap', productId: 1, options: {}, quantity: 3 },
      { kind: 'custom', productId: 'custom-watch', options: { caseId: 'gold', dialId: 'mint', strapId: 'grey-teal' }, quantity: 1 },
    ] }
    store.set(CART_STORAGE_KEY, JSON.stringify(saved))
    const state = run(hydrateCart(loadCart()))
    assert.deepEqual(state.lines.map((l) => [l.lineId, l.quantity]), [['watch:1', 2], ['strap:1', 3], ['custom:custom-watch|caseId=gold,dialId=mint,strapId=grey-teal', 1]])
    const lines = selectCartLines({ cart: state })
    assert.deepEqual(lines.map((l) => [l.name, l.unitPrice]), [['Sunseeker Yellow', 525], ['Black Strap', 45], ['Custom Watch', null]])
    // Saving writes back exactly the same format.
    saveCart(state.lines)
    assert.deepEqual(JSON.parse(store.get(CART_STORAGE_KEY)), saved)
  })

  test('adding a strap never merges into the watch with the same numeric id', () => {
    const state = run(addItem({ kind: 'watch', productId: 2 }), addItem({ kind: 'strap', productId: 2 }), addItem({ kind: 'strap', productId: 2 }))
    assert.deepEqual(state.lines.map((l) => [l.lineId, l.quantity]), [['watch:2', 1], ['strap:2', 2]])
  })
})

describe('product URLs (one route for every product)', () => {
  test('every watch and strap lives at /our-shop/{slug}/', () => {
    assert.deepEqual(products.map(getProductHref), [...WATCH_SLUGS, ...STRAP_SLUGS].map((slug) => `/our-shop/${slug}/`))
  })

  test('URLs are unique and never use the legacy /straps/ path', () => {
    const hrefs = products.map(getProductHref)
    assert.equal(new Set(hrefs).size, 12)
    assert.ok(hrefs.every((h) => !h.includes('/straps/')))
  })

  test('each URL resolves back to the same product through getProductBySlug', () => {
    for (const product of products) {
      const slug = getProductHref(product).split('/').filter(Boolean).pop()
      assert.equal(getProductBySlug(slug), product)
    }
  })

  test('cart lines link to the canonical URL; the custom watch still links to the Customizer', () => {
    const state = run(addItem({ kind: 'watch', productId: 3 }), addItem({ kind: 'strap', productId: 3 }), addItem({ kind: 'custom', productId: 'custom-watch', options: { caseId: 'gold', dialId: 'mint', strapId: 'grey-teal' } }))
    assert.deepEqual(selectCartLines({ cart: state }).map((l) => l.href), ['/our-shop/aurora-mint/', '/our-shop/yellow/', '/customizer'])
  })
})
