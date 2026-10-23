'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import InventoryView from '@/admin/views/InventoryView'
import { Modal } from '@/admin/components/Modal'
import { FormField, Input, Toggle } from '@/admin/components/FormField'
import Button from '@/admin/components/Button'
import { Alert, ToastViewport } from '@/admin/components/Alert'
import useToasts from '@/admin/hooks/useToasts'
import { MAX_STOCK } from './format'

// Inventory page on watchwebsite products: stock tracking on/off and the
// quantity in stock. The quantity the admin saw is sent along, so a change made
// meanwhile (e.g. a checkout) is reported instead of being overwritten.
export default function StockClient({ items = [], setInventoryAction }) {
  const router = useRouter()
  const { toasts, push, dismiss } = useToasts()
  const [edit, setEdit] = useState(null) // { row, trackStock, stock, expected, error }
  const [saving, setSaving] = useState(false)

  async function save() {
    if (edit.trackStock && !(/^\d+$/.test(edit.stock) && Number(edit.stock) <= MAX_STOCK)) {
      setEdit((e) => ({ ...e, error: `Enter a whole number from 0 to ${MAX_STOCK.toLocaleString('en-US')}.` }))
      return
    }
    setSaving(true)
    const res = await setInventoryAction(edit.row.id, { trackStock: edit.trackStock, expected: edit.expected, stock: Number(edit.stock) })
    setSaving(false)
    if (!res?.ok) { setEdit((e) => ({ ...e, error: res?.error || 'Could not save the stock.' })); return }
    push({ tone: 'success', title: 'Stock saved', message: edit.row.name })
    setEdit(null)
    router.refresh()
  }

  return (
    <>
      <InventoryView
        items={items}
        onAdjust={(row) => setEdit({ row, trackStock: row.trackingMode === 'TRACKED', stock: String(row.stockValue), expected: row.stockValue, error: null })}
      />
      <Modal
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        title={edit ? `Stock for ${edit.row.name}` : ''}
        footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save stock</Button></>}
      >
        {edit && (
          <form className="va-stack" onSubmit={(e) => { e.preventDefault(); save() }}>
            {edit.error && <Alert tone="danger">{edit.error}</Alert>}
            <Toggle label="Track stock" description="Off: never deducted at checkout." checked={edit.trackStock} onChange={(on) => setEdit((x) => ({ ...x, trackStock: on }))} />
            {edit.trackStock && (
              <FormField label="Quantity in stock" required hint={`Currently ${edit.expected}.`}>
                <Input inputMode="numeric" value={edit.stock} onChange={(e) => setEdit((x) => ({ ...x, stock: e.target.value }))} />
              </FormField>
            )}
          </form>
        )}
      </Modal>
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
