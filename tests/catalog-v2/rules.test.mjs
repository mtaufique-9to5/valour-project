// Level-1 tests for the approved-schema catalog rules, seed plan and the RBAC
// cutover accessor (no database).
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import * as catalog from '../../src/data/catalog.js'
import { canTransition, priceProblems, activationProblems, statusChangeError, typeChangeError } from '../../src/server/catalog-v2/product-rules.js'
import { isGalleryPath, galleryError, addImage, promoteToMain, removeImage, referencedStorageKeys, MAX_GALLERY } from '../../src/server/catalog-v2/gallery-rules.js'
import { parentError, deleteError, categoryUseError } from '../../src/server/catalog-v2/category-rules.js'
import { productCreateSchema, priceSchema, categorySchema } from '../../src/server/catalog-v2/schemas.js'
import { buildSeedPlanV2 } from '../../src/server/catalog-v2/seed-plan.js'
import { adminRoleModel, adminPermissionModel, adminRolePermissionModel } from '../../src/server/rbac/models.js'

const KEY = '12/0123456789abcdef0123456789abcdef.webp'
const UP = `/media/products/${KEY}`

describe('products', () => {
  const ready = { id: '12', name: 'Nova', sku: 'LUC-02', baseMinor: 52500, saleMinor: null, mainImage: UP, trackStock: false, stock: 0, deletedAt: null }
  test('status transitions', () => {
    assert.ok(canTransition('draft', 'active'))
    assert.ok(canTransition('inactive', 'draft'))
    assert.equal(canTransition('draft', 'archived'), false)
  })
  test('prices: base > 0, sale optional and never above base; no price-on-request', () => {
    assert.deepEqual(priceProblems(52500, null), [])
    assert.deepEqual(priceProblems(52500, 52500), [])
    assert.equal(priceProblems(0, null).length, 1)
    assert.equal(priceProblems(null, null).length, 1)
    assert.equal(priceProblems(100, 101).length, 1)
    assert.equal(priceProblems(100, 0).length, 1)
  })
  test('activation needs name, SKU, valid price and a main image of this product', () => {
    assert.deepEqual(activationProblems(ready), [])
    assert.ok(activationProblems({ ...ready, mainImage: null }).length)
    assert.ok(activationProblems({ ...ready, mainImage: '/media/products/13/0123456789abcdef0123456789abcdef.webp' }).length)
    assert.ok(activationProblems({ ...ready, deletedAt: new Date() }).length)
    assert.equal(statusChangeError('draft', 'active', ready), null)
    assert.ok(statusChangeError('draft', 'active', { ...ready, baseMinor: 0 }))
  })
  test('type is fixed once ordered or published', () => {
    assert.equal(typeChangeError('watch', { status: 'draft', hasOrders: false }, 'strap'), null)
    assert.ok(typeChangeError('watch', { status: 'active', hasOrders: false }, 'strap'))
    assert.ok(typeChangeError('watch', { status: 'draft', hasOrders: true }, 'strap'))
    assert.ok(typeChangeError('watch', { status: 'draft', hasOrders: false }, 'bundle'))
  })
  test('input schemas convert amounts to cents and reject client mistakes', () => {
    const p = productCreateSchema.parse({ name: 'Nova', sku: 'luc-02', type: 'watch', basePrice: '525.00', categoryId: '3' })
    assert.equal(p.sku, 'LUC-02')
    assert.equal(p.basePrice, 52500)
    assert.equal(p.categoryId, 3n)
    assert.equal(p.trackStock, false)
    assert.equal(productCreateSchema.safeParse({ name: 'N', sku: 'X', type: 'watch', basePrice: '0' }).success, false)
    assert.equal(productCreateSchema.safeParse({ name: 'N', sku: 'X', type: 'watch', basePrice: '1.00', status: 'active' }).success, false)
    assert.equal(priceSchema.safeParse({ basePrice: '10.00', salePrice: '-1' }).success, false)
    assert.equal(categorySchema.safeParse({ name: 'A', slug: 'Bad Slug', type: 'product' }).success, false)
  })
})

describe('gallery (main_image + images JSON)', () => {
  test('valid paths: own uploads or existing static images; no traversal', () => {
    assert.ok(isGalleryPath(UP, '12'))
    assert.equal(isGalleryPath(UP, '13'), false)
    assert.ok(isGalleryPath('/images/sunseeker-yellow/img-1.jpeg'))
    assert.equal(isGalleryPath('/images/../secret.png'), false)
    assert.equal(isGalleryPath('https://evil.example/x.png'), false)
  })
  test('add, promote, remove keep one main image and the gallery limit', () => {
    let s = addImage({ mainImage: null, images: [] }, '/images/a.png')
    assert.deepEqual(s, { mainImage: '/images/a.png', images: [] })
    s = addImage(s, UP)
    s = promoteToMain(s, UP)
    assert.deepEqual(s, { mainImage: UP, images: ['/images/a.png'] })
    const r = removeImage(s, UP)
    assert.deepEqual(r, { mainImage: '/images/a.png', images: [], removedStorageKey: KEY })
    const full = { mainImage: '/images/m.png', images: Array.from({ length: MAX_GALLERY }, (_, i) => `/images/g${i}.png`) }
    assert.throws(() => addImage(full, '/images/x.png'))
    assert.throws(() => removeImage(full, '/images/none.png'))
  })
  test('gallery validation and orphan reference set', () => {
    assert.equal(galleryError(['/images/a.png'], { productId: '12', mainImage: UP }), null)
    assert.ok(galleryError(['/images/a.png', '/images/a.png'], { productId: '12' }))
    assert.ok(galleryError([UP], { productId: '12', mainImage: UP }))
    assert.deepEqual([...referencedStorageKeys([{ mainImage: UP, images: ['/images/a.png'] }])], [KEY])
  })
})

describe('categories', () => {
  const parent = { id: 2n, type: 'product', deletedAt: null }
  test('no self-parenting, loops, type mismatch, or depth over 3', () => {
    assert.equal(parentError({ id: null, type: 'product', subtreeHeight: 1 }, parent, [1n]), null)
    assert.ok(parentError({ id: 2n, type: 'product', subtreeHeight: 1 }, parent, []))
    assert.ok(parentError({ id: 1n, type: 'product', subtreeHeight: 1 }, parent, [1n]))
    assert.ok(parentError({ id: null, type: 'blog', subtreeHeight: 1 }, parent, []))
    assert.ok(parentError({ id: null, type: 'product', subtreeHeight: 1 }, parent, [1n, 0n]))
    assert.ok(parentError({ id: 5n, type: 'product', subtreeHeight: 2 }, parent, [1n]))
    assert.ok(parentError({ id: null, type: 'product', subtreeHeight: 1 }, { ...parent, deletedAt: new Date() }, []))
  })
  test('soft delete blocked while in use; usage type must match', () => {
    assert.equal(deleteError({ children: 0, products: 0, blogs: 0 }), null)
    assert.ok(deleteError({ children: 1, products: 0, blogs: 0 }))
    assert.ok(deleteError({ children: 0, products: 0, blogs: 2 }))
    assert.equal(categoryUseError({ type: 'product', deletedAt: null }, 'product'), null)
    assert.ok(categoryUseError({ type: 'blog', deletedAt: null }, 'product'))
  })
})

describe('seed plan v2', () => {
  const plan = buildSeedPlanV2(catalog)
  test('confirmed prices only, drafts, stock never invented, custom watch skipped', () => {
    assert.equal(plan.counts.products, 12)
    assert.ok(plan.products.every((p) => p.status === 'draft' && p.trackStock === false && p.stock === 0))
    assert.deepEqual([...new Set(plan.products.map((p) => `${p.type}:${p.basePrice}`))].sort(), ['strap:45.00', 'watch:525.00'])
    assert.ok(plan.skipped.some((s) => s.key === 'custom-watch'))
    assert.ok(plan.products.every((p) => isGalleryPath(p.mainImage) && p.images.every((i) => isGalleryPath(i))))
  })
  test('26 customizer options, one default per part matching the storefront', () => {
    assert.equal(plan.counts.customizerOptions, 26)
    assert.deepEqual(plan.customizerOptions.filter((o) => o.isDefault).map((o) => `${o.part}:${o.optionKey}`), ['case:black', 'dial:black', 'strap:black-black'])
    assert.deepEqual(plan.roles, ['Customer'])
    assert.deepEqual(plan.settings.map((s) => [s.key, s.value]), [['store_currency', 'USD']])
  })
})

describe('RBAC cutover accessor (SC-1)', () => {
  test('before the rename it uses role/permission/rolePermission', () => {
    const legacy = { role: 'R', permission: 'P', rolePermission: 'RP' }
    assert.equal(adminRoleModel(legacy), 'R')
    assert.equal(adminPermissionModel(legacy), 'P')
    assert.equal(adminRolePermissionModel(legacy), 'RP')
  })
  test('after the rename it always prefers the admin delegates (db.role becomes website roles)', () => {
    const next = { role: 'WEBSITE', adminRole: 'AR', permission: undefined, adminPermission: 'AP', adminRolePermission: 'ARP' }
    assert.equal(adminRoleModel(next), 'AR')
    assert.equal(adminPermissionModel(next), 'AP')
    assert.equal(adminRolePermissionModel(next), 'ARP')
    assert.throws(() => adminRoleModel({}))
  })
})
