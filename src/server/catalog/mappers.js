// Pure DB-row -> admin view-row mappers (no Prisma import; unit tested).
// Prices: dollars (number), or null only for a legacy DRAFT without a price.
// Stock: null = not tracked.
import { minorToDollars, CURRENCY } from './money.js'
import { imageUrl } from './image-rules.js'

const cap = (s) => (s ? s[0] + s.slice(1).toLowerCase() : '')
const iso = (d) => (d instanceof Date ? d.toISOString() : d ?? null)

/** Current confirmed USD price in dollars, or null. */
export function currentPrice(prices) {
  const p = (prices ?? []).find((x) => x.currency === CURRENCY)
  return p && p.confirmed && Number.isInteger(p.amountMinor) ? minorToDollars(p.amountMinor) : null
}

// List thumbnail: the legacy card image (catalog.js `image`) when present,
// otherwise the MAIN image, otherwise the first image.
function cardImage(images) {
  const list = images ?? []
  const pick = list.find((i) => i.legacyRole === 'CARD') ?? list.find((i) => i.role === 'MAIN') ?? list[0]
  return pick ? imageUrl(pick.source ? pick : { ...pick, source: 'STATIC' }) : null
}

/** Admin image view: { id, url, role: 'MAIN'|'GALLERY', position, isPrimary, width, height }. */
export function toImageRow(img) {
  return {
    id: img.id,
    url: imageUrl(img),
    role: img.role,
    position: img.position,
    isPrimary: Boolean(img.isPrimary),
    width: img.width ?? null,
    height: img.height ?? null,
  }
}

/**
 * Product list row (listProducts().rows[i]):
 * {
 *   id, name, ref, sku (= ref), subtitle, collection (slug|null),
 *   category: { id, name } | null, movement, image (url|null),
 *   price (dollars|null), amountMinor (int|null), currency: 'USD',
 *   status: 'Draft'|'Active'|'Archived', statusCode: 'DRAFT'|'ACTIVE'|'ARCHIVED',
 *   slug, type: 'watch'|'strap'|'custom', typeCode: 'WATCH'|'STRAP'|'CUSTOM',
 *   trackingMode: 'TRACKED'|'NOT_TRACKED', quantity (int|null), updatedAt (ISO|null)
 * }
 */
export function toAdminRow(p) {
  const priceRow = (p.prices ?? []).find((x) => x.currency === CURRENCY)
  const amountMinor = priceRow && priceRow.confirmed && Number.isInteger(priceRow.amountMinor) ? priceRow.amountMinor : null
  const inv = p.inventory ?? null
  return {
    id: p.id,
    name: p.name,
    ref: p.ref ?? null,
    sku: p.ref ?? null,
    subtitle: p.subtitle ?? null,
    collection: p.collection?.slug ?? null,
    category: p.collection?.id ? { id: p.collection.id, name: p.collection.name ?? p.collection.slug } : null,
    movement: p.movement ?? null,
    image: cardImage(p.images),
    price: minorToDollars(amountMinor),
    amountMinor,
    currency: CURRENCY,
    status: cap(p.status),
    statusCode: p.status,
    slug: p.slug,
    type: String(p.type).toLowerCase(),
    typeCode: p.type,
    trackingMode: inv?.trackingMode ?? 'NOT_TRACKED',
    quantity: inv?.trackingMode === 'TRACKED' && Number.isInteger(inv.quantityOnHand) ? inv.quantityOnHand : null,
    updatedAt: iso(p.updatedAt),
  }
}

export function stockStatus(available, reorderPoint) {
  if (available === null) return 'Not tracked'
  if (available <= 0) return 'Out of stock'
  if (reorderPoint !== null && available <= reorderPoint) return 'Low stock'
  return 'In stock'
}

// InventoryView row: { id, name, ref, type, image, trackingMode, onHand, reserved, available, reorderPoint, status }
export function toInventoryRow(p) {
  const inv = p.inventory ?? null
  const trackingMode = inv?.trackingMode ?? (Number.isInteger(inv?.quantityOnHand) ? 'TRACKED' : 'NOT_TRACKED')
  const onHand = trackingMode === 'TRACKED' && Number.isInteger(inv?.quantityOnHand) ? inv.quantityOnHand : null
  const reserved = inv?.reserved ?? 0
  const reorderPoint = Number.isInteger(inv?.lowStockThreshold) ? inv.lowStockThreshold : null
  const available = onHand === null ? null : onHand - reserved
  return {
    id: p.id,
    name: p.name,
    ref: p.ref ?? null,
    type: String(p.type).toLowerCase(),
    image: cardImage(p.images),
    trackingMode,
    onHand,
    reserved,
    available,
    reorderPoint,
    status: stockStatus(available, reorderPoint),
  }
}

// DB OrderStatus -> OrdersView status / payment labels.
const ORDER_STATUS = { PENDING: 'Pending', PAID: 'Processing', FULFILLED: 'Shipped', CANCELLED: 'Cancelled', REFUNDED: 'Cancelled' }
const PAYMENT_STATUS = { PENDING: 'Pending', PAID: 'Paid', FULFILLED: 'Paid', CANCELLED: 'Cancelled', REFUNDED: 'Refunded' }
const SPENT_STATUSES = new Set(['PAID', 'FULFILLED'])

// OrdersView row: { id, customer, email, date, status, payment, itemCount, total }
export function toOrderRow(o) {
  return {
    id: o.number,
    dbId: o.id,
    customer: o.customer?.name || o.customer?.email || 'Guest',
    email: o.customer?.email ?? null,
    date: iso(o.placedAt),
    status: ORDER_STATUS[o.status] ?? cap(o.status),
    payment: PAYMENT_STATUS[o.status] ?? 'Pending',
    itemCount: (o.items ?? []).reduce((n, i) => n + (i.quantity ?? 0), 0),
    total: minorToDollars(o.totalMinor),
  }
}

// CustomersView row: { id, name, email, orders, spent, lastOrder, status }
export function toCustomerRow(c) {
  const orders = c.orders ?? []
  const spentMinor = orders.filter((o) => SPENT_STATUSES.has(o.status)).reduce((s, o) => s + o.totalMinor, 0)
  const last = orders.reduce((d, o) => (!d || o.placedAt > d ? o.placedAt : d), null)
  return {
    id: c.id,
    name: c.name || c.email,
    email: c.email,
    orders: orders.length,
    spent: minorToDollars(spentMinor),
    lastOrder: iso(last),
    status: orders.length > 0 ? 'Active' : 'Pending',
  }
}
