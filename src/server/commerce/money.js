// DECIMAL(12,2) <-> integer minor units (cents). All commerce arithmetic is
// done on integers; values from Prisma arrive as Decimal objects or strings and
// are converted through their string form, never through floating point.
import { parseAmountToMinor, minorToAmountString } from '../catalog/money.js'

/** Prisma Decimal | string -> cents. null/undefined -> null. Throws on anything else. */
export function toMinor(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') throw new RangeError('amounts must not be JS numbers')
  return parseAmountToMinor(String(value))
}

/** cents -> '525.00' for Prisma Decimal columns and API output. */
export function toAmount(minor) {
  if (!Number.isSafeInteger(minor) || minor < 0) throw new RangeError('invalid minor amount')
  return minorToAmountString(minor)
}

/** Price a customer pays for one unit: sale price when set, else base price. */
export function unitPriceMinor(product) {
  const sale = toMinor(product.salePrice)
  return sale ?? toMinor(product.basePrice)
}
