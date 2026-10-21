// Catalog rows for the admin views. Names, images and prices come from the
// real src/data/catalog.js (prices only from CONFIRMED_PRICES). Stock levels
// and content entries do not exist yet: MOCK_ values below are samples.

import { getProductPrice, straps, watches } from '@/data/catalog'

const toRow = (p) => ({
  id: p.key,
  productId: p.productId,
  type: p.type,
  name: p.name,
  slug: p.slug,
  ref: p.ref,
  subtitle: p.subtitle ?? (p.type === 'strap' ? 'Strap' : ''),
  collection: p.collection ?? null,
  movement: p.movement ?? null,
  image: p.image,
  images: p.thumbnails?.map((t) => t.img) ?? p.images ?? [p.image],
  price: getProductPrice(p), // null = no confirmed price (shown as "No price")
  status: 'Published',
})

export const CATALOG_WATCHES = watches.map(toRow)
export const CATALOG_STRAPS = straps.map(toRow)
export const CATALOG_PRODUCTS = [...CATALOG_WATCHES, ...CATALOG_STRAPS]

// Sample stock levels, keyed by product key.
const MOCK_STOCK_LEVELS = [14, 3, 0, 22, 7, 9, 40, 35, 2, 18, 0, 26]
export const MOCK_INVENTORY = CATALOG_PRODUCTS.map((p, i) => {
  const onHand = MOCK_STOCK_LEVELS[i % MOCK_STOCK_LEVELS.length]
  const reserved = onHand > 4 ? 1 : 0
  return {
    id: p.id,
    name: p.name,
    ref: p.ref,
    type: p.type,
    image: p.image,
    onHand,
    reserved,
    available: onHand - reserved,
    reorderPoint: p.type === 'watch' ? 5 : 10,
    status: onHand === 0 ? 'Out of stock' : onHand - reserved <= (p.type === 'watch' ? 5 : 10) ? 'Low stock' : 'In stock',
  }
})

export const MOCK_CONTENT = [
  { id: 'c1', title: 'Homepage hero', type: 'Section', status: 'Published', updated: '2026-10-17', author: 'editor@example.com' },
  { id: 'c2', title: 'About — Our story', type: 'Page', status: 'Published', updated: '2026-10-02', author: 'editor@example.com' },
  { id: 'c3', title: 'Shipping & returns', type: 'Page', status: 'Draft', updated: '2026-10-11', author: 'manager@example.com' },
  { id: 'c4', title: 'Lucent Collection launch', type: 'Blog post', status: 'Scheduled', updated: '2026-10-18', author: 'editor@example.com' },
  { id: 'c5', title: 'Strap care guide', type: 'Blog post', status: 'Draft', updated: '2026-09-29', author: 'editor@example.com' },
]

export const MOCK_SETTINGS = {
  storeName: 'VALOUR',
  supportEmail: 'support@example.com',
  currency: 'USD',
  timezone: 'UTC',
  sessionTimeoutMinutes: 30,
  requireMfa: true,
  maintenanceMode: false,
  orderEmails: true,
  lowStockAlerts: true,
}

// ---------------------------------------------------------------------------
// Product-admin shapes (getProduct / listProducts contract) for the design
// preview. Names, images and prices are the real catalog values; SKUs are the
// catalog refs; quantities are the MOCK_ stock samples above. Products without
// a confirmed price are shown as legacy drafts (never "Price on request").
export const MOCK_CATEGORIES = [...new Set(CATALOG_WATCHES.map((w) => w.collection).filter(Boolean))].map((c) => ({
  id: c,
  name: c[0].toUpperCase() + c.slice(1),
}))

export const MOCK_PRODUCTS = CATALOG_PRODUCTS.map((p, i) => ({
  id: p.id,
  name: p.name,
  description: p.subtitle ?? '',
  sku: String(p.ref ?? p.id).toUpperCase().replace(/[^A-Z0-9-]/g, '-'),
  categoryId: p.collection ?? null,
  type: p.type === 'strap' ? 'STRAP' : 'WATCH',
  status: p.price == null ? 'DRAFT' : 'ACTIVE',
  price: p.price,
  currency: 'USD',
  trackingMode: p.type === 'strap' && i % 2 ? 'NOT_TRACKED' : 'TRACKED',
  quantity: p.type === 'strap' && i % 2 ? null : MOCK_INVENTORY[i]?.onHand ?? 0,
  slug: p.slug,
  images: [...new Set(p.images ?? [p.image])].filter(Boolean).slice(0, 6).map((url, n) => ({
    id: `${p.id}-img-${n}`,
    url,
    role: n === 0 ? 'MAIN' : 'GALLERY',
    position: n,
    isPrimary: n === 0,
    width: null,
    height: null,
  })),
}))
