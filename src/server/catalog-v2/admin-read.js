// Admin read access to `products` (Revision 3). Callers have checked the admin
// session. Returns plain, serialisable rows in the shapes the existing admin
// views expect (ProductsView, PricingView, InventoryView, the product editor),
// so the views themselves stay unchanged.
import 'server-only'
import { toAmount, toMinor } from '../commerce/money.js'
import { pickDisplayInfo, readMedia } from './display-info.js'
import { readGallery } from './gallery-rules.js'

// DB status <-> the labels the existing views use (inactive is shown as Archived).
export const STATUS_TO_VIEW = { draft: 'DRAFT', active: 'ACTIVE', inactive: 'ARCHIVED' }
export const VIEW_TO_STATUS = { DRAFT: 'draft', ACTIVE: 'active', ARCHIVED: 'inactive' }
export const TYPE_TO_VIEW = { watch: 'WATCH', strap: 'STRAP', custom: 'CUSTOM' }

const LIST_SELECT = {
  id: true, name: true, sku: true, slug: true, type: true, status: true, basePrice: true, salePrice: true,
  trackStock: true, stock: true, mainImage: true, isFeatured: true, updatedAt: true, categoryId: true,
  category: { select: { name: true } },
}

const dollars = (dec) => (dec == null ? null : toMinor(dec) / 100)
// Prisma returns e.g. Decimal('1500'); show it as '1500.00' in price fields.
const amount = (dec) => (dec == null ? '' : toAmount(toMinor(dec)))
// No low-stock threshold exists in the schema or business rules, so only empty vs available.
const stockStatus = (p) => (!p.trackStock ? 'Not tracked' : p.stock === 0 ? 'Out of stock' : 'In stock')

export function toListRow(p) {
  return {
    id: String(p.id),
    name: p.name,
    sku: p.sku,
    ref: p.sku,
    slug: p.slug,
    type: TYPE_TO_VIEW[p.type],
    status: STATUS_TO_VIEW[p.status],
    image: p.mainImage,
    categoryId: p.categoryId == null ? null : String(p.categoryId),
    categoryName: p.category?.name ?? null,
    price: dollars(p.salePrice ?? p.basePrice),
    basePrice: amount(p.basePrice),
    salePrice: amount(p.salePrice),
    trackingMode: p.trackStock ? 'TRACKED' : 'NOT_TRACKED',
    quantity: p.trackStock ? p.stock : null,
    onHand: p.trackStock ? p.stock : null,
    reserved: 0,
    available: p.trackStock ? p.stock : null,
    reorderPoint: null,
    stockStatus: stockStatus(p),
    stockValue: p.stock,
    featured: p.isFeatured,
    updatedAt: p.updatedAt.toISOString(),
  }
}

/** Filtered, paginated product list (soft-deleted rows excluded). */
export async function listProducts(db, { q = '', type = '', status = '', category = '', page = 1, pageSize = 20 } = {}) {
  const where = { deletedAt: null }
  if (type && TYPE_TO_VIEW[type.toLowerCase()]) where.type = type.toLowerCase()
  if (status && VIEW_TO_STATUS[status]) where.status = VIEW_TO_STATUS[status]
  if (/^\d{1,19}$/.test(category)) where.categoryId = BigInt(category)
  if (q) where.OR = [{ name: { contains: q } }, { sku: { contains: q } }, { slug: { contains: q } }]
  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, select: LIST_SELECT, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
  ])
  return { rows: rows.map(toListRow), total, page, pageSize }
}

/** Every product (for the Pricing and Inventory pages; the catalog is small). */
export async function listAllProducts(db) {
  const rows = await db.product.findMany({ where: { deletedAt: null }, select: LIST_SELECT, orderBy: [{ type: 'asc' }, { name: 'asc' }] })
  return rows.map(toListRow)
}

export async function listCategoryOptions(db) {
  const rows = await db.category.findMany({ where: { deletedAt: null, type: 'product' }, select: { id: true, name: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
  return rows.map((c) => ({ id: String(c.id), name: c.name }))
}

export async function listBrandOptions(db) {
  const rows = await db.brand.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
  return rows.map((b) => ({ id: String(b.id), name: b.name }))
}

/** Image list in ImageManager's shape: the path is the id (no image table in Revision 3). */
export function toImageList(p) {
  const out = []
  if (p.mainImage) out.push({ id: p.mainImage, url: p.mainImage, role: 'MAIN', isPrimary: true, position: 0 })
  readGallery(p.images).forEach((path, i) => out.push({ id: path, url: path, role: 'GALLERY', isPrimary: false, position: i + 1 }))
  return out
}

/** Full product for the editor, or null. */
export async function getProductForEdit(db, id) {
  if (!/^\d{1,19}$/.test(String(id))) return null
  const p = await db.product.findUnique({ where: { id: BigInt(id) } })
  if (!p || p.deletedAt) return null
  const ordered = await db.orderItem.count({ where: { productId: p.id } })
  return {
    id: String(p.id),
    name: p.name,
    sku: p.sku,
    slug: p.slug,
    type: p.type,
    status: p.status,
    categoryId: p.categoryId == null ? '' : String(p.categoryId),
    brandId: p.brandId == null ? '' : String(p.brandId),
    shortDescription: p.shortDescription ?? '',
    longDescription: p.longDescription ?? '',
    basePrice: amount(p.basePrice),
    salePrice: amount(p.salePrice),
    trackStock: p.trackStock,
    stock: p.stock,
    isFeatured: p.isFeatured,
    metaTitle: p.metaTitle ?? '',
    metaDescription: p.metaDescription ?? '',
    display: pickDisplayInfo(p.additionalInfo),
    // Dedicated product page images { role: path }; changed only through the image actions.
    media: readMedia(p.additionalInfo),
    images: toImageList(p),
    hasOrders: ordered > 0,
    updatedAt: p.updatedAt.toISOString(),
  }
}
