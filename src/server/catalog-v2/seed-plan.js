// Pure seed plan for the approved schema (no DB; unit tested). Used by
// scripts/db/seed-v2.mjs AFTER the replacement migration.
// - Website role: Customer only (U5).
// - Setting store_currency = USD (SC-10).
// - Customizer options from catalog.js, active, with the storefront's defaults (SC-8).
// - Products: only those with a CONFIRMED price (getUnitPrice); stock is never
//   invented (track_stock FALSE, stock 0); every product starts as draft (SC-5),
//   so nothing is published by the seed. The custom watch is not created until
//   its price is confirmed.
import { watchImages, strapImages } from '../catalog/seed-plan.js'
import { OPTION_KEY_RE } from '../commerce/custom-options.js'

export const WEBSITE_ROLES = Object.freeze(['Customer'])
export const SETTINGS = Object.freeze([
  { key: 'store_currency', type: 'currency', value: 'USD', isPublic: true },
])

const PARTS = [['case', 'caseId'], ['dial', 'dialId'], ['strap', 'strapId']]
const centsToAmount = (dollars) => {
  const cents = Math.round(dollars * 100)
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

/** Presentation fields kept in products.additional_info until the storefront phase decides their final home. */
function additionalInfo(p) {
  const pick = ['subtitle', 'collection', 'movement', 'material', 'color', 'tagline', 'limited', 'edition', 'accent', 'pdpSubtitle', 'specs', 'editions']
  const out = {}
  for (const k of pick) if (p[k] !== undefined && p[k] !== null) out[k] = p[k]
  return Object.keys(out).length ? out : null
}

export function buildSeedPlanV2(c) {
  const customizerOptions = []
  for (const [part, field] of PARTS) {
    const list = c.customizerOptions[part] ?? []
    list.forEach((o, i) => {
      if (!OPTION_KEY_RE.test(o.id)) throw new Error(`Invalid customizer option key "${o.id}" (${part})`)
      customizerOptions.push({
        part, optionKey: o.id, name: o.name, image: o.image, sortOrder: i, status: 'active',
        isDefault: c.DEFAULT_CUSTOM_OPTIONS[field] === o.id,
      })
    })
    if (customizerOptions.filter((o) => o.part === part && o.isDefault).length !== 1) {
      throw new Error(`Customizer part ${part} must have exactly one default`)
    }
  }

  const products = []
  const skipped = []
  for (const p of c.products) {
    const price = c.getUnitPrice(p.type, p.productId)
    if (!Number.isFinite(price) || price <= 0) { skipped.push({ key: p.key, reason: 'no confirmed price' }); continue }
    const images = (p.type === 'watch' ? watchImages(p) : strapImages(p)).map((i) => i.url)
    const [mainImage, ...gallery] = [...new Set(images)]
    products.push({
      sku: p.ref,
      slug: p.slug,
      name: p.name,
      type: p.type,
      basePrice: centsToAmount(price),
      salePrice: null,
      trackStock: false,
      stock: 0,
      mainImage: mainImage ?? null,
      images: gallery,
      shortDescription: p.type === 'strap' ? (c.STRAP_DESCRIPTION ?? null) : (p.detail1 ?? null),
      additionalInfo: additionalInfo(p),
      status: 'draft',
      isFeatured: false,
      legacyKey: p.key,
    })
  }
  for (const field of ['sku', 'slug']) {
    const seen = new Set()
    for (const p of products) {
      if (seen.has(p[field])) throw new Error(`Duplicate ${field} "${p[field]}" in seed plan`)
      seen.add(p[field])
    }
  }
  skipped.push({ key: c.customWatch?.id ?? 'custom-watch', reason: 'no confirmed price' })

  return {
    roles: WEBSITE_ROLES,
    settings: SETTINGS,
    customizerOptions,
    products,
    skipped,
    counts: { customizerOptions: customizerOptions.length, products: products.length, skipped: skipped.length },
  }
}
