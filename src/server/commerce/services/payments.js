// Manual payment handling (U2: bank transfer first, cash on delivery optional,
// no live gateway) and refunds (U4: a refund never changes fulfilment status).
// Lock order: order -> payments.
// TARGET SCHEMA ONLY: not imported by any route until the replacement migration.
import 'server-only'
import { recordAudit } from '../../audit/audit.js'
import { CommerceError } from '../errors.js'
import { toAmount, toMinor } from '../money.js'
import { assertPaymentTransition, assertRefundAmount } from '../order-state.js'
import { lockOrder } from './orders.js'

/** Paid and refunded totals (cents) from an order's payment rows. */
export function paymentTotals(payments) {
  let paidMinor = 0
  let refundedMinor = 0
  for (const p of payments) {
    if (p.status === 'paid') paidMinor += toMinor(p.amount)
    else if (p.status === 'refunded') refundedMinor += toMinor(p.amount)
  }
  return { paidMinor, refundedMinor }
}

async function setOrderPaymentStatus(tx, order, to, extra = {}) {
  const n = await tx.order.updateMany({
    where: { id: order.id, paymentStatus: order.paymentStatus },
    data: { paymentStatus: to, ...extra },
  })
  if (n.count !== 1) throw new CommerceError('order_conflict', 'This order changed; reload and try again')
}

/**
 * Admin confirms a bank transfer (or cash collected on delivery). The pending
 * payment row is updated only while still pending; the bank reference is unique
 * per payment method, so the same transfer cannot confirm two orders.
 */
export async function confirmManualPayment(db, { orderId, paymentId, transactionId, actor }) {
  if (typeof transactionId !== 'string' || !transactionId.trim() || transactionId.length > 255) {
    throw new CommerceError('invalid_reference', 'Enter the bank or receipt reference')
  }
  const reference = transactionId.trim()
  return db.$transaction(async (tx) => {
    const order = await lockOrder(tx, orderId)
    assertPaymentTransition(order, 'paid')
    let n
    try {
      n = await tx.payment.updateMany({
        where: { id: BigInt(paymentId), orderId: order.id, status: 'pending' },
        data: { status: 'paid', transactionId: reference, paidAt: new Date() },
      })
    } catch (e) {
      if (e?.code === 'P2002') throw new CommerceError('duplicate_reference', 'This reference is already recorded for another payment')
      throw e
    }
    if (n.count !== 1) throw new CommerceError('payment_conflict', 'This payment is no longer pending')
    await setOrderPaymentStatus(tx, order, 'paid', { paymentReference: reference })
    await recordAudit(tx, {
      ...actor, action: 'payment.confirm', targetType: 'order', targetId: String(order.id),
      before: { paymentStatus: order.paymentStatus }, after: { paymentStatus: 'paid', paymentId: String(paymentId), reference },
    })
    return { id: String(order.id), paymentStatus: 'paid' }
  })
}

/** pending -> failed, or failed -> pending (customer will pay again). */
export async function setPaymentPendingState(db, { orderId, to, actor }) {
  if (to !== 'failed' && to !== 'pending') throw new CommerceError('invalid_payment_status')
  return db.$transaction(async (tx) => {
    const order = await lockOrder(tx, orderId)
    assertPaymentTransition(order, to)
    const from = to === 'failed' ? 'pending' : 'failed'
    await tx.payment.updateMany({ where: { orderId: order.id, status: from }, data: { status: to } })
    await setOrderPaymentStatus(tx, order, to)
    await recordAudit(tx, {
      ...actor, action: 'payment.status.update', targetType: 'order', targetId: String(order.id),
      before: { paymentStatus: order.paymentStatus }, after: { paymentStatus: to },
    })
    return { id: String(order.id), paymentStatus: to }
  })
}

/**
 * Record a refund as a new payment row with status 'refunded'. The order's
 * payment status becomes 'refunded' only when the full paid amount is refunded.
 */
export async function recordRefund(db, { orderId, amountMinor, transactionId = null, actor }) {
  return db.$transaction(async (tx) => {
    const order = await lockOrder(tx, orderId)
    if (order.paymentStatus !== 'paid') throw new CommerceError('not_paid', 'Only paid orders can be refunded')
    const payments = await tx.payment.findMany({ where: { orderId: order.id }, select: { amount: true, status: true } })
    const totals = paymentTotals(payments)
    assertRefundAmount(amountMinor, totals)
    try {
      await tx.payment.create({
        data: { orderId: order.id, paymentMethod: order.paymentMethod, amount: toAmount(amountMinor), status: 'refunded', transactionId, paidAt: new Date() },
      })
    } catch (e) {
      if (e?.code === 'P2002') throw new CommerceError('duplicate_reference', 'This reference is already recorded for another payment')
      throw e
    }
    const refundedMinor = totals.refundedMinor + amountMinor
    const full = refundedMinor === totals.paidMinor
    if (full) {
      assertPaymentTransition(order, 'refunded', { paidMinor: totals.paidMinor, refundedMinor })
      await setOrderPaymentStatus(tx, order, 'refunded')
    }
    await recordAudit(tx, {
      ...actor, action: 'payment.refund', targetType: 'order', targetId: String(order.id),
      before: { paymentStatus: order.paymentStatus }, after: { paymentStatus: full ? 'refunded' : 'paid', amount: toAmount(amountMinor), refundedTotal: toAmount(refundedMinor) },
    })
    return { id: String(order.id), paymentStatus: full ? 'refunded' : 'paid', refundedMinor }
  })
}
