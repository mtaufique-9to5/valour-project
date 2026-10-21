// Catalog read access for admin pages. Callers must have checked permissions
// (requirePagePermission) before calling. Returns plain serializable rows.
import 'server-only'
import { db } from '../db.js'
import { toAdminRow, toInventoryRow, toOrderRow, toCustomerRow, toImageRow } from './mappers.js'
import { listQuerySchema } from './schemas.js'
import { minorToAmountString } from './money.js'

export { toAdminRow, toInventoryRow, toOrderRow, toCustomerRow, toImageRow }

const IMAGE_THUMB = { select: { role: true, position: true, source: true, url: true, storageKey: true, legacyRole: true }, orderBy: [{ role: 'asc' }, { position: 'asc' }] }

const LIST_SELECT = {
  id: true, type: true, slug: true, ref: true, name: true, subtitle: true, status: true,
  movement: true, position: true, updatedAt: true,
  collection: { select: { id: true, slug: true, name: true } },
  images: { where: { OR: [{ role: 'MAIN' }, { legacyRole: 'CARD' }] }, ...IMAGE_THUMB },
  prices: { where: { currency: 'USD' }, select: { currency: true, amountMinor: true, confirmed: true } },
  inventory: { select: { trackingMode: true, quantityOnHand: true } },
}

const SORTS = {
  position: [{ type: 'asc' }, { position: 'asc' }, { id: 'asc' }],
  name: [{ name: 'asc' }, { id: 'asc' }],
  '-name': [{ name: 'desc' }, { id: 'desc' }],
  sku: [{ ref: 'asc' }, { id: 'asc' }],
  '-sku': [{ ref: 'desc' }, { id: 'desc' }],
  newest: [{ createdAt: 'desc' }, { id: 'desc' }],
  oldest: [{ createdAt: 'asc' }, { id: 'asc' }],
}

/**
 * Server-side search / filter / pagination for the admin product list.
 * @param {{ q?: string, type?: string, status?: string, categoryId?: number, page?: number,
 *   pageSize?: number (<= 50), sort?: 'position'|'name'|'-name'|'sku'|'-sku'|'newest'|'oldest' }} [query]
 *   type/status are case-insensitive ('watch' or 'WATCH'); q matches name or SKU.
 * @returns {Promise<{ rows: object[], total: number, page: number, pageSize: number }>} rows: see toAdminRow
 */
export async function listProducts(query = {}) {
  const { q, type, status, categoryId, page, pageSize, sort } = listQuerySchema.parse(query ?? {})
  const where = {}
  if (type) where.type = type
  if (status) where.status = status
  if (categoryId) where.collectionId = categoryId
  if (q) where.OR = [{ name: { contains: q } }, { ref: { contains: q.toUpperCase() } }]
  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, select: LIST_SELECT, orderBy: SORTS[sort], skip: (page - 1) * pageSize, take: pageSize }),
  ])
  return { rows: rows.map(toAdminRow), total, page, pageSize }
}

/** Categories (collections) for the product form: [{ id, slug, name }]. */
export async function listCategories() {
  return db.collection.findMany({ select: { id: true, slug: true, name: true }, orderBy: [{ position: 'asc' }, { name: 'asc' }] })
}

/**
 * Full product for the edit page, or null.
 * Shape: toAdminRow fields plus
 * { description, legacyId, material, color, accent, limited, edition, tagline, legacyName,
 *   priceAmount ('499.99'|''), images: [{ id, url, role, position, isPrimary, width, height }] (MAIN first),
 *   content (parsed JSON|null), inventory (toInventoryRow), createdAt, updatedAt }
 */
export async function getProduct(id) {
  const productId = Number(id)
  if (!Number.isInteger(productId) || productId <= 0) return null
  const p = await db.product.findUnique({
    where: { id: productId },
    include: {
      collection: { select: { id: true, slug: true, name: true } },
      content: { select: { data: true } },
      images: {
        orderBy: [{ role: 'asc' }, { position: 'asc' }, { id: 'asc' }],
        select: { id: true, source: true, role: true, position: true, isPrimary: true, url: true, storageKey: true, width: true, height: true, legacyRole: true },
      },
      prices: { select: { currency: true, amountMinor: true, confirmed: true, updatedAt: true } },
      inventory: { select: { trackingMode: true, quantityOnHand: true, reserved: true, lowStockThreshold: true } },
    },
  })
  if (!p) return null
  let content = null
  try { content = p.content ? JSON.parse(p.content.data) : null } catch { content = null }
  const row = toAdminRow(p)
  return {
    ...row,
    description: p.description ?? null,
    priceAmount: minorToAmountString(row.amountMinor),
    legacyId: p.legacyId,
    material: p.material, color: p.color, accent: p.accent, limited: p.limited,
    edition: p.edition, tagline: p.tagline, legacyName: p.legacyName,
    images: p.images.map(toImageRow),
    content,
    inventory: toInventoryRow(p),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}

export async function listInventory() {
  const rows = await db.product.findMany({
    where: { status: { not: 'ARCHIVED' } },
    select: {
      id: true, type: true, name: true, ref: true,
      images: { where: { OR: [{ role: 'MAIN' }, { legacyRole: 'CARD' }] }, ...IMAGE_THUMB },
      inventory: { select: { trackingMode: true, quantityOnHand: true, reserved: true, lowStockThreshold: true } },
    },
    orderBy: [{ type: 'asc' }, { position: 'asc' }],
  })
  return rows.map(toInventoryRow)
}

export async function listOrders({ take = 200 } = {}) {
  const rows = await db.order.findMany({
    select: {
      id: true, number: true, status: true, placedAt: true, totalMinor: true,
      customer: { select: { name: true, email: true } },
      items: { select: { quantity: true } },
    },
    orderBy: { placedAt: 'desc' },
    take: Math.min(Math.max(1, Number(take) || 200), 500),
  })
  return rows.map(toOrderRow)
}

export async function listCustomers({ take = 200 } = {}) {
  const rows = await db.customer.findMany({
    select: {
      id: true, name: true, email: true,
      orders: { select: { status: true, totalMinor: true, placedAt: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(1, Number(take) || 200), 500),
  })
  return rows.map(toCustomerRow)
}
