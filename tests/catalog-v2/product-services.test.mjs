// Product and image services against a fake transaction (no database).
// Run: node --conditions=react-server --test tests/catalog-v2/
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { fakeTx } from '../commerce/fake-tx.mjs'
import { createProduct, updateProduct, setPrices, setStatus, setInventory } from '../../src/server/catalog-v2/services/products.js'
import { attachUpload, detachImage, reorderGallery } from '../../src/server/catalog-v2/services/images.js'

const ACTOR = { actorType: 'ADMIN', actorId: '1', actorLabel: 'admin@valour.test' }
const UP = '/media/products/7/0123456789abcdef0123456789abcdef.webp'
const rejects = (p, code) => assert.rejects(p, (e) => e.code === code)
const quiet = async (fn) => { const info = console.info; console.info = () => {}; try { return await fn() } finally { console.info = info } }

function productTx(row, models = {}) {
  const state = { row: { id: 7n, name: 'Nova Red', sku: 'LUC-02', type: 'watch', status: 'draft', stock: 3n, trackStock: 1, basePrice: '525.00', salePrice: null, mainImage: UP, images: '[]', deletedAt: null, ...row }, updates: [] }
  const tx = fakeTx({
    query: (sql) => (/FROM products/.test(sql) ? [state.row] : []),
    execute: () => 1,
    models: {
      product: {
        update: ({ data }) => { state.updates.push(data); Object.assign(state.row, data); return state.row },
        create: ({ data }) => { state.created = data; return { id: 8n } },
        ...models.product,
      },
      orderItem: { count: () => 0 },
      category: { findUnique: () => null },
      brand: { findUnique: () => null },
      ...Object.fromEntries(Object.entries(models).filter(([k]) => k !== 'product')),
    },
  })
  return { tx, state }
}

describe('product service', () => {
  test('create: always draft; prices stored as decimals; display details stored in additional_info', async () => {
    const { tx, state } = productTx()
    await quiet(() => createProduct(tx, {
      name: 'Nova Red', sku: 'LUC-02', type: 'watch', basePrice: 52500, salePrice: 49999, trackStock: false, stock: 4,
      isFeatured: false, additionalInfo: { subtitle: 'Lucent Collection' },
    }, ACTOR))
    assert.equal(state.created.status, 'draft')
    assert.equal(state.created.basePrice, '525.00')
    assert.equal(state.created.salePrice, '499.99')
    assert.equal(state.created.stock, 0, 'untracked products keep stock 0')
    assert.equal(state.created.slug, 'nova-red-luc-02')
    assert.deepEqual(state.created.additionalInfo, { subtitle: 'Lucent Collection' })
    await rejects(createProduct(tx, { name: 'X', sku: 'X', type: 'watch', basePrice: 100, salePrice: 200, trackStock: false, stock: 0 }, ACTOR), 'invalid_price')
  })
  test('create/update: duplicate SKU or slug gives a clear message', async () => {
    const dup = (field) => () => { const e = new Error('dup'); e.code = 'P2002'; e.meta = { target: [field] }; throw e }
    await rejects(createProduct(productTx({}, { product: { create: dup('sku') } }).tx, { name: 'X', sku: 'X', type: 'watch', basePrice: 100, trackStock: false, stock: 0 }, ACTOR), 'duplicate_sku')
    await rejects(quiet(() => updateProduct(productTx({}, { product: { update: dup('slug') } }).tx, 7n, { slug: 'taken' }, ACTOR)), 'duplicate_slug')
  })
  test('publishing needs a main image and a valid price; archive and restore follow the status rules', async () => {
    const noImage = productTx({ mainImage: null })
    await rejects(setStatus(noImage.tx, 7n, 'active', ACTOR), 'invalid_status')
    const ok = productTx()
    await quiet(() => setStatus(ok.tx, 7n, 'active', ACTOR))
    assert.deepEqual(ok.state.updates.at(-1), { status: 'active' })
    await quiet(() => setStatus(ok.tx, 7n, 'inactive', ACTOR))
    await quiet(() => setStatus(ok.tx, 7n, 'draft', ACTOR))
    assert.deepEqual(ok.state.updates.map((u) => u.status), ['active', 'inactive', 'draft'])
  })
  test('type is locked once published', async () => {
    await rejects(quiet(() => updateProduct(productTx({ status: 'active' }).tx, 7n, { type: 'strap' }, ACTOR)), 'type_locked')
  })
  test('prices: sale never above base', async () => {
    const { tx, state } = productTx()
    await quiet(() => setPrices(tx, 7n, { basePrice: 52500, salePrice: null }, ACTOR))
    assert.deepEqual(state.updates.at(-1), { basePrice: '525.00', salePrice: null })
    await rejects(setPrices(tx, 7n, { basePrice: 100, salePrice: 101 }, ACTOR), 'invalid_price')
  })
  test('stock: a change made meanwhile is reported, never overwritten', async () => {
    await rejects(setInventory(productTx({ stock: 5n }).tx, 7n, { trackStock: true, expected: 3, stock: 10 }, ACTOR), 'stock_conflict')
    const { tx } = productTx({ stock: 3n })
    await quiet(() => setInventory(tx, 7n, { trackStock: true, expected: 3, stock: 10 }, ACTOR))
    assert.equal(tx.raw(/UPDATE products SET stock = \?/).length, 1)
  })
})

describe('image service', () => {
  test('active product cannot lose its last main image; archived products cannot be changed', async () => {
    await rejects(detachImage(productTx({ status: 'active', images: '[]' }).tx, { productId: 7n, path: UP, actor: ACTOR }), 'main_image_required')
    await rejects(attachUpload(productTx({ status: 'inactive' }).tx, { productId: 7n, storageKey: '7/0123456789abcdef0123456789abcdef.png', role: 'GALLERY', meta: {}, actor: ACTOR }), 'product_inactive')
  })
  test('reorder must contain exactly the current gallery', async () => {
    const { tx } = productTx({ images: JSON.stringify(['/images/a.png', '/images/b.png']) })
    await rejects(reorderGallery(tx, { productId: 7n, order: ['/images/a.png'], actor: ACTOR }), 'gallery_changed')
    await quiet(() => reorderGallery(tx, { productId: 7n, order: ['/images/b.png', '/images/a.png'], actor: ACTOR }))
  })
  test('uploads only attach to the product they were stored for', async () => {
    const { tx } = productTx({ mainImage: null })
    await rejects(attachUpload(tx, { productId: 7n, storageKey: '8/0123456789abcdef0123456789abcdef.png', role: 'MAIN', meta: {}, actor: ACTOR }), 'gallery_invalid')
  })
})
