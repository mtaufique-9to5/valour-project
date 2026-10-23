// Product detail page content: pdp schema, merge safety, section image roles,
// file-deletion safety and storefront mapping. No database.
// Run: node --conditions=react-server --test tests/catalog-v2/
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { fakeTx } from '../commerce/fake-tx.mjs'
import { displayInfoSchema, mergeDisplayInfo, pickDisplayInfo, readMedia, withMedia, MEDIA_ROLES, PDP_SECTIONS } from '../../src/server/catalog-v2/display-info.js'
import { productImagePaths, referencedStorageKeys } from '../../src/server/catalog-v2/gallery-rules.js'
import { setSectionImage, detachImage, reorderGallery } from '../../src/server/catalog-v2/services/images.js'
import { readPdp, toStorefrontProduct } from '../../src/server/catalog-v2/storefront.js'

const ACTOR = { actorType: 'ADMIN', actorId: '1', actorLabel: 'admin@valour.test' }
const UP = (n) => `/media/products/2/${String(n).repeat(32).slice(0, 32)}.jpg`
const rejects = (p, code) => assert.rejects(p, (e) => e.code === code)
const quiet = async (fn) => { const i = console.info; console.info = () => {}; try { return await fn() } finally { console.info = i } }

describe('pdp schema', () => {
  test('all sections and the hero subtitle are accepted; empty fields and sections are dropped', () => {
    const d = displayInfoSchema.parse({
      pdp: {
        hero: { subtitle: 'Flying Tourbillon Sapphire' },
        intro: { heading: 'Frost Silver', text: '', specs: [{ label: 'Case Material', value: 'Titanium' }] },
        movement: { heading: 'Movement', specs: [] },
        dial: { heading: '', text: '' },
      },
    })
    assert.deepEqual(d.pdp, {
      hero: { subtitle: 'Flying Tourbillon Sapphire' },
      intro: { heading: 'Frost Silver', specs: [{ label: 'Case Material', value: 'Titanium' }] },
      movement: { heading: 'Movement' },
    })
    assert.deepEqual(PDP_SECTIONS, ['hero', 'intro', 'parallax1', 'parallax2', 'movement', 'dial', 'strap'])
  })
  test('rejects unknown sections, unknown keys, spec tables where the page has none, and oversized values', () => {
    for (const pdp of [
      { footer: { heading: 'x' } },
      { intro: { heading: 'x', colour: 'red' } },
      { parallax1: { specs: [{ label: 'a', value: 'b' }] } },
      { strap: { specs: [{ label: 'a', value: 'b' }] } },
      { hero: { heading: 'x' } },
      { movement: { heading: 'x'.repeat(121) } },
      { dial: { specs: [{ label: '', value: 'b' }] } },
      { intro: { specs: Array(21).fill({ label: 'a', value: 'b' }) } },
    ]) assert.equal(displayInfoSchema.safeParse({ pdp }).success, false, JSON.stringify(pdp).slice(0, 60))
  })
  test('saving details replaces pdp but never touches section images or unknown keys', () => {
    const stored = { media: { movement: UP(1) }, pdp: { intro: { heading: 'Old' }, dial: { heading: 'Dial Finish' } }, legacy: 1 }
    const next = mergeDisplayInfo(stored, displayInfoSchema.parse({ pdp: { intro: { heading: 'New' } } }))
    assert.deepEqual(next, { media: { movement: UP(1) }, legacy: 1, pdp: { intro: { heading: 'New' } } })
    const cleared = mergeDisplayInfo(stored, displayInfoSchema.parse({ pdp: {} }))
    assert.equal(cleared.pdp, undefined, 'clearing every field removes pdp')
    assert.deepEqual(cleared.media, { movement: UP(1) })
    assert.deepEqual(pickDisplayInfo(stored).pdp, stored.pdp, 'the editor loads the saved pdp')
  })
})

describe('section image roles', () => {
  test('exactly the approved roles; set and remove keep everything else', () => {
    assert.deepEqual(MEDIA_ROLES, ['hero', 'parallax1', 'parallax2', 'introLeft', 'introRight', 'movement', 'dial', 'strapLeft', 'strapRight', 'detail'])
    const a = withMedia({ pdp: { x: 1 }, media: { hero: UP(1) } }, 'movement', UP(2))
    assert.deepEqual(a, { pdp: { x: 1 }, media: { hero: UP(1), movement: UP(2) } })
    assert.deepEqual(withMedia(a, 'hero', null), { pdp: { x: 1 }, media: { movement: UP(2) } })
    assert.deepEqual(withMedia({ media: { hero: UP(1) } }, 'hero', null), {}, 'last image removed: no empty media object')
    assert.throws(() => withMedia({}, 'footer', UP(1)))
    assert.deepEqual(readMedia({ media: { hero: UP(1), footer: '/x', movement: 5 } }), { hero: UP(1) }, 'unknown roles / bad values ignored')
  })
  test('every image a product uses is counted (orphan clean-up never deletes a section image)', () => {
    const p = { mainImage: UP(1), images: [UP(2)], additionalInfo: { media: { movement: UP(3) } } }
    assert.deepEqual(productImagePaths(p), [UP(1), UP(2), UP(3)])
    assert.equal(referencedStorageKeys([p]).size, 3)
  })
})

function productTx(over = {}) {
  const state = { row: { id: 2n, status: 'active', deletedAt: null, mainImage: UP(1), images: JSON.stringify([UP(2), UP(3)]), additionalInfo: JSON.stringify({ media: { movement: UP(4) }, pdp: { intro: { heading: 'Frost Silver' } } }), ...over }, updates: [] }
  const tx = fakeTx({
    query: (sql) => (/FROM products/.test(sql) ? [state.row] : []),
    models: { product: { update: ({ data }) => { state.updates.push(data); if (data.additionalInfo) state.row.additionalInfo = JSON.stringify(data.additionalInfo); if (data.images) state.row.images = JSON.stringify(data.images); return state.row } } },
  })
  return { tx, state }
}

describe('section image service', () => {
  test('replacing an image sets only that role; the old file is deleted only if unused', async () => {
    const { tx, state } = productTx()
    const r = await quiet(() => setSectionImage(tx, { productId: 2n, role: 'movement', path: UP(5), actor: ACTOR }))
    assert.deepEqual(r.media, { movement: UP(5) })
    assert.equal(r.removedStorageKey, '2/44444444444444444444444444444444.jpg', 'old movement file no longer used')
    const saved = state.updates.at(-1).additionalInfo
    assert.deepEqual(saved.pdp, { intro: { heading: 'Frost Silver' } }, 'section text untouched')
    assert.equal(state.updates.at(-1).images, undefined, 'gallery untouched')
  })
  test('an image still used in the gallery or another slot is never deleted', async () => {
    const { tx } = productTx({ additionalInfo: JSON.stringify({ media: { movement: UP(2), dial: UP(4), hero: UP(4) } }) })
    const a = await quiet(() => setSectionImage(tx, { productId: 2n, role: 'movement', path: null, actor: ACTOR }))
    assert.equal(a.removedStorageKey, null, 'still a gallery image')
    const b = await quiet(() => setSectionImage(tx, { productId: 2n, role: 'dial', path: null, actor: ACTOR }))
    assert.equal(b.removedStorageKey, null, 'still the hero image')
  })
  test('ownership, roles and archived products are enforced', async () => {
    await rejects(setSectionImage(productTx().tx, { productId: 2n, role: 'movement', path: '/media/products/9/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg', actor: ACTOR }), 'gallery_invalid')
    await rejects(setSectionImage(productTx().tx, { productId: 2n, role: 'movement', path: 'https://evil.example/x.jpg', actor: ACTOR }), 'gallery_invalid')
    await rejects(setSectionImage(productTx().tx, { productId: 2n, role: 'footer', path: UP(5), actor: ACTOR }), 'invalid_role')
    await rejects(setSectionImage(productTx({ status: 'inactive' }).tx, { productId: 2n, role: 'movement', path: UP(5), actor: ACTOR }), 'product_inactive')
  })
  test('deleting a gallery image that is also a section image keeps the file', async () => {
    const { tx } = productTx({ additionalInfo: JSON.stringify({ media: { parallax1: UP(2) } }) })
    const r = await quiet(() => detachImage(tx, { productId: 2n, path: UP(2), actor: ACTOR }))
    assert.equal(r.removedStorageKey, null)
  })
  test('reordering the gallery never changes section images', async () => {
    const { tx, state } = productTx()
    await quiet(() => reorderGallery(tx, { productId: 2n, order: [UP(3), UP(2)], actor: ACTOR }))
    assert.equal(state.updates.at(-1).additionalInfo, undefined)
    assert.equal(JSON.parse(state.row.additionalInfo).media.movement, UP(4))
  })
})

describe('storefront: product page content', () => {
  test('pdp is read with only real values; nothing is invented', () => {
    const pdp = readPdp({ pdp: { hero: { subtitle: 'Flying Tourbillon Sapphire' }, movement: { heading: 'Movement', text: '  ', specs: [{ label: 'Power Reserve', value: '72 Hours' }, { label: '', value: 'x' }] } } })
    assert.equal(pdp.hero.subtitle, 'Flying Tourbillon Sapphire')
    assert.equal(pdp.movement.heading, 'Movement')
    assert.equal(pdp.movement.text, null, 'blank paragraph is hidden')
    assert.deepEqual(pdp.movement.specs, [{ label: 'Power Reserve', value: '72 Hours' }])
    assert.deepEqual(pdp.dial, { heading: null, text: null, subtitle: null, specs: [] })
  })
  test('each product gets its own content', () => {
    const base = { id: 1n, name: 'A', sku: 'A', slug: 'a', type: 'watch', basePrice: '1.00', salePrice: null, trackStock: false, stock: 0, mainImage: UP(1), images: [], shortDescription: null, longDescription: null }
    const a = toStorefrontProduct({ ...base, additionalInfo: { pdp: { hero: { subtitle: 'One' } } } })
    const b = toStorefrontProduct({ ...base, id: 2n, slug: 'b', additionalInfo: { pdp: { hero: { subtitle: 'Two' } } } })
    assert.equal(a.pdp.hero.subtitle, 'One')
    assert.equal(b.pdp.hero.subtitle, 'Two')
  })
})

describe('no hard-coded product content in the product page components', () => {
  test('headings, paragraphs, specs and section images all come from the product', async () => {
    const { readFileSync, readdirSync } = await import('node:fs')
    const dir = new URL('../../src/app/our-shop/components/', import.meta.url)
    const banned = [/Flying Tourbillon/, /ipsum/i, /Nova Red/, /nova-sec-img/, /d-sec-[23]-img/, /strap-(left|right)\.png/,
      /splitWords\("(Movement|Dial Finish|About Strap)"\)/, />(Titanium|40mm|11\.2mm|Automatic Mechanical|72 Hours|Sunburst Yellow|5 Years International)</,
      /secbgImage|secTitle|futureHeading|detail1/]
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.jsx'))) {
      const code = readFileSync(new URL(file, dir), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
      for (const re of banned) assert.doesNotMatch(code, re, `${file} still contains ${re}`)
    }
  })
})

describe('strap pages and the type-specific editor', () => {
  const strap = { id: 3n, name: 'Red Strap', sku: 'P-5', slug: 'red-strap', type: 'strap', basePrice: '45.00', salePrice: null, trackStock: false, stock: 0, mainImage: UP(1), images: [UP(2), UP(3)], shortDescription: null, longDescription: 'Sailcloth' }
  test('strap hero and detail images come from their own slots, else the main image (never gallery positions)', () => {
    const plain = toStorefrontProduct({ ...strap, additionalInfo: {} })
    assert.equal(plain.heroImage, UP(1))
    assert.equal(plain.detailImage, UP(1), 'not the first gallery image any more')
    const set = toStorefrontProduct({ ...strap, additionalInfo: { media: { hero: UP(4), detail: UP(5) } } })
    assert.equal(set.heroImage, UP(4))
    assert.equal(set.detailImage, UP(5))
    const reordered = toStorefrontProduct({ ...strap, images: [UP(3), UP(2)], additionalInfo: { media: { hero: UP(4), detail: UP(5) } } })
    assert.equal(reordered.detailImage, UP(5))
  })
  test('the strap page reads the hero and detail slots; watch sections never render on strap pages', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(new URL('../../src/components/product/StrapDetail.jsx', import.meta.url), 'utf8')
    assert.match(src, /product\.heroImage \?\? product\.image/)
    assert.match(src, /product\.detailImage \?\? product\.image/)
    assert.doesNotMatch(src, /DetailSec|ParraSec|HeroSection|StrapSec/)
  })
  test('the editor shows watch cards only for watches and strap cards only for straps', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(new URL('../../src/admin/client/catalog/ProductEditorClient.jsx', import.meta.url), 'utf8')
    assert.match(src, /\{isWatch && PDP_CARDS\.map\(/)
    assert.match(src, /\{!isWatch && \(\s*<>\s*<Card title="Strap Hero"/)
    assert.match(src, /<Card title="Strap Details"/)
    assert.match(src, /sectionImage\('hero', 'Hero image'/)
    assert.match(src, /sectionImage\('detail', 'Detail image'/)
    assert.match(src, /WATCH_ONLY_DISPLAY = new Set\(\['movement', 'tagline', 'pdpSubtitle', 'accent', 'edition'\]\)/)
  })
})
