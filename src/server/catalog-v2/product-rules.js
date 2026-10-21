// Product rules for the approved `products` table (pure; rev. 2 schema).
// Status: draft | active | inactive (inactive = archived). Prices are
// DECIMAL(12,2): base_price > 0 always, sale_price NULL or 0 < sale <= base.
// There is no "price on request": a product always has a confirmed base price.
import { isValidStock, MAX_STOCK } from '../commerce/stock-rules.js'
import { isGalleryPath } from './gallery-rules.js'

export const PRODUCT_STATUSES = Object.freeze(['draft', 'active', 'inactive'])
export const PRODUCT_TYPES = Object.freeze(['watch', 'strap', 'custom'])
export { slugFor } from '../catalog/product-rules.js'

const TRANSITIONS = Object.freeze({
  draft: ['active', 'inactive'],
  active: ['draft', 'inactive'],
  inactive: ['draft', 'active'],
})

export function canTransition(from, to) {
  return from === to ? PRODUCT_STATUSES.includes(to) : Boolean(TRANSITIONS[from]?.includes(to))
}

/** Problems with a price pair in cents (empty array = valid). */
export function priceProblems(baseMinor, saleMinor) {
  const problems = []
  if (!Number.isSafeInteger(baseMinor) || baseMinor <= 0) problems.push('Enter a base price greater than 0.')
  if (saleMinor !== null && saleMinor !== undefined) {
    if (!Number.isSafeInteger(saleMinor) || saleMinor <= 0) problems.push('A sale price must be greater than 0.')
    else if (Number.isSafeInteger(baseMinor) && saleMinor > baseMinor) problems.push('The sale price cannot be higher than the base price.')
  }
  return problems
}

/**
 * Reasons a product cannot be active. p: { name, sku, baseMinor, saleMinor,
 * mainImage, trackStock, stock, deletedAt }.
 */
export function activationProblems(p) {
  const problems = []
  if (!p?.name?.trim()) problems.push('Add a product name.')
  if (!p?.sku?.trim()) problems.push('Add a SKU.')
  problems.push(...priceProblems(p?.baseMinor, p?.saleMinor))
  if (!p?.mainImage || !isGalleryPath(p.mainImage, p.id)) problems.push('Add a main image.')
  if (p?.deletedAt) problems.push('Restore the product first.')
  if (p?.trackStock && !isValidStock(p.stock)) problems.push(`Stock must be 0 to ${MAX_STOCK}.`)
  return problems
}

/** null or a message explaining why the status change is not allowed. */
export function statusChangeError(from, to, product) {
  if (!canTransition(from, to)) return `A ${from} product cannot become ${to}.`
  if (to === 'active') {
    const problems = activationProblems(product)
    if (problems.length) return problems.join(' ')
  }
  return null
}

/**
 * Type is fixed once a product has been ordered or published; while it is a
 * draft that has never been ordered it may still change.
 */
export function typeChangeError(current, { status, hasOrders }, next) {
  if (!PRODUCT_TYPES.includes(next)) return 'Choose watch, strap or custom.'
  if (current === next) return null
  if (status !== 'draft' || hasOrders) return 'The type can only change while the product is an unordered draft.'
  return null
}
