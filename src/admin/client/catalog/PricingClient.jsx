'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PricingView from '@/admin/views/PricingView'
import { ToastViewport } from '@/admin/components/Alert'
import useToasts from '@/admin/hooks/useToasts'
import PriceEditModal from './PriceEditModal'

// products: toAdminRow rows. canEdit: has product.price.update (cosmetic; server enforces).
// updatePriceAction: the updatePrice server action.
export default function PricingClient({ products = [], canEdit = false, updatePriceAction, badge }) {
  const router = useRouter()
  const { toasts, push, dismiss } = useToasts()
  const [editing, setEditing] = useState(null)
  const enabled = canEdit && Boolean(updatePriceAction)
  return (
    <>
      <PricingView products={products} canEdit={enabled} onEditPrice={enabled ? setEditing : undefined} badge={badge} />
      {editing && (
        <PriceEditModal
          key={editing.id}
          open
          product={editing}
          action={updatePriceAction}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            push({ tone: 'success', title: 'Price updated', message: editing.name })
            setEditing(null)
            router.refresh()
          }}
        />
      )}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
