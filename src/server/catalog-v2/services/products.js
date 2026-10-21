// Product writes on the approved `products` table. Each function takes the
// transaction `tx` (callers check permissions and open the transaction) and
// records an audit entry in that same transaction.
// TARGET SCHEMA ONLY: not imported by any route until the replacement migration.
import 'server-only'
import { recordAudit } from '../../audit/audit.js'
import { CommerceError } from '../../commerce/errors.js'
import { toAmount, toMinor } from '../../commerce/money.js'
import { setStock } from '../../commerce/services/stock.js'
import { categoryUseError } from '../category-rules.js'
import { priceProblems, slugFor, statusChangeError, typeChangeError } from '../product-rules.js'

const audit = (tx, actor, action, id, before, after) =>
  recordAudit(tx, { ...actor, action, targetType: 'product', targetId: String(id), before, after })

async function lockProduct(tx, id) {
  const [row] = await tx.$queryRaw`
    SELECT id, name, sku, type, status, stock, track_stock AS trackStock, base_price AS basePrice,
           sale_price AS salePrice, main_image AS mainImage, deleted_at AS deletedAt
    FROM products WHERE id = ${BigInt(id)} FOR UPDATE`
  if (!row) throw new CommerceError('product_not_found', 'Product not found.')
  return { ...row, trackStock: Boolean(row.trackStock), stock: Number(row.stock) }
}

async function assertRefs(tx, { categoryId, brandId }) {
  if (categoryId != null) {
    const c = await tx.category.findUnique({ where: { id: categoryId }, select: { type: true, deletedAt: true } })
    const err = categoryUseError(c, 'product')
    if (err) throw new CommerceError('invalid_category', err)
  }
  if (brandId != null) {
    const b = await tx.brand.findUnique({ where: { id: brandId }, select: { deletedAt: true } })
    if (!b || b.deletedAt) throw new CommerceError('invalid_brand', 'Choose an existing brand.')
  }
}

const uniqueError = (e) => {
  if (e?.code !== 'P2002') return e
  const meta = JSON.stringify(e.meta ?? {})
  if (meta.includes('sku')) return new CommerceError('duplicate_sku', 'This SKU is already used (including deleted products).')
  if (meta.includes('slug')) return new CommerceError('duplicate_slug', 'This URL slug is already used (including deleted products).')
  return e
}

/** input: productCreateSchema output (prices in cents). Always created as draft. */
export async function createProduct(tx, input, actor) {
  const problems = priceProblems(input.basePrice, input.salePrice ?? null)
  if (problems.length) throw new CommerceError('invalid_price', problems.join(' '))
  await assertRefs(tx, input)
  const data = {
    name: input.name,
    sku: input.sku,
    slug: input.slug ?? slugFor(input.name, input.sku),
    type: input.type,
    categoryId: input.categoryId ?? null,
    brandId: input.brandId ?? null,
    shortDescription: input.shortDescription,
    longDescription: input.longDescription,
    basePrice: toAmount(input.basePrice),
    salePrice: input.salePrice == null ? null : toAmount(input.salePrice),
    trackStock: input.trackStock,
    stock: input.trackStock ? input.stock : 0,
    metaTitle: input.metaTitle,
    metaDescription: input.metaDescription,
    isFeatured: input.isFeatured,
    status: 'draft',
  }
  let created
  try {
    created = await tx.product.create({ data, select: { id: true } })
  } catch (e) {
    throw uniqueError(e)
  }
  await audit(tx, actor, 'product.create', created.id, null, data)
  return created.id
}

/** input: productUpdateSchema output. Prices, stock and status have their own functions. */
export async function updateProduct(tx, id, input, actor) {
  const p = await lockProduct(tx, id)
  if (p.deletedAt) throw new CommerceError('product_not_found', 'Product not found.')
  if (input.type !== undefined) {
    const hasOrders = (await tx.orderItem.count({ where: { productId: p.id } })) > 0
    const err = typeChangeError(p.type, { status: p.status, hasOrders }, input.type)
    if (err) throw new CommerceError('type_locked', err)
  }
  await assertRefs(tx, input)
  try {
    await tx.product.update({ where: { id: p.id }, data: input })
  } catch (e) {
    throw uniqueError(e)
  }
  await audit(tx, actor, 'product.update', p.id, { name: p.name, sku: p.sku, type: p.type }, input)
}

export async function setPrices(tx, id, { basePrice, salePrice }, actor) {
  const p = await lockProduct(tx, id)
  const problems = priceProblems(basePrice, salePrice)
  if (problems.length) throw new CommerceError('invalid_price', problems.join(' '))
  const next = { basePrice: toAmount(basePrice), salePrice: salePrice == null ? null : toAmount(salePrice) }
  await tx.product.update({ where: { id: p.id }, data: next })
  await audit(tx, actor, 'product.price.update', p.id,
    { basePrice: String(p.basePrice), salePrice: p.salePrice == null ? null : String(p.salePrice) }, next)
}

export async function setStatus(tx, id, to, actor) {
  const p = await lockProduct(tx, id)
  const err = statusChangeError(p.status, to, {
    ...p, id: String(p.id), baseMinor: toMinor(p.basePrice), saleMinor: toMinor(p.salePrice),
  })
  if (err) throw new CommerceError('invalid_status', err)
  if (p.status === to) return
  await tx.product.update({ where: { id: p.id }, data: { status: to } })
  await audit(tx, actor, 'product.status.update', p.id, { status: p.status }, { status: to })
}

/**
 * Stock tracking and level. `expected` is the stock the admin saw, so a
 * concurrent checkout is never overwritten silently. Turning tracking off
 * keeps the number but it is no longer deducted or restored.
 */
export async function setInventory(tx, id, { trackStock, expected, stock }, actor) {
  const p = await lockProduct(tx, id)
  if (p.deletedAt) throw new CommerceError('product_not_found', 'Product not found.')
  if (p.stock !== expected) throw new CommerceError('stock_conflict', 'Stock changed since the page was loaded; reload and try again.')
  if (p.trackStock !== trackStock) await tx.product.update({ where: { id: p.id }, data: { trackStock } })
  if (stock !== p.stock) await setStock(tx, p.id, { expected, next: stock })
  await audit(tx, actor, 'inventory.update', p.id,
    { trackStock: p.trackStock, stock: p.stock }, { trackStock, stock, delta: stock - p.stock })
}

/** Soft delete: the row (and its unique SKU/slug) stays; it leaves the storefront. */
export async function softDeleteProduct(tx, id, actor) {
  const p = await lockProduct(tx, id)
  if (p.deletedAt) return
  await tx.product.update({ where: { id: p.id }, data: { deletedAt: new Date(), status: 'inactive', isFeatured: false } })
  await audit(tx, actor, 'product.delete', p.id, { status: p.status }, { status: 'inactive', deleted: true })
}

export async function restoreProduct(tx, id, actor) {
  const p = await lockProduct(tx, id)
  if (!p.deletedAt) return
  await tx.product.update({ where: { id: p.id }, data: { deletedAt: null, status: 'draft' } })
  await audit(tx, actor, 'product.restore', p.id, { deleted: true }, { status: 'draft', deleted: false })
}
