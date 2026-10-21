// Place an order in ONE transaction (SC-4, SC-6, SC-7, SC-10).
// Lock order: (no order yet) -> coupon -> products ascending -> new order rows.
// A repeated checkout token returns the order already placed (idempotent).
// TARGET SCHEMA ONLY: not imported by any route until the replacement migration.
import 'server-only'
import { randomUUID } from 'node:crypto'
import { CommerceError } from '../errors.js'
import { toAmount, unitPriceMinor } from '../money.js'
import { computeLine, computeOrder } from '../order-totals.js'
import { evaluateCoupon, normalizeCouponCode } from '../coupon-rules.js'
import { planDeductions } from '../stock-rules.js'
import { normalizeCustomOptions } from '../custom-options.js'
import { formatOrderNumber, isPaymentMethod } from '../order-state.js'
import { isCheckoutTokenConflict } from '../checkout-token.js'
import { lockProducts, applyDeductions } from './stock.js'
import { lockCoupon, consumeCoupon } from './coupons.js'

export const CUSTOMER_ROLE = 'Customer'

/**
 * Find the customer record for an email, or create a passwordless guest record
 * (SC-7 Option B). An existing record's profile is never overwritten.
 */
export async function findOrCreateCustomer(tx, { email, firstName, lastName, phone }) {
  const select = { id: true, status: true, deletedAt: true }
  let user = await tx.user.findUnique({ where: { email }, select })
  if (!user) {
    const role = await tx.role.findUnique({ where: { name: CUSTOMER_ROLE }, select: { id: true } })
    if (!role) throw new CommerceError('customer_role_missing', 'Website role Customer is not seeded')
    try {
      user = await tx.user.create({ data: { email, firstName, lastName, phone, roleId: role.id, password: null }, select })
    } catch (e) {
      if (e?.code !== 'P2002') throw e
      user = await tx.user.findUnique({ where: { email }, select }) // created concurrently
    }
  }
  if (!user || !user.status || user.deletedAt) throw new CommerceError('customer_inactive', 'This customer account cannot place orders')
  return user.id
}

/**
 * input: validated checkoutSchema output.
 * settings: { currency, allowCashOnDelivery, shippingMinor(method, subtotalMinor), taxMinor(order), now }
 * Returns { order, replayed }.
 */
export async function placeOrder(db, input, settings) {
  if (!/^[A-Z]{3}$/.test(settings.currency ?? '')) throw new CommerceError('currency_not_configured')
  if (!isPaymentMethod(input.paymentMethod)) throw new CommerceError('invalid_payment_method')
  if (input.paymentMethod === 'cash_on_delivery' && !settings.allowCashOnDelivery) throw new CommerceError('payment_method_disabled')
  const now = settings.now ?? new Date()

  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { checkoutToken: input.checkoutToken } })
      if (existing) return { order: existing, replayed: true }

      let coupon = null
      if (input.couponCode) {
        const code = normalizeCouponCode(input.couponCode)
        coupon = code ? await lockCoupon(tx, code) : null
        if (!coupon) throw new CommerceError('coupon_invalid', 'This coupon code is not valid')
      }

      const products = await lockProducts(tx, input.lines.map((l) => l.productId))
      const { deductions, deductedProductIds } = planDeductions(input.lines, products)

      const needsOptions = input.lines.some((l) => products.get(String(l.productId))?.type === 'custom')
      const activeOptions = needsOptions
        ? await tx.customizerOption.findMany({ where: { status: 'active' }, select: { part: true, optionKey: true, name: true, status: true } })
        : []

      const lines = input.lines.map((l) => {
        const p = products.get(String(l.productId))
        const priceMinor = unitPriceMinor(p)
        if (!(priceMinor > 0)) throw new CommerceError('product_unavailable', 'A product has no confirmed price')
        const { snapshot } = normalizeCustomOptions(p.type, l.options, activeOptions)
        return { product: p, options: snapshot, ...computeLine({ priceMinor, quantity: l.quantity }) }
      })

      const itemsSubtotal = lines.reduce((s, l) => s + l.totalMinor, 0)
      let discountMinor = 0
      if (coupon) {
        const verdict = evaluateCoupon(coupon, { subtotalMinor: itemsSubtotal, now })
        if (!verdict.ok) throw new CommerceError(`coupon_${verdict.reason}`, 'This coupon cannot be applied to this order')
        discountMinor = verdict.discountMinor
      }
      const shippingMinor = settings.shippingMinor ? settings.shippingMinor(input.shippingMethod, itemsSubtotal) : 0
      const taxMinor = settings.taxMinor ? settings.taxMinor({ subtotalMinor: itemsSubtotal, discountMinor, shipping: input.shipping }) : 0
      const totals = computeOrder({ lines, discountMinor, shippingMinor, taxMinor })

      const userId = await findOrCreateCustomer(tx, {
        email: input.email,
        firstName: input.billing.firstName,
        lastName: input.billing.lastName,
        phone: input.billing.phone,
      })

      await applyDeductions(tx, deductions)
      if (coupon) await consumeCoupon(tx, coupon.id)

      const created = await tx.order.create({
        data: {
          userId,
          orderNumber: `PENDING-${randomUUID()}`, // replaced below once the id is known
          billingDetails: input.billing,
          shippingDetails: input.shipping,
          shippingMethod: input.shippingMethod,
          shippingAmount: toAmount(totals.shippingMinor),
          discount: toAmount(totals.discountMinor),
          subtotal: toAmount(totals.subtotalMinor),
          taxAmount: toAmount(totals.taxMinor),
          total: toAmount(totals.totalMinor),
          currency: settings.currency,
          paymentMethod: input.paymentMethod,
          notes: input.notes,
          checkoutToken: input.checkoutToken,
          couponCode: coupon ? coupon.code : null,
          placedAt: now,
        },
        select: { id: true },
      })
      const order = await tx.order.update({
        where: { id: created.id },
        data: { orderNumber: formatOrderNumber(created.id) },
      })

      await tx.orderItem.createMany({
        data: lines.map((l) => ({
          orderId: order.id,
          productId: l.product.id,
          productName: l.product.name,
          sku: l.product.sku,
          productImage: l.product.mainImage,
          price: toAmount(l.priceMinor),
          quantity: l.quantity,
          subtotal: toAmount(l.subtotalMinor),
          discount: toAmount(l.discountMinor),
          total: toAmount(l.totalMinor),
          options: l.options ?? undefined,
          stockDeducted: deductedProductIds.has(String(l.product.id)),
        })),
      })

      await tx.payment.create({
        data: { orderId: order.id, paymentMethod: input.paymentMethod, amount: toAmount(totals.totalMinor), status: 'pending' },
      })

      return { order, replayed: false }
    })
  } catch (e) {
    // Two submits of the same attempt raced: the loser returns the winner's order.
    if (isCheckoutTokenConflict(e)) {
      const order = await db.order.findUnique({ where: { checkoutToken: input.checkoutToken } })
      if (order) return { order, replayed: true }
    }
    throw e
  }
}
