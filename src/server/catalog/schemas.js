// Zod input schemas for catalog server actions (pure; shared with tests).
// Clients are never trusted: every action parses its input with these.
// There is no "Price on request": every price entered in the admin is a decimal
// string > 0 in USD, converted to integer minor units ("499.99" -> 49999).
import { z } from 'zod'
import { parsePositiveAmountToMinor, isPositiveAmountString, CURRENCY } from './money.js'

export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED']
/** Types an admin may create or switch to. CUSTOM exists only for the legacy Custom Watch. */
export const CREATABLE_TYPES = ['WATCH', 'STRAP']
export const TRACKING_MODES = ['TRACKED', 'NOT_TRACKED']
export const INVENTORY_REASONS = ['INITIAL_COUNT', 'RESTOCK', 'SALE', 'RETURN', 'DAMAGE', 'CORRECTION']
export const LIST_SORTS = ['position', 'name', '-name', 'sku', '-sku', 'newest', 'oldest']
export const MAX_STOCK = 1_000_000
export const MAX_PAGE_SIZE = 50
export const SKU_RE = /^[A-Z0-9-]{1,32}$/

export const productIdSchema = z.coerce.number().int().positive().max(2_147_483_647)

const optText = (max) =>
  z.union([z.string().trim().max(max), z.null()]).transform((v) => (v === '' ? null : v))

/** SKU: trimmed, uppercased, A-Z 0-9 and '-', 1-32 chars. */
export const skuSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .pipe(z.string().regex(SKU_RE, { message: 'SKU: 1-32 characters, A-Z, 0-9 and -' }))

/** Price amount: decimal string > 0, max 2 decimals -> integer minor units. */
export const amountSchema = z
  .string()
  .refine(isPositiveAmountString, { message: 'Enter a price greater than 0 with up to 2 decimals' })
  .transform((v) => parsePositiveAmountToMinor(v))

const currencySchema = z.literal(CURRENCY)
const categoryIdSchema = z.union([z.coerce.number().int().positive().max(2_147_483_647), z.null()])
const quantitySchema = z.union([z.number().int().min(0).max(MAX_STOCK), z.null()])

// TRACKED requires an integer quantity >= 0; NOT_TRACKED requires none.
function checkTracking(v, ctx) {
  if (v.trackingMode === undefined) {
    if (v.quantity !== undefined && v.quantity !== null) {
      ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Choose a tracking mode with the quantity' })
    }
    return
  }
  if (v.trackingMode === 'TRACKED' && !Number.isInteger(v.quantity)) {
    ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Enter a stock quantity of 0 or more' })
  }
  if (v.trackingMode === 'NOT_TRACKED' && v.quantity !== undefined && v.quantity !== null) {
    ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Untracked products have no quantity' })
  }
}

const productFields = {
  name: z.string().trim().min(1).max(150),
  description: optText(5000),
  sku: skuSchema,
  categoryId: categoryIdSchema,
  type: z.enum(CREATABLE_TYPES),
  price: amountSchema,
  currency: currencySchema,
  trackingMode: z.enum(TRACKING_MODES),
  quantity: quantitySchema,
}

/**
 * createProduct input. Always creates a DRAFT (status may be omitted or 'DRAFT';
 * ACTIVE needs a main image, which can only be uploaded after creation).
 * Output: { name, description, sku, categoryId, type, amountMinor, currency, trackingMode, quantity }
 */
export const productCreateSchema = z
  .object({
    ...productFields,
    description: productFields.description.optional().default(null),
    categoryId: categoryIdSchema.optional().default(null),
    currency: currencySchema.optional().default(CURRENCY),
    quantity: quantitySchema.optional().default(null),
    status: z.literal('DRAFT').optional(),
  })
  .strict()
  .superRefine(checkTracking)
  .transform(({ price, status: _s, ...rest }) => ({ ...rest, amountMinor: price }))

/**
 * updateProduct input (partial). price -> amountMinor. Legacy storefront columns
 * (subtitle, movement, ...) stay editable for imported products.
 */
export const productUpdateSchema = z
  .object({
    ...productFields,
    status: z.enum(PRODUCT_STATUSES),
    subtitle: optText(150),
    movement: optText(50),
    material: optText(50),
    color: optText(50),
    tagline: optText(255),
    limited: z.boolean(),
    edition: optText(50),
  })
  .partial()
  .strict()
  .superRefine(checkTracking)
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' })
  .transform(({ price, ...rest }) => (price === undefined ? rest : { ...rest, amountMinor: price }))

/** updatePrice input: { amount: '499.99', reason } -> { amountMinor, reason }. null is rejected. */
export const priceUpdateSchema = z
  .object({
    amount: amountSchema,
    currency: currencySchema.optional(),
    reason: z.string().trim().min(1).max(255),
  })
  .strict()
  .transform(({ amount, reason }) => ({ amountMinor: amount, reason }))

export const statusSchema = z.enum(PRODUCT_STATUSES)

/** setTrackingMode options: { quantity?, reason? } validated together with the mode. */
export const trackingSchema = z
  .object({
    trackingMode: z.enum(TRACKING_MODES),
    quantity: quantitySchema.optional(),
    reason: z.enum(INVENTORY_REASONS).optional(),
  })
  .strict()
  .superRefine(checkTracking)

// Exactly one of delta (non-zero) or setQuantity (>= 0).
export const inventoryAdjustSchema = z
  .object({
    delta: z.number().int().min(-MAX_STOCK).max(MAX_STOCK).refine((n) => n !== 0, { message: 'delta must not be 0' }).optional(),
    setQuantity: z.number().int().min(0).max(MAX_STOCK).optional(),
    reason: z.enum(INVENTORY_REASONS),
    note: z.union([z.string().trim().max(255), z.null()]).optional(),
  })
  .strict()
  .refine((v) => (v.delta === undefined) !== (v.setQuantity === undefined), {
    message: 'Provide either delta or setQuantity',
  })

/** listProducts query; unknown/invalid values fall back to defaults. */
export const listQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional().catch(undefined),
    type: z.preprocess((v) => (typeof v === 'string' ? v.toUpperCase() : v), z.enum(['WATCH', 'STRAP', 'CUSTOM'])).optional().catch(undefined),
    status: z.preprocess((v) => (typeof v === 'string' ? v.toUpperCase() : v), z.enum(PRODUCT_STATUSES)).optional().catch(undefined),
    categoryId: z.coerce.number().int().positive().optional().catch(undefined),
    page: z.coerce.number().int().min(1).max(10_000).optional().default(1).catch(1),
    pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(20).catch(20),
    sort: z.enum(LIST_SORTS).optional().default('position').catch('position'),
  })
  .catch({ page: 1, pageSize: 20, sort: 'position' })

export const imageIdSchema = productIdSchema
export const imageIdListSchema = z.array(productIdSchema).min(1).max(64)

/** { fieldErrors: { field: [messages] } } from a failed safeParse (zod 4). */
export function fieldErrorsOf(error) {
  try {
    return z.flattenError(error).fieldErrors
  } catch {
    return {}
  }
}
