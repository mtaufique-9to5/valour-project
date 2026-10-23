// Database-only storefront: product mapping and cart support for database
// products (static catalog watches/straps retired). No database. Run: node --conditions=react-server --test tests/catalog-v2/
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { toStorefrontProduct } from '../../src/server/catalog-v2/storefront.js'
import reducer, { addItem, hydrateCart, setProductSummaries, selectCartLines, normalizeLine, isUnrecognizedLine } from '../../src/app/features/cart/cartSlice.js'

const row = (over = {}) => ({
  id: 1n, name: 'red', sku: '12548', slug: 'red-w', type: 'watch', status: 'active',
  basePrice: '1500.00', salePrice: '1099.00', trackStock: false, stock: 0,
  mainImage: '/media/products/1/388b0eb02e4a1e1483211d4197847c0c.png', images: [],
  shortDescription: 'Intro', longDescription: 'Long', additionalInfo: { subtitle: 'Lucent', accent: '#FACC15', specs: [{ label: 'Case', value: '40mm' }] },
  ...over,
})

describe('database product -> storefront shape', () => {
  test('fields the existing components use', () => {
    const p = toStorefrontProduct(row())
    assert.equal(p.source, 'db')
    assert.equal(p.key, 'product:1')
    assert.equal(p.kind, 'product')
    assert.equal(p.productId, '1')
    assert.equal(p.ref, '12548')
    assert.equal(p.heroImage, p.image, 'no hero image set: the hero uses the main image')
    assert.deepEqual(p.sectionImages, {})
    assert.equal(p.pdp.intro.heading, null, 'no invented headings')
    assert.equal(p.pdp.hero.subtitle, null)
    assert.equal(p.accent, '#FACC15')
    assert.deepEqual(p.specs, [{ label: 'Case', value: '40mm' }])
  })
  test('sale price is the price; base price struck through only when lower sale', () => {
    const p = toStorefrontProduct(row())
    assert.equal(p.price, 1099)
    assert.equal(p.compareAtPrice, 1500)
    const noSale = toStorefrontProduct(row({ salePrice: null }))
    assert.equal(noSale.price, 1500)
    assert.equal(noSale.compareAtPrice, null)
    assert.equal(toStorefrontProduct(row({ salePrice: '1500.00' })).compareAtPrice, null)
  })
  test('out of stock only when tracked and 0', () => {
    assert.equal(toStorefrontProduct(row({ trackStock: true, stock: 0 })).available, false)
    assert.equal(toStorefrontProduct(row({ trackStock: true, stock: 2 })).available, true)
    assert.equal(toStorefrontProduct(row({ trackStock: false, stock: 0 })).available, true)
  })
  test('section images come only from their roles, never from gallery positions', () => {
    const media = { hero: '/media/products/1/0123456789abcdef0123456789abcdef.jpg', movement: '/images/m.jpg' }
    const a = toStorefrontProduct(row({ images: ['/images/g1.jpeg', '/images/g2.jpeg'], additionalInfo: { media } }))
    const b = toStorefrontProduct(row({ images: ['/images/g2.jpeg', '/images/g1.jpeg'], additionalInfo: { media } }))
    assert.equal(a.heroImage, media.hero)
    assert.deepEqual(a.sectionImages, media)
    assert.deepEqual(b.sectionImages, a.sectionImages, 'reordering the gallery changes no section image')
    assert.equal(a.sectionImages.parallax1, undefined, 'unset roles stay empty (not filled from the gallery)')
  })
})

describe('cart: database products', () => {
  const state = (lines = []) => ({ cart: reducer(undefined, hydrateCart(lines)) })
  test('old static watch/strap lines are dropped (not shown, not kept); database lines stay', () => {
    const saved = [{ kind: 'watch', productId: 1, quantity: 1 }, { kind: 'strap', productId: 2, quantity: 1 }, { kind: 'product', productId: '1', quantity: 1 }]
    const s = reducer(undefined, hydrateCart(saved))
    assert.deepEqual(s.lines.map((l) => l.lineId), ['product:1'])
    assert.equal(isUnrecognizedLine(saved[0]), false, 'not preserved in storage either')
    const added = reducer(s, addItem({ kind: 'watch', productId: 1 }))
    assert.deepEqual(added.lines.map((l) => l.lineId), ['product:1'], 'static items can no longer be added')
  })
  test('only well-formed database ids, no options', () => {
    assert.equal(normalizeLine({ kind: 'product', productId: '1', quantity: 1 }).lineId, 'product:1')
    for (const bad of [{ productId: 1 }, { productId: '0' }, { productId: '1x' }, { productId: '1', options: { caseId: 'a' } }]) {
      assert.equal(normalizeLine({ kind: 'product', quantity: 1, ...bad }), null)
    }
  })
  test('saved lines survive a reload; prices come from the server summary, not storage', () => {
    let s = state([{ kind: 'product', productId: '1', quantity: 2, unitPrice: 1 }])
    assert.equal(selectCartLines(s).length, 0, 'hidden until the server answers')
    s = { cart: reducer(s.cart, setProductSummaries({ ids: ['1'], found: { 1: { name: 'red', slug: 'red-w', image: '/x.png', price: 1099, available: true } } })) }
    const [line] = selectCartLines(s)
    assert.equal(line.unitPrice, 1099)
    assert.equal(line.lineTotal, 2198)
    assert.equal(line.href, '/our-shop/red-w/')
  })
  test('products no longer published are removed from the cart', () => {
    let s = reducer(undefined, hydrateCart([{ kind: 'product', productId: '1', quantity: 1 }, { kind: 'product', productId: '2', quantity: 1 }]))
    s = reducer(s, setProductSummaries({ ids: ['1', '2'], found: { 2: { name: 'Frost Silver', slug: 'frost-silver', price: 525 } } }))
    assert.deepEqual(s.lines.map((l) => l.lineId), ['product:2'])
  })
})
