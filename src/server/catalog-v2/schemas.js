// Admin input validation for the approved catalog tables (pure, zod).
import { z } from 'zod'
import { parseAmountToMinor } from '../catalog/money.js'
import { MAX_STOCK } from '../commerce/stock-rules.js'
import { PRODUCT_STATUSES, PRODUCT_TYPES } from './product-rules.js'
import { CATEGORY_TYPES } from './category-rules.js'

export { fieldErrorsOf } from '../catalog/schemas.js'

export const idSchema = z.coerce.bigint().positive()
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const name = (max) => z.string().trim().min(1, 'Required.').max(max)
const optional = (max) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null))
const slug = (max) => z.string().trim().toLowerCase().max(max).regex(SLUG_RE, 'Use lower-case letters, digits and hyphens.')
// Empty or missing -> undefined: generated from the name on create, kept unchanged on update.
const optionalSlug = (max) => z.preprocess((v) => (typeof v === 'string' && !v.trim() ? undefined : v), slug(max).optional())

/** '525.00' -> 52500 (cents); rejects 0, negatives and malformed amounts. */
const positiveAmount = z.string().trim().transform((v, ctx) => {
  try {
    const minor = parseAmountToMinor(v)
    if (minor > 0) return minor
  } catch { /* reported below */ }
  ctx.addIssue({ code: 'custom', message: 'Enter an amount greater than 0 (e.g. 525.00).' })
  return z.NEVER
})

export const productCreateSchema = z.object({
  name: name(255),
  // No sku: generated on the server (auto-ids.js) and never changed afterwards.
  slug: optionalSlug(255),
  type: z.enum(PRODUCT_TYPES),
  categoryId: idSchema.nullable().optional(),
  brandId: idSchema.nullable().optional(),
  shortDescription: optional(5000),
  longDescription: optional(200_000),
  basePrice: positiveAmount,
  salePrice: positiveAmount.nullable().optional(),
  trackStock: z.boolean().default(false),
  stock: z.number().int().min(0).max(MAX_STOCK).default(0),
  metaTitle: optional(255),
  metaDescription: optional(5000),
  isFeatured: z.boolean().default(false),
}).strict()

export const productUpdateSchema = productCreateSchema
  .omit({ basePrice: true, salePrice: true, trackStock: true, stock: true })
  .partial()
  .extend({ additionalInfo: z.record(z.string().max(100), z.union([z.string().max(2000), z.number(), z.boolean(), z.null()])).nullable().optional() })
  .strict()

export const priceSchema = z.object({ basePrice: positiveAmount, salePrice: positiveAmount.nullable() }).strict()
export const statusSchema = z.enum(PRODUCT_STATUSES)
export const stockSchema = z.object({
  trackStock: z.boolean(),
  expected: z.number().int().min(0).max(MAX_STOCK),
  stock: z.number().int().min(0).max(MAX_STOCK),
}).strict()

export const categorySchema = z.object({
  name: name(150),
  slug: optionalSlug(180),
  type: z.enum(CATEGORY_TYPES),
  parentId: idSchema.nullable().optional(),
  description: optional(5000),
  sortOrder: z.number().int().min(-1_000_000).max(1_000_000).default(0),
}).strict()

export const brandSchema = z.object({
  name: name(150),
  slug: optionalSlug(180),
  description: optional(5000),
}).strict()
