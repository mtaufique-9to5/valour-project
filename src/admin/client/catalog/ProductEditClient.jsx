'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import ProductEditView from '@/admin/views/ProductEditView'
import { ToastViewport } from '@/admin/components/Alert'
import useToasts from '@/admin/hooks/useToasts'
import PriceEditModal from './PriceEditModal'
import { DB_TO_STATUS, STATUS_TO_DB, errorOf } from './format'

const nullable = (s) => {
  const t = (s ?? '').trim()
  return t === '' ? null : t
}

// Only productUpdateSchema fields the view edits (name, subtitle, status), and only
// those that changed. collection/description/images from the view are dropped.
export function buildProductUpdate(product, values) {
  const out = {}
  const name = (values.name ?? '').trim()
  if (name && name !== product.name) out.name = name
  const subtitle = nullable(values.subtitle)
  if (subtitle !== (product.subtitle ?? null)) out.subtitle = subtitle
  const status = STATUS_TO_DB[values.status]
  if (status && status !== STATUS_TO_DB[product.status]) out.status = status
  return out
}

// product: getProduct() result (status 'Draft'|'Active'|'Archived', price dollars|null).
// updateProductAction(id, input), updatePriceAction(id, { amount, reason }): server actions.
// canEditPrice: has product.price.update (cosmetic; server enforces).
export default function ProductEditClient({ product, updateProductAction, updatePriceAction, canEditPrice = false, backHref = '/admin/watches', badge }) {
  const router = useRouter()
  const { toasts, push, dismiss } = useToasts()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(null)
  const [priceOpen, setPriceOpen] = useState(false)
  const priceEnabled = canEditPrice && Boolean(updatePriceAction)
  // Images are not editable via productUpdateSchema; hide the editor's list rather than imply saving.
  const viewProduct = {
    ...product,
    collection: product.collection ?? '',
    status: DB_TO_STATUS[String(product.status).toUpperCase()] ?? 'Draft',
    images: [],
  }

  const onSave = (values) => {
    const input = buildProductUpdate(product, values)
    if (Object.keys(input).length === 0) {
      push({ tone: 'info', title: 'Nothing to save' })
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const res = await updateProductAction(product.id, input)
        if (res?.ok) {
          push({ tone: 'success', title: 'Product saved' })
          router.refresh()
        } else {
          setError(errorOf(res))
        }
      } catch {
        setError(errorOf(null))
      }
    })
  }

  return (
    <>
      <ProductEditView
        key={product.updatedAt ?? product.id}
        product={viewProduct}
        collections={product.collection ? [product.collection] : []}
        onSave={updateProductAction ? onSave : undefined}
        onCancel={() => router.push(backHref)}
        saving={pending}
        error={error}
        canEditPrice={priceEnabled}
        onEditPrice={priceEnabled ? () => setPriceOpen(true) : undefined}
        badge={badge}
      />
      {priceOpen && (
        <PriceEditModal
          open
          product={product}
          action={updatePriceAction}
          onClose={() => setPriceOpen(false)}
          onSuccess={() => {
            push({ tone: 'success', title: 'Price updated' })
            setPriceOpen(false)
            router.refresh()
          }}
        />
      )}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
