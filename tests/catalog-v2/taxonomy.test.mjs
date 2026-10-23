// Phase 1: Categories and Brands admin (services, validation, authorisation,
// product editor and storefront compatibility). No database.
// Run: node --conditions=react-server --test tests/catalog-v2/
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { fakeTx } from '../commerce/fake-tx.mjs'
import { categorySchema, brandSchema } from '../../src/server/catalog-v2/schemas.js'
import {
  createCategory, updateCategory, softDeleteCategory, setCategoryStatus,
  createBrand, updateBrand, softDeleteBrand,
} from '../../src/server/catalog-v2/services/taxonomy.js'

const ACTOR = { actorType: 'ADMIN', actorId: '1', actorLabel: 'admin@valour.test' }
const rejects = (p, code) => assert.rejects(p, (e) => e.code === code)
const quiet = async (fn) => { const i = console.info; console.info = () => {}; try { return await fn() } finally { console.info = i } }
const dup = () => { const e = new Error('dup'); e.code = 'P2002'; throw e }
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

// Small in-memory categories table for the fake transaction.
function categoryTx(rows = [], counts = { children: 0, products: 0, blogs: 0, n: 0 }) {
  const state = { rows: rows.map((r) => ({ deletedAt: null, status: false, ...r })), created: null, updated: null }
  const byId = (id) => state.rows.find((r) => r.id === BigInt(id))
  const tx = fakeTx({
    query: (sql, values) => {
      if (/SELECT parent_id AS parentId FROM categories/.test(sql)) { const r = byId(values[0]); return r ? [{ parentId: r.parentId ?? null }] : [] }
      if (/SELECT id, type, parent_id AS parentId, deleted_at AS deletedAt FROM categories/.test(sql)) { const r = byId(values[0]); return r ? [r] : [] }
      if (/SELECT id, deleted_at AS deletedAt FROM categories/.test(sql)) { const r = byId(values[0]); return r ? [r] : [] }
      if (/AS children/.test(sql)) return [counts]
      if (/AS n/.test(sql)) return [{ n: counts.n }]
      return []
    },
    models: {
      category: {
        findUnique: ({ where }) => byId(where.id) ?? null,
        findMany: ({ where }) => state.rows.filter((r) => where.parentId.in.includes(r.parentId) && !r.deletedAt),
        create: ({ data }) => { if (state.rows.some((r) => r.slug === data.slug)) dup(); state.created = data; return { id: 50n } },
        update: ({ data }) => { if (data.slug && state.rows.some((r) => r.slug === data.slug && r.id !== state.rows[0].id)) dup(); state.updated = data; return {} },
      },
    },
  })
  return { tx, state }
}

const input = (over = {}) => categorySchema.parse({ name: 'Lucent', slug: 'lucent', type: 'product', ...over })

describe('categories', () => {
  test('create: starts inactive; parent must exist, be the same type, max 3 levels', async () => {
    const { tx, state } = categoryTx([{ id: 1n, type: 'product', parentId: null, slug: 'watches' }, { id: 2n, type: 'blog', parentId: null, slug: 'news' }, { id: 3n, type: 'product', parentId: 1n, slug: 'lucent-sub' }, { id: 4n, type: 'product', parentId: 3n, slug: 'deep' }])
    await quiet(() => createCategory(tx, input({ parentId: '1' }), ACTOR))
    assert.equal(state.created.status, false)
    assert.equal(state.created.parentId, 1n)
    await rejects(createCategory(tx, input({ slug: 'x', parentId: '2' }), ACTOR), 'invalid_parent')
    await rejects(createCategory(tx, input({ slug: 'y', parentId: '99' }), ACTOR), 'invalid_parent')
    await rejects(createCategory(tx, input({ slug: 'z', parentId: '4' }), ACTOR), 'invalid_parent')
  })
  test('duplicate slug (including deleted categories) is refused with a clear error', async () => {
    const { tx } = categoryTx([{ id: 1n, type: 'product', parentId: null, slug: 'lucent', deletedAt: new Date() }])
    await rejects(createCategory(tx, input(), ACTOR), 'duplicate')
  })
  test('edit: no self-parent, type locked while in use', async () => {
    const { tx } = categoryTx([{ id: 1n, type: 'product', parentId: null, slug: 'lucent' }])
    await rejects(updateCategory(tx, 1n, input({ parentId: '1' }), ACTOR), 'invalid_parent')
    const used = categoryTx([{ id: 1n, type: 'product', parentId: null, slug: 'lucent' }], { n: 2 })
    await rejects(updateCategory(used.tx, 1n, input({ type: 'blog' }), ACTOR), 'type_locked')
    const ok = categoryTx([{ id: 1n, type: 'product', parentId: null, slug: 'lucent' }])
    await quiet(() => updateCategory(ok.tx, 1n, input({ name: 'Lucent Collection' }), ACTOR))
    assert.equal(ok.state.updated.name, 'Lucent Collection')
  })
  test('safe deletion: refused while subcategories, products or blog posts use it; otherwise a soft delete', async () => {
    for (const counts of [{ children: 1, products: 0, blogs: 0 }, { children: 0, products: 3, blogs: 0 }, { children: 0, products: 0, blogs: 1 }]) {
      await rejects(softDeleteCategory(categoryTx([{ id: 1n, type: 'product', slug: 'a' }], counts).tx, 1n, ACTOR), 'in_use')
    }
    const free = categoryTx([{ id: 1n, type: 'product', slug: 'a' }])
    await quiet(() => softDeleteCategory(free.tx, 1n, ACTOR))
    assert.ok(free.state.updated.deletedAt instanceof Date)
    assert.equal(free.state.updated.status, false)
  })
  test('activation is explicit; deleted categories cannot be changed', async () => {
    const { tx, state } = categoryTx([{ id: 1n, type: 'product', slug: 'a' }])
    await quiet(() => setCategoryStatus(tx, 1n, true, ACTOR))
    assert.deepEqual(state.updated, { status: true })
    await rejects(setCategoryStatus(categoryTx([{ id: 1n, type: 'product', slug: 'a', deletedAt: new Date() }]).tx, 1n, true, ACTOR), 'not_found')
  })
})

function brandTx({ existing = [], products = 0 } = {}) {
  const state = { created: null, updated: null }
  const tx = fakeTx({
    query: () => [{ id: 7n, deletedAt: null }],
    models: {
      brand: {
        findUnique: () => ({ id: 7n, name: 'Valour', slug: 'valour', deletedAt: null, status: false }),
        create: ({ data }) => { if (existing.includes(data.slug) || existing.includes(data.name)) dup(); state.created = data; return { id: 8n } },
        update: ({ data }) => { if (data.slug && existing.includes(data.slug)) dup(); state.updated = data; return {} },
      },
      product: { count: () => products },
    },
  })
  return { tx, state }
}

describe('brands', () => {
  test('create starts inactive; duplicate name or slug refused', async () => {
    const { tx, state } = brandTx()
    await quiet(() => createBrand(tx, brandSchema.parse({ name: 'Valour', slug: 'valour' }), ACTOR))
    assert.equal(state.created.status, false)
    await rejects(createBrand(brandTx({ existing: ['valour'] }).tx, brandSchema.parse({ name: 'Other', slug: 'valour' }), ACTOR), 'duplicate')
    await rejects(updateBrand(brandTx({ existing: ['taken'] }).tx, 7n, brandSchema.parse({ name: 'Valour', slug: 'taken' }), ACTOR), 'duplicate')
  })
  test('safe deletion: refused while ANY non-deleted product (draft and archived too) uses the brand', async () => {
    await rejects(softDeleteBrand(brandTx({ products: 1 }).tx, 7n, ACTOR), 'in_use')
    const free = brandTx({ products: 0 })
    await quiet(() => softDeleteBrand(free.tx, 7n, ACTOR))
    assert.ok(free.state.updated.deletedAt instanceof Date)
    const count = free.tx.calls.find((c) => c.model === 'product' && c.method === 'count')
    assert.deepEqual(count.args.where, { brandId: 7n, deletedAt: null }, 'not limited to active products')
  })
})

describe('validation', () => {
  test('name and slug required; slug format; unknown fields and types refused', () => {
    assert.equal(categorySchema.safeParse({ name: '', slug: 'a', type: 'product' }).success, false)
    assert.equal(categorySchema.safeParse({ name: 'A', slug: 'Bad Slug', type: 'product' }).success, false)
    assert.equal(categorySchema.safeParse({ name: 'A', slug: 'a', type: 'watch' }).success, false)
    assert.equal(categorySchema.safeParse({ name: 'A', slug: 'a', type: 'product', status: true }).success, false, 'status only via the status action')
    assert.equal(brandSchema.safeParse({ name: 'A', slug: 'a', logo: '/x.png' }).success, false)
    assert.deepEqual(brandSchema.parse({ name: ' Valour ', slug: 'Valour', description: '' }), { name: 'Valour', slug: 'valour', description: null })
  })
  test('the slug suggestion matches the server format', async () => {
    const src = read('../../src/admin/client/catalog/TaxonomyClient.jsx')
    assert.match(src, /export const slugify = /)
    // Same rule as the server slug: lower-case letters, digits, single hyphens.
    const slugify = (s) => String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180)
    for (const name of ['Lucent Collection', '  Édition — Spéciale  ', 'P-01 Straps']) assert.ok(categorySchema.shape.slug.safeParse(slugify(name)).success, name)
  })
})

describe('authorisation and integration', () => {
  test('every category/brand action re-checks the admin session (run wrapper) and validates input', () => {
    const src = read('../../src/app/admin/(panel)/taxonomy-actions.js')
    assert.match(src, /^'use server'/)
    assert.match(src, /const session = await getAdminSession\(\)\n {2}if \(!session\) return \{ ok: false/)
    const exported = [...src.matchAll(/export async function (\w+)\(/g)].map((m) => m[1])
    assert.equal(exported.length, 8)
    for (const name of exported) {
      const body = src.slice(src.indexOf(`export async function ${name}(`)).split(/\nexport /)[0]
      assert.match(body, /return run\(/, `${name} must go through run()`)
    }
  })
  test('pages are permission-guarded; sidebar links to them', () => {
    for (const page of ['categories', 'brands']) assert.match(read(`../../src/app/admin/(panel)/${page}/page.jsx`), /await requirePagePermission\(PERMISSIONS\.PRODUCT_UPDATE\)/)
    const nav = read('../../src/admin/components/nav.js')
    assert.match(nav, /id: 'categories', label: 'Categories', path: '\/categories'/)
    assert.match(nav, /id: 'brands', label: 'Brands', path: '\/brands'/)
  })
  test('product editor: options keep inactive entries (marked) so existing assignments load and save', () => {
    const src = read('../../src/server/catalog-v2/admin-read.js')
    assert.match(src, /listCategoryOptions[\s\S]*where: \{ deletedAt: null, type: 'product' \}[\s\S]*\(inactive\)/)
    assert.match(src, /listBrandOptions[\s\S]*where: \{ deletedAt: null \}[\s\S]*\(inactive\)/)
  })
  test('storefront listings do not depend on categories or brands (shop filters use display details)', () => {
    const sf = read('../../src/server/catalog-v2/storefront.js')
    assert.match(sf, /where: \{ status: 'active', deletedAt: null, type: \{ in: PUBLIC_TYPES \} \}/)
    assert.doesNotMatch(sf, /category|brand/i)
  })
})
