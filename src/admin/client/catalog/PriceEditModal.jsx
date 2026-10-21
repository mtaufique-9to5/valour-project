'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/admin/components/Modal'
import Button from '@/admin/components/Button'
import { Alert } from '@/admin/components/Alert'
import { FormField, Input, Select, Textarea } from '@/admin/components/FormField'
import { CURRENCIES, dollarsToAmountString, formatDollars, formatMinor, errorOf, parsePrice } from './format'

// product: { id, name, price (dollars|null) }. action(productId, { amount, reason })
// is the updatePrice server action. A price is always required (> 0).
// Mount with key={product.id} so the form resets per product.
export default function PriceEditModal({ open, onClose, product, action, onSuccess }) {
  const [amount, setAmount] = useState(dollarsToAmountString(product?.price))
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState(null)
  const [pending, startTransition] = useTransition()

  const parsed = parsePrice(amount)
  const amountError = parsed.error
  const r = reason.trim()
  const reasonError = r.length < 3 ? 'Give a reason (at least 3 characters).' : r.length > 255 ? 'Keep the reason under 255 characters.' : undefined
  const oldMinor = Number.isFinite(product?.price) ? Math.round(product.price * 100) : null
  const unchanged = !amountError && parsed.minor === oldMinor
  const invalid = Boolean(amountError || reasonError) || unchanged

  const close = () => { if (!pending) onClose?.() }
  const submit = (e) => {
    e.preventDefault()
    setTouched(true)
    if (invalid || !product || !action) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await action(product.id, { amount: parsed.amount, reason: r })
        if (res?.ok) onSuccess?.()
        else setError(errorOf(res))
      } catch {
        setError(errorOf(null))
      }
    })
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={product ? `Change price · ${product.name}` : 'Change price'}
      description="Every price change is recorded with your reason."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={pending}>Cancel</Button>
          <Button variant="primary" type="submit" form="va-price-form" loading={pending} disabled={invalid}>Save price</Button>
        </>
      }
    >
      <form id="va-price-form" className="va-stack" onSubmit={submit} noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="va-price-row">
          <FormField label="New price" required hint="Example: 499.99" error={touched || amount ? amountError : undefined}>
            <Input inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={pending} />
          </FormField>
          <FormField label="Currency" hint="USD only for now.">
            <Select value="USD" options={CURRENCIES} disabled aria-readonly="true" onChange={() => {}} />
          </FormField>
        </div>
        <FormField label="Reason" required error={touched || reason ? reasonError : undefined}>
          <Textarea rows={2} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} disabled={pending} />
        </FormField>
        <p className="va-hint" aria-live="polite">
          {formatDollars(product?.price)} → {amountError ? '…' : formatMinor(parsed.minor)}
          {unchanged ? ' (no change)' : ''}
        </p>
      </form>
    </Modal>
  )
}
