// Automatic slugs and SKUs (auto-ids.js and the services using it). No database:
// a small in-memory table models MariaDB REPEATABLE READ (each transaction reads
// its own snapshot; the unique index sees every insert, committed or not).
// Run: node --conditions=react-server --test tests/catalog-v2/
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { setImmediate as tick } from 'node:timers/promises'

import { fakeTx } from '../commerce/fake-tx.mjs'
import { slugBase, nextFreeSlug, generateSlug, formatSku, nextSku, withAutoRetry } from '../../src/server/catalog-v2/auto-ids.js'
import { createProduct, updateProduct } from '../../src/server/catalog-v2/services/products.js'
import { createCategory, createBrand, updateCategory } from '../../src/server/catalog-v2/services/taxonomy.js'
import { categorySchema, brandSchema } from '../../src/server/catalog-v2/schemas.js'

const ACTOR = { actorType: 'ADMIN', actorId: '1', actorLabel: 'admin@valour.test' }
const rejects = (p, code) => assert.rejects(p, (e) => e.code === code)
const quiet = async (fn) => { const i = console.info; console.info = () => {}; try { return await fn() } finally { console.info = i } }

/** In-memory products table with unique sku/slug and per-transaction snapshots. */
function productsDb(rows = []) {
  const committed = rows.map((r) => ({ deletedAt: null, ...r }))
  const keys = { sku: new Set(committed.map((r) => r.sku)), slug: new Set(committed.map((r) => r.slug)) }
  let attempts = 0
  async function transaction(fn) {
    attempts++
    const snapshot = committed.slice()
    const pending = []
    const tx = fakeTx({
      query: (sql, [, pattern]) => {
        const re = new RegExp(pattern)
        const nums = snapshot.filter((r) => re.test(r.sku)).map((r) => Number(r.sku.slice(6)))
        return [{ n: nums.length ? BigInt(Math.max(...nums)) : 0n }]
      },
      models: {
        product: {
          findMany: ({ where }) => snapshot.filter((r) => r.slug === where.OR[0].slug || r.slug.startsWith(where.OR[1].slug.startsWith)),
          create: async ({ data }) => {
            await tick() // let the parallel transactions interleave between read and insert
            for (const f of ['sku', 'slug']) {
              if (keys[f].has(data[f])) { const e = new Error('dup'); e.code = 'P2002'; e.meta = { target: `products_${f}_key` }; throw e }
            }
            keys.sku.add(data.sku); keys.slug.add(data.slug); pending.push(data)
            return { id: BigInt(committed.length + pending.length) }
          },
        },
      },
    })
    try {
      const value = await fn(tx)
      committed.push(...pending)
      return value
    } catch (e) {
      for (const d of pending) { keys.sku.delete(d.sku); keys.slug.delete(d.slug) } // rollback
      throw e
    }
  }
  return { committed, transaction, attempts: () => attempts }
}

const newProduct = (over = {}) => ({ name: 'Nova Red', type: 'watch', basePrice: 52500, trackStock: false, stock: 0, isFeatured: false, ...over })
const create = (db, input) => withAutoRetry(() => db.transaction((tx) => quiet(() => createProduct(tx, input, ACTOR))))

describe('slug rules', () => {
  test('lower-case, hyphens, no special characters; fallback for empty names', () => {
    assert.equal(slugBase('Home & Kitchen'), 'home-kitchen')
    assert.equal(slugBase('Wireless Headphones'), 'wireless-headphones')
    assert.equal(slugBase('Cotton T-Shirt'), 'cotton-t-shirt')
    assert.equal(slugBase('  Édition — Spéciale  '), 'edition-speciale')
    assert.equal(slugBase('★★★', 180, 'category'), 'category')
    assert.ok(slugBase('x'.repeat(400), 180).length <= 174, 'room left for a -N suffix')
  })
  test('collisions get -2, -3, ...', () => {
    assert.equal(nextFreeSlug('home-kitchen', new Set()), 'home-kitchen')
    assert.equal(nextFreeSlug('home-kitchen', new Set(['home-kitchen'])), 'home-kitchen-2')
    assert.equal(nextFreeSlug('home-kitchen', new Set(['home-kitchen', 'home-kitchen-2'])), 'home-kitchen-3')
  })
  test('generateSlug looks at every row (deleted ones keep their slug reserved)', async () => {
    const tx = fakeTx({ models: { category: { findMany: () => [{ slug: 'home-kitchen' }, { slug: 'home-kitchen-2' }] } } })
    assert.equal(await generateSlug(tx, 'category', 'Home & Kitchen'), 'home-kitchen-3')
    assert.equal(JSON.stringify(tx.calls[0].args.where).includes('deletedAt'), false)
  })
})

describe('SKU sequences', () => {
  test('format and separate watch / strap prefixes; other types refused', () => {
    assert.equal(formatSku('watch', 1), 'VAL-W-0001')
    assert.equal(formatSku('strap', 42), 'VAL-S-0042')
    assert.equal(formatSku('watch', 12345), 'VAL-W-12345')
    assert.throws(() => formatSku('custom', 1), (e) => e.code === 'invalid_type')
  })
  test('nextSku reads the numeric maximum of its own prefix only', async () => {
    const tx = fakeTx({ query: (sql, [, pattern]) => [{ n: pattern === '^VAL-W-[0-9]+$' ? 9999n : 3n }] })
    assert.equal(await nextSku(tx, 'watch'), 'VAL-W-10000')
    assert.equal(await nextSku(tx, 'strap'), 'VAL-S-0004')
    assert.match(tx.calls[0].sql, /CAST\(SUBSTRING\(sku, \?\) AS UNSIGNED\)/, 'numeric, not text, maximum')
  })
  test('watches and straps count independently; existing (legacy) SKUs are ignored and untouched', async () => {
    const legacy = [{ sku: 'LUC-02', slug: 'nova-red-luc-02' }, { sku: 'STR-01', slug: 'black-strap-str-01' }]
    const db = productsDb(legacy)
    for (const [name, type] of [['Nova Red', 'watch'], ['Black Strap', 'strap'], ['Sunseeker', 'watch'], ['Tan Strap', 'strap']]) await create(db, newProduct({ name, type }))
    assert.deepEqual(db.committed.slice(2).map((r) => r.sku), ['VAL-W-0001', 'VAL-S-0001', 'VAL-W-0002', 'VAL-S-0002'])
    assert.deepEqual(db.committed.slice(0, 2).map(({ sku, slug }) => ({ sku, slug })), legacy, 'existing rows unchanged')
  })
})

describe('concurrent creation', () => {
  test('10 parallel watch creates with the same name: unique SKUs and slugs, no gaps, retries only', async () => {
    const db = productsDb()
    await Promise.all(Array.from({ length: 10 }, () => create(db, newProduct())))
    const skus = db.committed.map((r) => r.sku).sort()
    assert.deepEqual(skus, Array.from({ length: 10 }, (_, i) => formatSku('watch', i + 1)))
    assert.equal(new Set(db.committed.map((r) => r.slug)).size, 10)
    assert.ok(db.committed.some((r) => r.slug === 'nova-red') && db.committed.some((r) => r.slug === 'nova-red-2'))
    assert.ok(db.attempts() > 10, 'collisions happened and were retried in fresh transactions')
  })
  test('parallel watch and strap creates do not block each other’s sequences', async () => {
    const db = productsDb()
    await Promise.all([...Array(4)].map((_, i) => create(db, newProduct({ name: `W${i}`, type: i % 2 ? 'strap' : 'watch' }))))
    assert.deepEqual(db.committed.map((r) => r.sku).sort(), ['VAL-S-0001', 'VAL-S-0002', 'VAL-W-0001', 'VAL-W-0002'])
  })
  test('withAutoRetry: retries only collisions / deadlocks, and gives up after 10 attempts', async () => {
    let n = 0
    await assert.rejects(withAutoRetry(async () => { n++; throw Object.assign(new Error('x'), { code: 'auto_conflict' }) }), (e) => e.code === 'auto_conflict')
    assert.equal(n, 10)
    n = 0
    await assert.rejects(withAutoRetry(async () => { n++; throw Object.assign(new Error('x'), { code: 'duplicate_slug' }) }))
    assert.equal(n, 1, 'a slug the admin typed is reported, not retried')
    n = 0
    assert.equal(await withAutoRetry(async () => { if (++n < 3) throw Object.assign(new Error('d'), { code: 'P2034' }); return 'ok' }), 'ok')
  })
})

describe('existing products keep SKU and slug', () => {
  function editTx(row) {
    const state = { row: { id: 7n, name: 'Nova Red', sku: 'LUC-02', slug: 'nova-red-luc-02', type: 'watch', status: 'draft', stock: 0n, trackStock: 0, basePrice: '525.00', salePrice: null, mainImage: null, deletedAt: null, ...row }, updates: [] }
    const tx = fakeTx({
      query: () => [state.row],
      models: { product: { update: ({ data }) => { state.updates.push(data); return state.row } }, orderItem: { count: () => 0 } },
    })
    return { tx, state }
  }
  test('renaming does not touch the slug or SKU', async () => {
    const { tx, state } = editTx()
    await quiet(() => updateProduct(tx, 7n, { name: 'Nova Crimson' }, ACTOR))
    assert.deepEqual(state.updates, [{ name: 'Nova Crimson' }])
  })
  test('the SKU can never be changed, also not when the type changes (watch -> strap keeps VAL-W-…)', async () => {
    await rejects(updateProduct(editTx().tx, 7n, { sku: 'VAL-W-0099' }, ACTOR), 'sku_locked')
    const { tx, state } = editTx({ sku: 'VAL-W-0003' })
    await quiet(() => updateProduct(tx, 7n, { type: 'strap' }, ACTOR))
    assert.deepEqual(state.updates, [{ type: 'strap' }])
  })
  test('existing type-change restrictions still apply', async () => {
    await rejects(updateProduct(editTx({ status: 'active' }).tx, 7n, { type: 'strap' }, ACTOR), 'type_locked')
  })
})

describe('categories and brands', () => {
  test('empty slug is generated (with -2) on create; kept unchanged on update', async () => {
    const created = []
    const tx = fakeTx({
      query: () => [{ id: 1n, type: 'product', parentId: null, deletedAt: null }],
      models: {
        category: { findMany: ({ where }) => (where.OR ? [{ slug: 'home-kitchen' }] : []), create: ({ data }) => { created.push(data); return { id: 2n } }, update: ({ data }) => { created.push(data); return {} }, findUnique: () => null },
        brand: { findMany: () => [], create: ({ data }) => { created.push(data); return { id: 3n } } },
      },
    })
    await quiet(() => createCategory(tx, categorySchema.parse({ name: 'Home & Kitchen', slug: '', type: 'product' }), ACTOR))
    assert.equal(created[0].slug, 'home-kitchen-2')
    await quiet(() => createBrand(tx, brandSchema.parse({ name: 'Valour Atelier' }), ACTOR))
    assert.equal(created[1].slug, 'valour-atelier')
    await quiet(() => updateCategory(tx, 1n, categorySchema.parse({ name: 'Kitchen', slug: '', type: 'product' }), ACTOR))
    assert.equal(created[2].slug, undefined, 'rename keeps the slug')
  })
  test('a typed slug is still validated; a colliding typed slug is a clear error, not renamed', async () => {
    assert.equal(categorySchema.safeParse({ name: 'A', slug: 'Bad Slug', type: 'product' }).success, false)
    const tx = fakeTx({ models: { brand: { create: () => { const e = new Error('dup'); e.code = 'P2002'; e.meta = { target: 'brands_slug_key' }; throw e } } } })
    await rejects(createBrand(tx, brandSchema.parse({ name: 'X', slug: 'taken' }), ACTOR), 'duplicate')
    const auto = fakeTx({ models: { brand: { findMany: () => [], create: () => { const e = new Error('dup'); e.code = 'P2002'; e.meta = { target: 'brands_slug_key' }; throw e } } } })
    await rejects(createBrand(auto, brandSchema.parse({ name: 'X' }), ACTOR), 'auto_conflict')
  })
})
