// Money helpers (pure). Amounts are stored as integer minor units (cents) in USD.
// null means "no price set" (legacy DRAFT rows only) and is never turned into 0.

// Largest accepted amount: $9,999,999.99 (well inside a signed 32-bit INT).
export const MAX_AMOUNT_MINOR = 999_999_999
export const CURRENCY = 'USD'

const AMOUNT_RE = /^(\d{1,7})(?:\.(\d{1,2}))?$/

/** True for a non-negative decimal string with at most 2 decimals ("525", "525.5", "525.00"). */
export function isAmountString(value) {
  return typeof value === 'string' && AMOUNT_RE.test(value.trim())
}

/**
 * '525.00' -> 52500. Exact string arithmetic (no floating point).
 * Throws RangeError for anything that is not a valid non-negative amount.
 */
export function parseAmountToMinor(value) {
  if (typeof value !== 'string') throw new RangeError('amount must be a decimal string')
  const m = value.trim().match(AMOUNT_RE)
  if (!m) throw new RangeError('invalid amount')
  const minor = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'))
  if (!Number.isSafeInteger(minor) || minor > MAX_AMOUNT_MINOR) throw new RangeError('amount too large')
  return minor
}

/** 52500 -> 525; null/undefined -> null. */
export function minorToDollars(minor) {
  return Number.isInteger(minor) ? minor / 100 : null
}

/** 52500 -> '525.00' (for form inputs); null -> ''. */
export function minorToAmountString(minor) {
  if (!Number.isInteger(minor)) return ''
  const sign = minor < 0 ? '-' : ''
  const abs = Math.abs(minor)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY })

export const NO_PRICE_LABEL = 'No price set'

/** 52500 -> '$525.00'; null -> 'No price set'. */
export function formatMinor(minor) {
  return Number.isInteger(minor) ? usd.format(minor / 100) : NO_PRICE_LABEL
}

/** '499.99' -> 49999 when the amount is > 0; throws RangeError otherwise (0, negative, invalid). */
export function parsePositiveAmountToMinor(value) {
  const minor = parseAmountToMinor(value)
  if (minor <= 0) throw new RangeError('amount must be greater than zero')
  return minor
}

/** True for a valid amount string greater than zero. */
export function isPositiveAmountString(value) {
  try { return parsePositiveAmountToMinor(value) > 0 } catch { return false }
}
