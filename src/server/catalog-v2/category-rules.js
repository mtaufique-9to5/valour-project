// Category tree rules (pure). The application rejects self-parenting and
// loops, requires the parent's type to match, and limits depth to 3.
export const MAX_DEPTH = 3
export const CATEGORY_TYPES = Object.freeze(['product', 'blog'])

/**
 * category:  { id (null when new), type, subtreeHeight (1 for a leaf / new row) }
 * parent:    { id, type, deletedAt } or null for a root category
 * ancestors: ids from parent's parent up to the root, read inside the
 *            transaction (rows locked FOR UPDATE by the caller)
 * Returns null or an error message.
 */
export function parentError(category, parent, ancestors = []) {
  if (!CATEGORY_TYPES.includes(category.type)) return 'Choose product or blog.'
  if (!parent) return category.subtreeHeight > MAX_DEPTH ? `Categories can be at most ${MAX_DEPTH} levels deep.` : null
  if (parent.deletedAt) return 'The parent category has been deleted.'
  if (category.id != null) {
    const self = String(category.id)
    if (String(parent.id) === self) return 'A category cannot be its own parent.'
    if (ancestors.some((id) => String(id) === self)) return 'A category cannot be moved under one of its own subcategories.'
  }
  if (parent.type !== category.type) return 'The parent must be the same type of category.'
  const parentDepth = ancestors.length + 1
  if (parentDepth + (category.subtreeHeight ?? 1) > MAX_DEPTH) return `Categories can be at most ${MAX_DEPTH} levels deep.`
  return null
}

/** Soft delete is blocked while children, products or blogs still use the category. */
export function deleteError({ children, products, blogs }) {
  if (children > 0) return 'Move or delete its subcategories first.'
  if (products > 0) return 'Move its products to another category first.'
  if (blogs > 0) return 'Move its blog posts to another category first.'
  return null
}

/** Products may only use product categories; blog posts only blog categories. */
export function categoryUseError(category, usage) {
  if (!category || category.deletedAt) return 'Choose an existing category.'
  return category.type === usage ? null : `Choose a ${usage} category.`
}
