// Phase A: product display details, admin row/image mapping, editor inputs.
// No database. Run: node --conditions=react-server --test tests/catalog-v2/
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { displayInfoSchema, mergeDisplayInfo, pickDisplayInfo, readAdditionalInfo } from '../../src/server/catalog-v2/display-info.js'
import { toListRow, toImageList, STATUS_TO_VIEW, VIEW_TO_STATUS } from '../../src/server/catalog-v2/admin-read.js'
import { productCreateSchema, productUpdateSchema, priceSchema, stockSchema } from '../../src/server/catalog-v2/schemas.js'
import { addImage, promoteToMain, removeImage, galleryError } from '../../src/server/catalog-v2/gallery-rules.js'

const UP = '/media/products/7/0123456789abcdef0123456789abcdef.webp'

describe('additional_info display details', () => {
  test('accepts exactly the catalog.js display fields', () => {
    const ok = displayInfoSchema.parse({
      subtitle: 'Lucent Collection', movement: 'automatic', accent: '#FACC15', limited: false,
      editions: ['P-01', 'P-02'], specs: [{ label: 'Case Diameter', value: '40mm' }],
    })
    assert.equal(ok.accent, '#FACC15')
    assert.deepEqual(ok.specs, [{ label: 'Case Diameter', value: '40mm' }])
  })
  test('rejects unknown keys, bad colours, oversized and malformed values', () => {
    assert.equal(displayInfoSchema.safeParse({ price: '1.00' }).success, false, 'no extra keys (e.g. price)')
    assert.equal(displayInfoSchema.safeParse({ accent: 'red' }).success, false)
    assert.equal(displayInfoSchema.safeParse({ subtitle: 'x'.repeat(121) }).success, false)
    assert.equal(displayInfoSchema.safeParse({ specs: [{ label: '', value: 'x' }] }).success, false)
    assert.equal(displayInfoSchema.safeParse({ specs: [{ label: 'a', value: 'b', extra: 1 }] }).success, false)
    assert.equal(displayInfoSchema.safeParse({ editions: Array(51).fill('E') }).success, false)
  })
  test('empty fields are dropped; merging keeps unknown stored keys', () => {
    const parsed = displayInfoSchema.parse({ subtitle: '  ', accent: '', tagline: 'New' })
    assert.deepEqual(parsed, { tagline: 'New' })
    const stored = { subtitle: 'Old', legacyNote: 'kept', specs: [{ label: 'A', value: 'B' }] }
    assert.deepEqual(mergeDisplayInfo(stored, parsed), { legacyNote: 'kept', tagline: 'New' })
    assert.equal(mergeDisplayInfo(null, {}), null)
    assert.deepEqual(pickDisplayInfo({ subtitle: 'S', legacyNote: 'x' }), { subtitle: 'S' })
    assert.deepEqual(readAdditionalInfo('{"a":1}'), { a: 1 })
    assert.deepEqual(readAdditionalInfo('not json'), {})
    assert.deepEqual(readAdditionalInfo([1]), {})
  })
})

describe('admin rows for the existing views', () => {
  const p = {
    id: 7n, name: 'Nova Red', sku: 'LUC-02', slug: 'nova-red', type: 'watch', status: 'inactive',
    basePrice: '525.00', salePrice: '499.99', trackStock: true, stock: 0, mainImage: UP, isFeatured: false,
    updatedAt: new Date('2026-10-22T10:00:00Z'), categoryId: null, category: null,
  }
  test('status, type, price and stock map to the view vocabulary', () => {
    const r = toListRow(p)
    assert.equal(r.id, '7')
    assert.equal(r.status, 'ARCHIVED')
    assert.equal(r.type, 'WATCH')
    assert.equal(r.price, 499.99, 'customers pay the sale price')
    assert.equal(r.basePrice, '525.00')
    assert.equal(toListRow({ ...p, basePrice: { toString: () => '1500' } }).basePrice, '1500.00', 'Prisma drops trailing zeros')
    assert.equal(r.salePrice, '499.99')
    assert.equal(r.trackingMode, 'TRACKED')
    assert.equal(r.stockStatus, 'Out of stock')
    assert.equal(toListRow({ ...p, stock: 5 }).stockStatus, 'In stock')
    assert.equal(toListRow({ ...p, trackStock: false }).stockStatus, 'Not tracked')
    assert.equal(toListRow({ ...p, trackStock: false }).onHand, null)
    assert.equal(toListRow({ ...p, salePrice: null }).price, 525)
  })
  test('status vocabularies are inverse', () => {
    for (const [db, view] of Object.entries(STATUS_TO_VIEW)) assert.equal(VIEW_TO_STATUS[view], db)
  })
  test('images: path is the id; main first, gallery in stored order', () => {
    const list = toImageList({ mainImage: UP, images: ['/images/a.png', '/images/b.png'] })
    assert.deepEqual(list.map((i) => [i.id, i.role, i.isPrimary, i.position]), [
      [UP, 'MAIN', true, 0], ['/images/a.png', 'GALLERY', false, 1], ['/images/b.png', 'GALLERY', false, 2],
    ])
    assert.deepEqual(toImageList({ mainImage: null, images: null }), [])
  })
})

describe('editor input validation (server schemas)', () => {
  const base = { name: 'Nova Red', type: 'watch', basePrice: '525.00', trackStock: false, stock: 0, isFeatured: false }
  test('create: draft-only fields, prices in cents, no status or price-on-request', () => {
    const r = productCreateSchema.parse({ ...base, salePrice: '499.99', categoryId: null, brandId: null, shortDescription: '', metaTitle: '' })
    assert.equal(r.sku, undefined)
    assert.equal(productCreateSchema.safeParse({ ...base, sku: 'LUC-02' }).success, false, 'SKU is generated, never sent')
    assert.equal(r.basePrice, 52500)
    assert.equal(r.salePrice, 49999)
    assert.equal(r.shortDescription, null)
    assert.equal(productCreateSchema.safeParse({ ...base, status: 'active' }).success, false)
    assert.equal(productCreateSchema.safeParse({ ...base, basePrice: '' }).success, false)
    assert.equal(productCreateSchema.safeParse({ ...base, basePrice: '0' }).success, false)
    assert.equal(productCreateSchema.safeParse({ ...base, type: 'bundle' }).success, false)
    assert.equal(productCreateSchema.safeParse({ ...base, slug: 'Bad Slug' }).success, false)
    assert.equal(productCreateSchema.safeParse({ ...base, trackStock: true, stock: 1_000_001 }).success, false)
  })
  test('update: prices, stock and status cannot be changed through the details form', () => {
    const update = productUpdateSchema.omit({ additionalInfo: true })
    assert.ok(update.safeParse({ name: 'X' }).success)
    for (const extra of [{ basePrice: '1.00' }, { stock: 3 }, { trackStock: true }, { status: 'active' }, { sku: 'VAL-W-0009' }]) {
      assert.equal(update.safeParse({ name: 'X', ...extra }).success, false, JSON.stringify(extra))
    }
  })
  test('prices and stock', () => {
    assert.deepEqual(priceSchema.parse({ basePrice: '525.00', salePrice: null }), { basePrice: 52500, salePrice: null })
    assert.equal(priceSchema.safeParse({ basePrice: '525.00', salePrice: '-1' }).success, false)
    assert.ok(stockSchema.safeParse({ trackStock: true, expected: 3, stock: 10 }).success)
    assert.equal(stockSchema.safeParse({ trackStock: true, expected: 3, stock: -1 }).success, false)
    assert.equal(stockSchema.safeParse({ trackStock: true, expected: 3, stock: 1.5 }).success, false)
  })
})

describe('image operations used by the actions', () => {
  test('upload, main image, reorder validation and safe delete (only uploads are removed from disk)', () => {
    let s = addImage({ mainImage: '/images/sunseeker.png', images: [] }, UP)
    assert.deepEqual(s, { mainImage: '/images/sunseeker.png', images: [UP] })
    s = promoteToMain(s, UP)
    assert.deepEqual(s, { mainImage: UP, images: ['/images/sunseeker.png'] })
    assert.equal(galleryError(s.images, { productId: '7', mainImage: s.mainImage }), null)
    const removedStatic = removeImage(s, '/images/sunseeker.png')
    assert.equal(removedStatic.removedStorageKey, null, 'storefront images under /public are never deleted')
    const removedUpload = removeImage(s, UP)
    assert.equal(removedUpload.removedStorageKey, '7/0123456789abcdef0123456789abcdef.webp')
    assert.equal(removedUpload.mainImage, '/images/sunseeker.png', 'next image is promoted')
  })
})
