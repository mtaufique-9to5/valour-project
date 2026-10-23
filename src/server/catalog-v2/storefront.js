// Public product data for the storefront. The database is the only source of
// products (owner decision): only `status = active`, not soft-deleted watches
// and straps from `products` are ever returned. Read on every request (pages
// are dynamic), so admin changes show on the next page load. src/data/catalog.js
// is no longer used for products.
import 'server-only'
import { cache } from 'react'
import { toMinor } from '../commerce/money.js'
import { PDP_SECTIONS, readAdditionalInfo, readMedia } from './display-info.js'
import { readGallery } from './gallery-rules.js'

const PUBLIC_TYPES = ['watch', 'strap']
const dollars = (dec) => (dec == null ? null : toMinor(dec) / 100)

/** additional_info.pdp -> every section present, with only real values (empty ones absent). */
export function readPdp(info) {
  const pdp = info.pdp && typeof info.pdp === 'object' ? info.pdp : {}
  const out = {}
  for (const key of PDP_SECTIONS) {
    const sec = pdp[key] && typeof pdp[key] === 'object' ? pdp[key] : {}
    out[key] = {
      heading: typeof sec.heading === 'string' && sec.heading.trim() ? sec.heading : null,
      text: typeof sec.text === 'string' && sec.text.trim() ? sec.text : null,
      subtitle: typeof sec.subtitle === 'string' && sec.subtitle.trim() ? sec.subtitle : null,
      specs: Array.isArray(sec.specs) ? sec.specs.filter((r) => r?.label && r?.value) : [],
    }
  }
  return out
}

/** Database row -> the product shape the storefront components already use. */
export function toStorefrontProduct(p) {
  const info = readAdditionalInfo(p.additionalInfo)
  const gallery = readGallery(p.images)
  const main = p.mainImage ?? gallery[0] ?? null
  const media = readMedia(info)
  const sale = dollars(p.salePrice)
  const base = dollars(p.basePrice)
  return {
    source: 'db',
    key: `product:${p.id}`,
    kind: 'product', // cart identity: never collides with static watch:N / strap:N
    productId: String(p.id),
    id: `db-${p.id}`,
    type: p.type,
    name: p.name,
    ref: p.sku,
    sku: p.sku,
    slug: p.slug,
    image: main,
    // Watch page images come only from their dedicated roles (additional_info.media),
    // never from gallery positions. The hero falls back to the product's own main
    // image so the first screen is never empty; other section images are hidden when unset.
    heroImage: media.hero ?? main,
    // Strap page: the large image of the details section (its own slot, else the main image).
    detailImage: media.detail ?? main,
    sectionImages: media,
    images: [main, ...gallery].filter(Boolean),
    // Product page content (headings, paragraphs, spec tables); empty values are null / [].
    pdp: readPdp(info),
    shortDescription: p.shortDescription ?? '',
    longDescription: p.longDescription ?? '',
    subtitle: info.subtitle ?? '',
    collection: info.collection ?? null,
    movement: info.movement ?? null,
    material: info.material ?? null,
    color: info.color ?? '',
    accent: info.accent,
    tagline: info.tagline ?? null,
    pdpSubtitle: info.pdpSubtitle ?? null,
    limited: Boolean(info.limited),
    edition: info.edition ?? null,
    editions: info.editions ?? [],
    specs: info.specs ?? [],
    price: sale ?? base,
    compareAtPrice: sale != null && base != null && sale < base ? base : null,
    trackStock: p.trackStock,
    available: !p.trackStock || p.stock > 0,
  }
}

const loadPublished = cache(async () => {
  const { db } = await import('../db.js') // loaded lazily so the pure helpers are testable without a database
  const rows = await db.product.findMany({
    where: { status: 'active', deletedAt: null, type: { in: PUBLIC_TYPES } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows.map(toStorefrontProduct)
})

/** Published products for this request: { list, bySlug }. */
export const getStorefrontCatalog = cache(async () => {
  const list = await loadPublished()
  return { list, bySlug: new Map(list.map((p) => [p.slug, p])) }
})

export async function listStorefrontProducts(type) {
  const { list } = await getStorefrontCatalog()
  return type ? list.filter((p) => p.type === type) : list
}

export async function getStorefrontProduct(slug) {
  if (typeof slug !== 'string' || slug.length > 255) return null
  return (await getStorefrontCatalog()).bySlug.get(slug) ?? null
}

/** The next `count` products of the same type after this one, wrapping around (as before). */
export async function getRelatedStorefrontProducts(product, count = 4) {
  const same = await listStorefrontProducts(product.type)
  const i = same.findIndex((p) => p.key === product.key)
  if (i === -1) return []
  return [...same.slice(i + 1), ...same.slice(0, i)].slice(0, count)
}

/**
 * Cart summaries for published database products (public endpoint). Unknown,
 * draft, archived or deleted ids are simply absent.
 */
export async function getCartSummaries(ids) {
  const { list } = await getStorefrontCatalog()
  const wanted = new Set(ids.map(String))
  const out = {}
  for (const p of list) {
    if (p.source === 'db' && wanted.has(p.productId)) {
      out[p.productId] = { name: p.name, slug: p.slug, image: p.image, type: p.type, price: p.price, compareAtPrice: p.compareAtPrice, available: p.available }
    }
  }
  return out
}
