import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as catalog from '../../src/data/catalog.js'
import { buildCatalogPlan, checkParity } from '../../src/server/catalog/seed-plan.js'

const plan = buildCatalogPlan(catalog)

test('plan counts match catalog.js', () => {
  assert.equal(plan.counts.products, 13)
  assert.equal(plan.counts.pricedConfirmed, 12)
  assert.equal(plan.counts.unpricedDrafts, 1)
  assert.equal(plan.counts.active, 12)
  assert.equal(plan.counts.images, 66)
  assert.equal(plan.counts.customizerOptions, 26)
  assert.equal(plan.counts.inventoryAdjustments, 0)
})

test('prices come only from CONFIRMED_PRICES; custom watch has no ref or price', () => {
  for (const p of plan.products) {
    const expected = p.kind === 'custom' ? catalog.getUnitPrice('custom', catalog.customWatch.id) : catalog.getUnitPrice(p.kind, p.data.legacyId)
    assert.equal(p.price.amountMinor, expected === null ? null : expected * 100, p.data.slug)
    assert.equal(p.price.confirmed, expected !== null)
  }
  const custom = plan.products.find((p) => p.kind === 'custom')
  assert.equal(custom.data.ref, null)
  assert.equal(custom.price.amountMinor, null)
  assert.equal(custom.data.status, 'DRAFT')
  for (const p of plan.products) if (p.data.status === 'ACTIVE') assert.ok(p.price.amountMinor > 0, p.data.slug)
})

test('images: STATIC, exactly one MAIN per product, legacy roles kept in order', () => {
  for (const p of plan.products) {
    assert.ok(p.images.every((i) => i.source === 'STATIC' && i.url.startsWith('/images/')))
    if (p.images.length) assert.equal(p.images.filter((i) => i.role === 'MAIN' && i.isPrimary).length, 1, p.data.slug)
    assert.ok(p.images.filter((i) => i.role === 'GALLERY').length <= 12)
  }
  const w = catalog.getProductsByType('watch')[0]
  const imgs = plan.products.find((p) => p.kind === 'watch').images
  assert.equal(imgs.find((i) => i.role === 'MAIN').url, w.mainImage)
  const gallery = imgs.filter((i) => i.role === 'GALLERY').sort((a, b) => a.position - b.position)
  assert.deepEqual(gallery.map((i) => i.legacyRole).slice(0, 3), ['CARD', 'SECONDARY', 'SECONDARY'])
  assert.deepEqual(gallery.filter((i) => i.legacyRole === 'THUMBNAIL').map((i) => i.url), w.thumbnails.map((t) => t.img))
  const strap = plan.products.find((p) => p.kind === 'strap').images
  assert.deepEqual(strap.map((i) => [i.role, i.legacyRole]), [['MAIN', 'CARD']])
})

test('inventory: NOT_TRACKED, no stock invented', () => {
  for (const p of plan.products) assert.deepEqual(p.inventory, { trackingMode: 'NOT_TRACKED', quantityOnHand: null, reserved: 0, lowStockThreshold: null })
})

test('straps get shared content copied; three defaults flagged', () => {
  for (const s of plan.products.filter((p) => p.kind === 'strap')) assert.equal(s.content.description, catalog.STRAP_DESCRIPTION)
  assert.equal(plan.customizerOptions.filter((o) => o.isDefault).length, 3)
})

// Simulated rows read back after a faithful import.
const dbRows = () => ({
  products: plan.products.map((p) => ({
    type: p.data.type, legacyId: p.data.legacyId, slug: p.data.slug, ref: p.data.ref, name: p.data.name, status: p.data.status,
    prices: [{ currency: 'USD', amountMinor: p.price.amountMinor, confirmed: p.price.confirmed }],
    inventory: { quantityOnHand: null },
  })),
  customizerOptions: plan.customizerOptions.map((o) => ({ part: o.part, optionId: o.optionId })),
})

test('parity passes for a faithful import and catches mismatches', () => {
  assert.deepEqual(checkParity(catalog, dbRows()), [])
  const bad = dbRows()
  bad.products[0].prices[0].amountMinor = 50000
  bad.products[7].slug = 'wrong'
  bad.customizerOptions.pop()
  const errs = checkParity(catalog, bad)
  assert.equal(errs.length, 4, errs.join('\n')) // price, slug, missing option, option count
})
