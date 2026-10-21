'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/admin/components/Modal'
import Button from '@/admin/components/Button'
import { Alert } from '@/admin/components/Alert'
import { FormField, Input, Select, Textarea } from '@/admin/components/FormField'
import { INVENTORY_REASONS, MAX_STOCK, errorOf } from './format'

const INT_RE = /^-?\d+$/

// item: { id, name, onHand (null = not tracked), trackingMode? }.
// action(productId, { setQuantity } | { delta }, plus reason, note) is adjustInventory.
// trackingAction (optional) is setTrackingMode: used to start tracking an untracked
// product with the counted quantity, instead of adjustInventory.
// Mount with key={item.id} so the form resets per item.
export default function InventoryAdjustModal({ open, onClose, item, action, trackingAction, onSuccess }) {
  const tracked = Number.isInteger(item?.onHand) && (!item?.trackingMode || item.trackingMode === 'TRACKED')
  const [mode, setMode] = useState('set')
  const [qty, setQty] = useState(tracked ? String(item.onHand) : '')
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState(tracked ? 'RESTOCK' : 'INITIAL_COUNT')
  const [note, setNote] = useState('')
  const [error, setError] = useState(null)
  const [pending, startTransition] = useTransition()

  const effectiveMode = tracked ? mode : 'set'
  const raw = (effectiveMode === 'set' ? qty : delta).trim()
  const n = INT_RE.test(raw) ? Number(raw) : null
  let fieldError
  let result = null
  if (effectiveMode === 'set') {
    if (n === null || n < 0 || n > MAX_STOCK) fieldError = `Enter a whole number from 0 to ${MAX_STOCK.toLocaleString('en-US')}.`
    else result = n
  } else if (n === null || n === 0 || Math.abs(n) > MAX_STOCK) {
    fieldError = 'Enter a non-zero whole number (use - to remove stock).'
  } else if (item.onHand + n < 0) {
    fieldError = 'Stock cannot go below zero.'
  } else {
    result = item.onHand + n
  }
  const noteError = note.trim().length > 255 ? 'Keep the note under 255 characters.' : undefined
  const unchanged = tracked && result === item.onHand
  const invalid = Boolean(fieldError || noteError) || unchanged

  const close = () => { if (!pending) onClose?.() }
  const submit = (e) => {
    e.preventDefault()
    if (invalid || !item || !action) return
    setError(null)
    const payload = effectiveMode === 'set' ? { setQuantity: n } : { delta: n }
    startTransition(async () => {
      try {
        const res = !tracked && trackingAction
          ? await trackingAction(item.id, 'TRACKED', { quantity: n, reason })
          : await action(item.id, { ...payload, reason, note: note.trim() || null })
        if (res?.ok) onSuccess?.()
        else setError(errorOf(res))
      } catch {
        setError(errorOf(null))
      }
    })
  }

  const modeOptions = tracked
    ? [{ value: 'set', label: 'Set quantity' }, { value: 'delta', label: 'Adjust by delta' }]
    : [{ value: 'set', label: 'Set quantity' }]

  return (
    <Modal
      open={open}
      onClose={close}
      title={item ? `Adjust stock · ${item.name}` : 'Adjust stock'}
      description="Every adjustment is recorded in the stock ledger."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={pending}>Cancel</Button>
          <Button variant="primary" type="submit" form="va-inventory-form" loading={pending} disabled={invalid}>Save</Button>
        </>
      }
    >
      <form id="va-inventory-form" className="va-stack" onSubmit={submit} noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        {!tracked && <Alert tone="info">Stock is not tracked for this product. Saving a counted quantity starts tracking it.</Alert>}
        <FormField label="Mode">
          <Select value={effectiveMode} onChange={(e) => setMode(e.target.value)} disabled={pending || !tracked} options={modeOptions} />
        </FormField>
        {effectiveMode === 'set' ? (
          <FormField label="Quantity on hand" required error={qty ? fieldError : undefined}>
            <Input inputMode="numeric" autoComplete="off" value={qty} onChange={(e) => setQty(e.target.value)} disabled={pending} />
          </FormField>
        ) : (
          <FormField label="Change (+/-)" required hint="e.g. 5 or -2" error={delta ? fieldError : undefined}>
            <Input inputMode="numeric" autoComplete="off" value={delta} onChange={(e) => setDelta(e.target.value)} disabled={pending} />
          </FormField>
        )}
        <FormField label="Reason" required>
          <Select value={reason} onChange={(e) => setReason(e.target.value)} options={INVENTORY_REASONS} disabled={pending} />
        </FormField>
        <FormField label="Note" hint="Optional, up to 255 characters." error={noteError}>
          <Textarea rows={2} maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} disabled={pending} />
        </FormField>
        <p className="va-hint" aria-live="polite">
          {tracked ? item.onHand : 'Not tracked'} → {result ?? '…'}
          {unchanged ? ' (no change)' : ''}
        </p>
      </form>
    </Modal>
  )
}
