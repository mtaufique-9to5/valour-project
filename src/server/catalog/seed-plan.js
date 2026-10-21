// Pure catalog import plan + parity check (no DB). Used by
// scripts/db/seed-catalog.mjs and its unit tests. Prices come ONLY from
// getUnitPrice() (CONFIRMED_PRICES); stock is never invented (NOT_TRACKED,
// quantityOnHand null). Products without a confirmed price are imported as DRAFT
// (they cannot be ACTIVE without a price). Images stay static public/ paths
// (source STATIC) with their catalog.js slot kept in legacyRole.

const TYPE = { watch: 'WATCH', strap: 'STRAP', custom: 'CUSTOM' }
const UNTRACKED = Object.freeze({ trackingMode: 'NOT_TRACKED', quantityOnHand: null, reserved: 0, lowStockThreshold: null })
const toMinor = (dollars) => (Number.isFinite(dollars) ? Math.round(dollars * 100) : null)

function watchContent(w) {
  return {
    pdpSubtitle: w.pdpSubtitle ?? null,
    futureHeading: w.futureHeading ?? null,
    secTitle: w.secTitle ?? null,
    detail1: w.detail1 ?? null,
    description: w.description ?? [],
    editions: w.editions ?? [],
    specs: w.specs ?? [],
  }
}

// Image slots: mainImage -> MAIN (primary). Everything else -> GALLERY in
// catalog order (image, secbgImage, secbgImage3, thumbnails[]). legacyRole keeps
// CARD / MAIN / SECONDARY / THUMBNAIL; order within a legacyRole = gallery order.
const img = (role, position, url, legacyRole) => ({ source: 'STATIC', role, isPrimary: role === 'MAIN', position, url, legacyRole })

export function watchImages(w) {
  const out = []
  if (w.mainImage) out.push(img('MAIN', 0, w.mainImage, 'MAIN'))
  const gallery = []
  if (w.image) gallery.push([w.image, 'CARD'])
  if (w.secbgImage) gallery.push([w.secbgImage, 'SECONDARY'])
  if (w.secbgImage3) gallery.push([w.secbgImage3, 'SECONDARY'])
  for (const t of w.thumbnails ?? []) gallery.push([t.img, 'THUMBNAIL'])
  gallery.forEach(([url, legacy], i) => out.push(img(out.length === 0 && i === 0 ? 'MAIN' : 'GALLERY', i, url, legacy)))
  return out
}

/** Straps have a single catalog image: it becomes the MAIN image (legacyRole CARD). */
export function strapImages(s) {
  return s.image ? [img('MAIN', 0, s.image, 'CARD')] : []
}

/**
 * @param {object} c the src/data/catalog.js module namespace
 * @returns {{ collections, products, customizerOptions, counts }}
 */
export function buildCatalogPlan(c) {
  const watches = c.getProductsByType('watch')
  const straps = c.getProductsByType('strap')

  const collections = []
  for (const w of watches) {
    if (w.collection && !collections.some((x) => x.slug === w.collection)) {
      collections.push({ slug: w.collection, name: w.subtitle ?? w.collection, position: collections.length })
    }
  }

  const priced = (kind, legacyId) => {
    const amountMinor = toMinor(c.getUnitPrice(kind, legacyId))
    return { currency: 'USD', amountMinor, confirmed: amountMinor !== null }
  }

  const products = [
    ...watches.map((w, i) => ({
      kind: 'watch',
      data: {
        type: TYPE.watch, legacyId: w.id, slug: w.slug, ref: w.ref, name: w.name,
        legacyName: w.legacyName ?? null, subtitle: w.subtitle ?? null, status: 'ACTIVE', position: i,
        movement: w.movement ?? null, material: w.material ?? null, color: w.color ?? null,
        accent: w.accent ?? null, limited: Boolean(w.limited), edition: w.edition ?? null, tagline: w.tagline ?? null,
      },
      collectionSlug: w.collection ?? null,
      content: watchContent(w),
      images: watchImages(w),
      price: priced('watch', w.id),
      inventory: UNTRACKED,
    })),
    ...straps.map((s, i) => ({
      kind: 'strap',
      data: {
        type: TYPE.strap, legacyId: s.id, slug: s.slug, ref: s.ref, name: s.name,
        legacyName: null, subtitle: null, status: 'ACTIVE', position: i,
        movement: null, material: null, color: s.color ?? null,
        accent: null, limited: false, edition: null, tagline: null,
      },
      collectionSlug: null,
      content: { description: c.STRAP_DESCRIPTION, specs: c.STRAP_SPECS },
      images: strapImages(s),
      price: priced('strap', s.id),
      inventory: UNTRACKED,
    })),
    {
      kind: 'custom',
      data: {
        type: TYPE.custom, legacyId: null, slug: c.customWatch.id, ref: c.customWatch.ref ?? null,
        name: c.customWatch.name, legacyName: null, subtitle: null, status: 'DRAFT', position: 0,
        movement: null, material: null, color: null, accent: null, limited: false, edition: null, tagline: null,
      },
      collectionSlug: null,
      content: {},
      images: [],
      // Price lookup uses the catalog id ("custom-watch"); CONFIRMED_PRICES.custom is empty -> null.
      price: priced('custom', c.customWatch.id),
      inventory: UNTRACKED,
    },
  ]
  // No product may be ACTIVE without a confirmed price.
  for (const p of products) if (p.price.amountMinor === null) p.data.status = 'DRAFT'

  const defaults = { case: c.DEFAULT_CUSTOM_OPTIONS.caseId, dial: c.DEFAULT_CUSTOM_OPTIONS.dialId, strap: c.DEFAULT_CUSTOM_OPTIONS.strapId }
  const customizerOptions = []
  for (const part of ['case', 'dial', 'strap']) {
    c.customizerOptions[part].forEach((o, i) =>
      customizerOptions.push({
        part: part.toUpperCase(), optionId: o.id, name: o.name, imageUrl: o.image,
        position: i, isDefault: o.id === defaults[part], active: true,
      }))
  }

  const counts = {
    collections: collections.length,
    products: products.length,
    watches: watches.length,
    straps: straps.length,
    custom: 1,
    contents: products.length,
    images: products.reduce((n, p) => n + p.images.length, 0),
    prices: products.length,
    pricedConfirmed: products.filter((p) => p.price.amountMinor !== null).length,
    unpricedDrafts: products.filter((p) => p.price.amountMinor === null).length,
    active: products.filter((p) => p.data.status === 'ACTIVE').length,
    drafts: products.filter((p) => p.data.status === 'DRAFT').length,
    inventoryRows: products.length,
    inventoryAdjustments: 0,
    customizerOptions: customizerOptions.length,
    customers: 0,
    orders: 0,
  }
  return { collections, products, customizerOptions, counts }
}

/**
 * Compare DB rows with catalog.js. Returns a list of mismatch strings (empty = parity).
 * @param {{ products: Array, customizerOptions: Array }} db rows as read back
 *   (products include type, legacyId, slug, ref, name, prices[], inventory, images[])
 */
export function checkParity(c, db) {
  const errs = []
  const byKey = new Map(db.products.map((p) => [`${p.type}:${p.legacyId ?? p.slug}`, p]))
  const usd = (p) => (p.prices ?? []).find((x) => x.currency === 'USD')

  const expectOne = (key, kind, item, expectedRef) => {
    const row = byKey.get(key)
    if (!row) return errs.push(`missing product ${key}`)
    if (row.slug !== item.slug && !(kind === 'custom' && row.slug === item.id)) errs.push(`${key}: slug ${row.slug} != ${item.slug ?? item.id}`)
    if ((row.ref ?? null) !== (expectedRef ?? null)) errs.push(`${key}: ref ${row.ref} != ${expectedRef}`)
    if (row.name !== item.name) errs.push(`${key}: name differs`)
    const expected = kind === 'custom' ? c.getUnitPrice('custom', item.id) : c.getProductPrice(item)
    const p = usd(row)
    const actual = p && p.confirmed && Number.isInteger(p.amountMinor) ? p.amountMinor / 100 : null
    if (actual !== expected) errs.push(`${key}: price ${actual} != ${expected}`)
    if (!row.inventory) errs.push(`${key}: missing inventory row`)
    if (row.status === 'ACTIVE' && actual === null) errs.push(`${key}: ACTIVE without a price`)
  }

  for (const p of c.products) expectOne(`${p.type.toUpperCase()}:${p.productId}`, p.type, p, p.ref)
  expectOne(`CUSTOM:${c.customWatch.id}`, 'custom', c.customWatch, c.customWatch.ref ?? null)

  const expectedCount = c.products.length + 1
  if (db.products.length !== expectedCount) errs.push(`product count ${db.products.length} != ${expectedCount}`)

  const optKeys = new Set(db.customizerOptions.map((o) => `${o.part}:${o.optionId}`))
  let optCount = 0
  for (const part of ['case', 'dial', 'strap']) {
    for (const o of c.customizerOptions[part]) {
      optCount++
      if (!optKeys.has(`${part.toUpperCase()}:${o.id}`)) errs.push(`missing option ${part}:${o.id}`)
    }
  }
  if (db.customizerOptions.length !== optCount) errs.push(`option count ${db.customizerOptions.length} != ${optCount}`)
  return errs
}
