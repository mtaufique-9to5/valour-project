// Pure product business rules (no DB; unit tested). Actions load the product
// inside their transaction and call these before writing.

/**
 * Allowed status transitions. ARCHIVED products return to DRAFT first; there is
 * no hard delete.
 */
const TRANSITIONS = Object.freeze({
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['DRAFT', 'ARCHIVED'],
  ARCHIVED: ['DRAFT'],
})

/** True when `from` -> `to` is a permitted status change (same status = no-op, allowed). */
export function canTransition(from, to) {
  if (from === to) return Object.hasOwn(TRANSITIONS, to)
  return Object.hasOwn(TRANSITIONS, from) && TRANSITIONS[from].includes(to)
}

/**
 * Reasons a product cannot be ACTIVE (empty array = may be activated).
 * @param {{ name?: string, ref?: string|null, price?: { amountMinor: number|null, confirmed?: boolean, currency?: string }|null,
 *   images?: Array<{ role: string, isPrimary?: boolean }> }} p
 * @returns {string[]}
 */
export function activationProblems(p) {
  const problems = []
  if (!p?.name || !String(p.name).trim()) problems.push('Add a product name.')
  if (!p?.ref || !String(p.ref).trim()) problems.push('Add a SKU.')
  const price = p?.price ?? null
  if (!price || !Number.isInteger(price.amountMinor) || price.amountMinor <= 0 || price.confirmed === false || (price.currency && price.currency !== 'USD')) {
    problems.push('Set a price greater than 0.')
  }
  if (!(p?.images ?? []).some((i) => i.role === 'MAIN' && i.isPrimary !== false)) problems.push('Add a main image.')
  return problems
}

/**
 * Full check for a status change. Returns null when allowed, else a user-facing message.
 * @param {string} from current status
 * @param {string} to requested status
 * @param {object} product see activationProblems
 */
export function statusChangeError(from, to, product) {
  if (!canTransition(from, to)) {
    return from === 'ARCHIVED' && to === 'ACTIVE'
      ? 'Restore the product to Draft before activating it.'
      : 'This status change is not allowed.'
  }
  if (to === 'ACTIVE') {
    const problems = activationProblems(product)
    if (problems.length > 0) return `Cannot activate: ${problems.join(' ')}`
  }
  return null
}

/**
 * Product type may change only while DRAFT, only between WATCH and STRAP, and
 * never for the legacy CUSTOM product. Returns null or an error message.
 */
export function typeChangeError(currentType, currentStatus, nextType) {
  if (nextType === currentType) return null
  if (currentType === 'CUSTOM' || !['WATCH', 'STRAP'].includes(nextType)) return 'This product type cannot be changed.'
  if (currentStatus !== 'DRAFT') return 'The type can only be changed while the product is a draft.'
  return null
}

/**
 * Price removal is impossible through the admin; an ACTIVE product must keep a
 * positive price. Returns null or an error message for a new amount.
 */
export function priceError(amountMinor) {
  return Number.isInteger(amountMinor) && amountMinor > 0 ? null : 'Enter a price greater than 0.'
}

/** "Sunseeker Yellow" + "LUC-07" -> "sunseeker-yellow-luc-07" (max 120 chars). */
// The SKU part is never truncated, so slugs stay unique because SKUs are unique.
export function slugFor(name, sku) {
  const clean = (s) => String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const tail = clean(sku)
  const head = clean(name).slice(0, Math.max(0, 119 - tail.length)).replace(/-+$/, '')
  return [head, tail].filter(Boolean).join('-') || 'product'
}
