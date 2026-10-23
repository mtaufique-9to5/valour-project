'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PricingView from '@/admin/views/PricingView'
import { Modal } from '@/admin/components/Modal'
import { FormField, Input } from '@/admin/components/FormField'
import Button from '@/admin/components/Button'
import { Alert, ToastViewport } from '@/admin/components/Alert'
import useToasts from '@/admin/hooks/useToasts'
import { parsePrice } from './format'

// Pricing page on watchwebsite products: base and sale price per product
// (sale price optional, never above the base price; the server re-checks).
export default function PricesClient({ products = [], setPricesAction }) {
  const router = useRouter()
  const { toasts, push, dismiss } = useToasts()
  const [edit, setEdit] = useState(null) // { row, basePrice, salePrice, error }
  const [saving, setSaving] = useState(false)

  async function save() {
    const base = parsePrice(edit.basePrice)
    const sale = edit.salePrice.trim() ? parsePrice(edit.salePrice) : null
    const problem = base.error || sale?.error || (sale && sale.minor > base.minor ? 'The sale price cannot be higher than the base price.' : null)
    if (problem) { setEdit((e) => ({ ...e, error: problem })); return }
    setSaving(true)
    const res = await setPricesAction(edit.row.id, { basePrice: base.amount, salePrice: sale?.amount ?? null })
    setSaving(false)
    if (!res?.ok) { setEdit((e) => ({ ...e, error: res?.error || 'Could not save the prices.' })); return }
    push({ tone: 'success', title: 'Prices saved', message: edit.row.name })
    setEdit(null)
    router.refresh()
  }

  return (
    <>
      <PricingView products={products} canEdit onEditPrice={(row) => setEdit({ row, basePrice: row.basePrice, salePrice: row.salePrice, error: null })} />
      <Modal
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        title={edit ? `Prices for ${edit.row.name}` : ''}
        description="Customers pay the sale price when one is set."
        footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save prices</Button></>}
      >
        {edit && (
          <form className="va-stack" onSubmit={(e) => { e.preventDefault(); save() }}>
            {edit.error && <Alert tone="danger">{edit.error}</Alert>}
            <FormField label="Base price" required><Input inputMode="decimal" value={edit.basePrice} onChange={(e) => setEdit((x) => ({ ...x, basePrice: e.target.value }))} /></FormField>
            <FormField label="Sale price" hint="Leave empty for no sale."><Input inputMode="decimal" value={edit.salePrice} onChange={(e) => setEdit((x) => ({ ...x, salePrice: e.target.value }))} /></FormField>
          </form>
        )}
      </Modal>
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
