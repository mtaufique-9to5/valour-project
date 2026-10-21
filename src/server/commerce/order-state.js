// Order state rules (pure), U4: fulfilment status and payment status are
// independent. Payment changes never change fulfilment status, and the reverse.
import { CommerceError } from './errors.js'

export const ORDER_STATUSES = Object.freeze(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
export const PAYMENT_STATUSES = Object.freeze(['pending', 'paid', 'failed', 'refunded'])
export const PAYMENT_METHODS = Object.freeze(['bank_transfer', 'cash_on_delivery'])
export const CANCELLABLE = Object.freeze(['pending', 'confirmed', 'processing'])

const FULFILMENT = Object.freeze({
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
})

const PAYMENT = Object.freeze({
  pending: ['paid', 'failed'],
  failed: ['pending'],
  paid: ['refunded'],
  refunded: [],
})

/** Throws CommerceError unless order (status, paymentStatus, paymentMethod) may move to `to`. */
export function assertFulfilmentTransition(order, to) {
  if (!ORDER_STATUSES.includes(to)) throw new CommerceError('invalid_status')
  if (!FULFILMENT[order.status]?.includes(to)) {
    throw new CommerceError('invalid_transition', `Cannot change an order from ${order.status} to ${to}`)
  }
  if (to === 'shipped' && order.paymentStatus !== 'paid' && order.paymentMethod !== 'cash_on_delivery') {
    throw new CommerceError('payment_required', 'Only paid or cash-on-delivery orders can be shipped')
  }
}

/**
 * Throws CommerceError unless the order's payment status may move to `to`.
 * Moving paid -> refunded requires refundedMinor === paidMinor (a full refund);
 * partial refunds are recorded as payment rows and leave the status 'paid'.
 */
export function assertPaymentTransition(order, to, { paidMinor = 0, refundedMinor = 0 } = {}) {
  if (!PAYMENT_STATUSES.includes(to)) throw new CommerceError('invalid_payment_status')
  if (!PAYMENT[order.paymentStatus]?.includes(to)) {
    throw new CommerceError('invalid_payment_transition', `Cannot change payment from ${order.paymentStatus} to ${to}`)
  }
  if (to === 'paid' && order.status === 'cancelled') throw new CommerceError('order_cancelled', 'A cancelled order cannot be marked paid')
  if (to === 'refunded' && (paidMinor <= 0 || refundedMinor !== paidMinor)) {
    throw new CommerceError('refund_incomplete', 'Payment becomes refunded only when the full paid amount has been refunded')
  }
}

/** Throws unless a refund of `amountMinor` fits within what was paid and not yet refunded. */
export function assertRefundAmount(amountMinor, { paidMinor, refundedMinor }) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw new CommerceError('invalid_amount')
  if (refundedMinor + amountMinor > paidMinor) throw new CommerceError('refund_exceeds_paid', 'Refunds cannot exceed the amount paid')
}

/** Public order number: VAL- + id zero-padded to 6 digits (wider ids are kept whole). */
export function formatOrderNumber(id) {
  const s = String(id)
  if (!/^\d+$/.test(s)) throw new RangeError('invalid order id')
  return `VAL-${s.padStart(6, '0')}`
}

export function isPaymentMethod(m) {
  return PAYMENT_METHODS.includes(m)
}
