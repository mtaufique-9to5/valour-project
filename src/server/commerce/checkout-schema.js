// Checkout request validation (pure). Prices, totals, stock and coupon value
// are never taken from the client; only identities, quantities and choices.
import { z } from 'zod'
import { CHECKOUT_TOKEN_RE } from './checkout-token.js'
import { MAX_QUANTITY, MIN_QUANTITY } from './order-totals.js'
import { PAYMENT_METHODS } from './order-state.js'

const text = (max) => z.string().trim().min(1).max(max)
const optionalText = (max) => z.string().trim().max(max).optional().transform((v) => (v ? v : null))

export const addressSchema = z.object({
  firstName: text(100),
  lastName: optionalText(100),
  phone: optionalText(30),
  line1: text(255),
  line2: optionalText(255),
  city: text(100),
  state: optionalText(100),
  zip: optionalText(20),
  country: text(100),
}).strict()

export const checkoutLineSchema = z.object({
  productId: z.coerce.bigint().positive(),
  quantity: z.number().int().min(MIN_QUANTITY).max(MAX_QUANTITY),
  options: z.record(z.string(), z.string().max(50)).nullable().optional(),
}).strict()

export const checkoutSchema = z.object({
  checkoutToken: z.string().regex(CHECKOUT_TOKEN_RE),
  email: z.string().trim().toLowerCase().max(255).email(),
  billing: addressSchema,
  shipping: addressSchema,
  shippingMethod: optionalText(100),
  paymentMethod: z.enum(PAYMENT_METHODS),
  couponCode: optionalText(100),
  notes: optionalText(2000),
  lines: z.array(checkoutLineSchema).min(1).max(50),
}).strict()
