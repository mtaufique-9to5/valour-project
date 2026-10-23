// Category and brand writes on the approved tables. Each function takes the
// transaction `tx` and records an audit entry in it. Used by the admin
// Categories and Brands pages (src/app/admin/(panel)/taxonomy-actions.js).
import 'server-only'
import { recordAudit } from '../../audit/audit.js'
import { CommerceError } from '../../commerce/errors.js'
import { MAX_DEPTH, deleteError, parentError } from '../category-rules.js'
import { autoConflict, duplicateField, generateSlug } from '../auto-ids.js'

const audit = (tx, actor, action, type, id, before, after) =>
  recordAudit(tx, { ...actor, action, targetType: type, targetId: String(id), before, after })

// An empty slug is generated from the name (create) or left unchanged (update).
// A parallel create taking the same generated slug gives auto_conflict and the
// caller re-runs the transaction (auto-ids.js withAutoRetry).
const createError = (e, auto, what) =>
  (auto && duplicateField(e) === 'slug' ? autoConflict() : slugTaken(e, what))

const slugTaken = (e, what) =>
  e?.code === 'P2002' ? new CommerceError('duplicate', `This ${what} is already used (including deleted entries).`) : e

/** Ancestor ids of `parentId` (excluding it), walking up with row locks; bounded by MAX_DEPTH + 1. */
async function ancestorsOf(tx, parentId) {
  const ids = []
  let current = parentId
  for (let i = 0; i <= MAX_DEPTH && current != null; i++) {
    const [row] = await tx.$queryRaw`SELECT parent_id AS parentId FROM categories WHERE id = ${BigInt(current)} FOR UPDATE`
    current = row?.parentId ?? null
    if (current != null) ids.push(current)
  }
  return ids
}

/** Height of the subtree rooted at `id` (1 = no children), bounded by MAX_DEPTH + 1. */
async function subtreeHeight(tx, id) {
  let level = [BigInt(id)]
  let height = 0
  while (level.length && height <= MAX_DEPTH) {
    height++
    const rows = await tx.category.findMany({ where: { parentId: { in: level }, deletedAt: null }, select: { id: true } })
    level = rows.map((r) => r.id)
  }
  return height
}

async function checkParent(tx, category, parentId) {
  const parent = parentId == null ? null : await tx.category.findUnique({ where: { id: parentId }, select: { id: true, type: true, deletedAt: true } })
  if (parentId != null && !parent) throw new CommerceError('invalid_parent', 'Choose an existing parent category.')
  const ancestors = parent ? await ancestorsOf(tx, parent.id) : []
  const err = parentError(category, parent, ancestors)
  if (err) throw new CommerceError('invalid_parent', err)
}

/** Created inactive (status FALSE); activation is a separate explicit action. */
export async function createCategory(tx, input, actor) {
  await checkParent(tx, { id: null, type: input.type, subtreeHeight: 1 }, input.parentId ?? null)
  const auto = input.slug == null
  if (auto) input = { ...input, slug: await generateSlug(tx, 'category', input.name) }
  let row
  try {
    row = await tx.category.create({ data: { ...input, parentId: input.parentId ?? null, status: false }, select: { id: true } })
  } catch (e) {
    throw createError(e, auto, 'slug')
  }
  await audit(tx, actor, 'category.create', 'category', row.id, null, input)
  return row.id
}

export async function updateCategory(tx, id, input, actor) {
  const [current] = await tx.$queryRaw`SELECT id, type, parent_id AS parentId, deleted_at AS deletedAt FROM categories WHERE id = ${BigInt(id)} FOR UPDATE`
  if (!current || current.deletedAt) throw new CommerceError('not_found', 'Category not found.')
  if (input.type !== current.type) {
    const [{ n }] = await tx.$queryRaw`
      SELECT (SELECT COUNT(*) FROM categories WHERE parent_id = ${current.id})
           + (SELECT COUNT(*) FROM products WHERE category_id = ${current.id})
           + (SELECT COUNT(*) FROM blogs WHERE category_id = ${current.id}) AS n`
    if (Number(n) > 0) throw new CommerceError('type_locked', 'The type cannot change while the category is in use.')
  }
  const parentId = input.parentId ?? null
  await checkParent(tx, { id: current.id, type: input.type, subtreeHeight: await subtreeHeight(tx, current.id) }, parentId)
  try {
    await tx.category.update({ where: { id: current.id }, data: { ...input, parentId } })
  } catch (e) {
    throw slugTaken(e, 'slug')
  }
  await audit(tx, actor, 'category.update', 'category', current.id, { type: current.type, parentId: current.parentId }, input)
}

export async function setCategoryStatus(tx, id, status, actor) {
  const c = await tx.category.findUnique({ where: { id: BigInt(id) }, select: { id: true, status: true, deletedAt: true } })
  if (!c || c.deletedAt) throw new CommerceError('not_found', 'Category not found.')
  await tx.category.update({ where: { id: c.id }, data: { status } })
  await audit(tx, actor, 'category.status.update', 'category', c.id, { status: c.status }, { status })
}

export async function softDeleteCategory(tx, id, actor) {
  const [c] = await tx.$queryRaw`SELECT id, deleted_at AS deletedAt FROM categories WHERE id = ${BigInt(id)} FOR UPDATE`
  if (!c || c.deletedAt) throw new CommerceError('not_found', 'Category not found.')
  const [counts] = await tx.$queryRaw`
    SELECT (SELECT COUNT(*) FROM categories WHERE parent_id = ${c.id} AND deleted_at IS NULL) AS children,
           (SELECT COUNT(*) FROM products WHERE category_id = ${c.id} AND deleted_at IS NULL) AS products,
           (SELECT COUNT(*) FROM blogs WHERE category_id = ${c.id} AND deleted_at IS NULL) AS blogs`
  const err = deleteError({ children: Number(counts.children), products: Number(counts.products), blogs: Number(counts.blogs) })
  if (err) throw new CommerceError('in_use', err)
  await tx.category.update({ where: { id: c.id }, data: { deletedAt: new Date(), status: false } })
  await audit(tx, actor, 'category.delete', 'category', c.id, null, { deleted: true })
}

/** Brands: created inactive; soft delete blocked while any product still uses the brand. */
export async function createBrand(tx, input, actor) {
  const auto = input.slug == null
  if (auto) input = { ...input, slug: await generateSlug(tx, 'brand', input.name) }
  let row
  try {
    row = await tx.brand.create({ data: { ...input, status: false }, select: { id: true } })
  } catch (e) {
    throw createError(e, auto, 'name or slug')
  }
  await audit(tx, actor, 'brand.create', 'brand', row.id, null, input)
  return row.id
}

export async function updateBrand(tx, id, input, actor) {
  const b = await tx.brand.findUnique({ where: { id: BigInt(id) }, select: { id: true, name: true, slug: true, deletedAt: true } })
  if (!b || b.deletedAt) throw new CommerceError('not_found', 'Brand not found.')
  try {
    await tx.brand.update({ where: { id: b.id }, data: input })
  } catch (e) {
    throw slugTaken(e, 'name or slug')
  }
  await audit(tx, actor, 'brand.update', 'brand', b.id, { name: b.name, slug: b.slug }, input)
}

export async function setBrandStatus(tx, id, status, actor) {
  const b = await tx.brand.findUnique({ where: { id: BigInt(id) }, select: { id: true, status: true, deletedAt: true } })
  if (!b || b.deletedAt) throw new CommerceError('not_found', 'Brand not found.')
  await tx.brand.update({ where: { id: b.id }, data: { status } })
  await audit(tx, actor, 'brand.status.update', 'brand', b.id, { status: b.status }, { status })
}

export async function softDeleteBrand(tx, id, actor) {
  const [b] = await tx.$queryRaw`SELECT id, deleted_at AS deletedAt FROM brands WHERE id = ${BigInt(id)} FOR UPDATE`
  if (!b || b.deletedAt) throw new CommerceError('not_found', 'Brand not found.')
  // Any non-deleted product (draft and archived too): otherwise those products would
  // point at a deleted brand and could no longer be saved in the editor.
  const used = await tx.product.count({ where: { brandId: b.id, deletedAt: null } })
  if (used > 0) throw new CommerceError('in_use', `Move this brand’s ${used} product(s) to another brand first.`)
  await tx.brand.update({ where: { id: b.id }, data: { deletedAt: new Date(), status: false } })
  await audit(tx, actor, 'brand.delete', 'brand', b.id, null, { deleted: true })
}
