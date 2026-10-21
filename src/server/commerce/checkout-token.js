// Checkout idempotency token (SC-6). The checkout page gets a fresh random
// token; every submit of that attempt sends it, and orders.checkout_token is
// UNIQUE, so a double click, retry or replay returns the order already placed.
import { randomBytes } from 'node:crypto'

export const CHECKOUT_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/

/** 32 random bytes as base64url (43 characters; fits VARCHAR(64)). */
export function newCheckoutToken() {
  return randomBytes(32).toString('base64url')
}

export function isCheckoutToken(value) {
  return typeof value === 'string' && CHECKOUT_TOKEN_RE.test(value)
}

/** True for Prisma's unique-constraint error on orders.checkout_token. */
export function isCheckoutTokenConflict(error) {
  if (error?.code !== 'P2002') return false
  // meta.target (classic engine) or meta.driverAdapterError (driver adapters)
  // names the field or index; both mention checkout_token / checkoutToken.
  const meta = JSON.stringify(error.meta ?? {})
  return meta.includes('checkout_token') || meta.includes('checkoutToken')
}
