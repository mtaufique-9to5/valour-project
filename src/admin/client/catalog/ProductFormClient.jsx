'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import ProductFormView from '@/admin/views/ProductFormView'
import ImageManager from '@/admin/components/ImageManager'
import { ConfirmDialog } from '@/admin/components/Modal'
import { ToastViewport } from '@/admin/components/Alert'
import useToasts from '@/admin/hooks/useToasts'
import PriceEditModal from './PriceEditModal'
import InventoryAdjustModal from './InventoryAdjustModal'
import { buildDetailUpdate, errorOf, toProductInput } from './format'


const LEAVE_MESSAGE = 'You have unsaved changes. Leave without saving?'

/**
 * Wires ProductFormView + ImageManager to the catalog server actions.
 *
 * mode: 'new' | 'edit'. product: getProduct() result (edit). categories: [{ id, name }].
 * Permissions (cosmetic; the server enforces): canEdit (product.create/update),
 * canEditPrice (product.price.update), canEditStock (inventory.update).
 * Actions: createProductAction, updateProductAction, setProductStatusAction,
 * updatePriceAction, adjustInventoryAction, setTrackingModeAction,
 * deleteProductImageAction, setPrimaryImageAction, reorderImagesAction.
 * upload: optional ImageManager uploader override (design preview).
 * backHref / editHref(id): navigation targets.
 */
export default function ProductFormClient({
  mode = 'edit',
  product: rawProduct = null,
  categories = [],
  canEdit = false,
  canEditPrice = false,
  canEditStock = false,
  createProductAction,
  updateProductAction,
  setProductStatusAction,
  updatePriceAction,
  adjustInventoryAction,
  setTrackingModeAction,
  deleteProductImageAction,
  setPrimaryImageAction,
  reorderImagesAction,
  upload,
  backHref = '/admin/products',
  editHref = (id) => `/admin/products/${encodeURIComponent(id)}`,
  badge,
}) {
  const router = useRouter()
  // getProduct returns priceAmount ('499.99' | null); views work in dollars.
  const product = rawProduct && {
    ...rawProduct,
    price: Number.isFinite(rawProduct.price) ? rawProduct.price : rawProduct.priceAmount ? Number(rawProduct.priceAmount) : null,
  }
  const { toasts, push, dismiss } = useToasts()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [images, setImages] = useState(product?.images ?? [])
  const [prevImages, setPrevImages] = useState(product?.images)
  const [modal, setModal] = useState(null) // 'price' | 'stock' | 'start' | 'stop'
  const [stopping, setStopping] = useState(false)
  const dirty = useRef(false)
  const isNew = mode === 'new'

  if (product?.images !== prevImages) {
    setPrevImages(product?.images)
    setImages(product?.images ?? [])
  }

  const onDirtyChange = useCallback((d) => {
    dirty.current = d
  }, [])

  // Unsaved-changes guard for reloads, tab closes and full navigations.
  useEffect(() => {
    const handler = (e) => {
      if (!dirty.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const leave = () => {
    if (dirty.current && !window.confirm(LEAVE_MESSAGE)) return
    dirty.current = false
    router.push(backHref)
  }

  const fail = (res) => {
    setError(errorOf(res))
    setFieldErrors(res && typeof res.fieldErrors === 'object' && res.fieldErrors ? res.fieldErrors : {})
  }

  const onSubmit = (values, { changed }) => {
    setError(null)
    setFieldErrors({})
    startTransition(async () => {
      try {
        if (isNew) {
          const res = await createProductAction?.({ ...toProductInput(values), status: 'DRAFT' })
          if (res?.ok && res.id != null) {
            dirty.current = false
            push({ tone: 'success', title: 'Draft created', message: 'Now add images, then publish.' })
            router.push(editHref(res.id))
          } else fail(res)
          return
        }
        const details = buildDetailUpdate(values, changed)
        if (Object.keys(details).length) {
          const res = await updateProductAction?.(product.id, details)
          if (!res?.ok) return fail(res)
        }
        if (changed.includes('status')) {
          const res = setProductStatusAction
            ? await setProductStatusAction(product.id, values.status)
            : await updateProductAction?.(product.id, { status: values.status })
          if (!res?.ok) return fail(res)
        }
        dirty.current = false
        push({ tone: 'success', title: 'Product saved' })
        router.refresh()
      } catch {
        fail(null)
      }
    })
  }

  const done = (title) => {
    push({ tone: 'success', title })
    setModal(null)
    router.refresh()
  }

  const stopTracking = async () => {
    setStopping(true)
    try {
      const res = await setTrackingModeAction(product.id, 'NOT_TRACKED', { reason: 'CORRECTION' })
      if (res?.ok) done('Stock tracking stopped')
      else push({ tone: 'danger', title: 'Not saved', message: errorOf(res) })
    } catch {
      push({ tone: 'danger', title: 'Not saved', message: errorOf(null) })
    } finally {
      setStopping(false)
    }
  }

  const stockItem = product && {
    id: product.id,
    name: product.name,
    onHand: product.trackingMode === 'NOT_TRACKED' ? null : product.quantity ?? null,
    trackingMode: product.trackingMode,
  }
  const priceEnabled = canEditPrice && Boolean(updatePriceAction)
  const stockEnabled = canEditStock && Boolean(adjustInventoryAction || setTrackingModeAction)

  return (
    <>
      <ProductFormView
        key={isNew ? 'new' : `${product?.id}-${product?.updatedAt ?? ''}`}
        mode={mode}
        product={product}
        categories={categories}
        images={images}
        canEdit={canEdit && Boolean(isNew ? createProductAction : updateProductAction)}
        canEditPrice={priceEnabled}
        canEditStock={stockEnabled}
        saving={pending}
        error={error}
        fieldErrors={fieldErrors}
        onSubmit={onSubmit}
        onCancel={leave}
        onDirtyChange={onDirtyChange}
        onEditPrice={priceEnabled ? () => setModal('price') : undefined}
        onAdjustStock={canEditStock && adjustInventoryAction ? () => setModal('stock') : undefined}
        onStartTracking={canEditStock && setTrackingModeAction ? () => setModal('start') : undefined}
        onStopTracking={canEditStock && setTrackingModeAction ? () => setModal('stop') : undefined}
        badge={badge}
        imageManager={
          !isNew && (
            <ImageManager
              productId={product?.id}
              productName={product?.name}
              images={images}
              canEdit={canEdit && Boolean(updateProductAction)}
              upload={upload}
              deleteImageAction={deleteProductImageAction}
              setPrimaryAction={setPrimaryImageAction}
              reorderAction={reorderImagesAction}
              onImagesChange={setImages}
              onNotify={push}
            />
          )
        }
      />

      {modal === 'price' && (
        <PriceEditModal open product={product} action={updatePriceAction} onClose={() => setModal(null)} onSuccess={() => done('Price updated')} />
      )}
      {(modal === 'stock' || modal === 'start') && stockItem && (
        <InventoryAdjustModal
          key={modal}
          open
          item={modal === 'start' ? { ...stockItem, onHand: null, trackingMode: 'NOT_TRACKED' } : stockItem}
          action={adjustInventoryAction ?? (() => Promise.resolve({ ok: false, error: 'Stock adjustments are not available.' }))}
          trackingAction={setTrackingModeAction}
          onClose={() => setModal(null)}
          onSuccess={() => done(modal === 'start' ? 'Stock tracking started' : 'Stock updated')}
        />
      )}
      <ConfirmDialog
        open={modal === 'stop'}
        onClose={() => !stopping && setModal(null)}
        onConfirm={stopTracking}
        loading={stopping}
        tone="primary"
        title="Stop tracking stock?"
        message="The product will no longer show stock levels or go out of stock. The current quantity stays in the ledger history."
        confirmLabel="Stop tracking"
      />
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
