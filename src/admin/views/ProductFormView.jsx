'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { ArrowLeft, CircleCheck, CircleDashed, ImagePlus, Lock, Pencil, Save, SlidersHorizontal } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Card } from '../components/Card'
import Button from '../components/Button'
import { Alert } from '../components/Alert'
import { Badge, StatusPill } from '../components/Badge'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import {
  CURRENCIES,
  DESCRIPTION_MAX,
  NAME_MAX,
  NO_PRICE_WARNING,
  PRODUCT_STATUS_OPTIONS,
  PRODUCT_TYPES,
  SKU_MAX,
  STATUS_LABEL,
  TRACKING_MODES,
  formatDollars,
  normalizeSku,
  productToValues,
  publishChecklist,
  validateProductValues,
  valuesDiffer,
} from '../client/catalog/format'

function RadioGroup({ legend, name, value, options, onChange, disabled, hint, error }) {
  const id = useId()
  const describedBy = [hint && `${id}-h`, error && `${id}-e`].filter(Boolean).join(' ') || undefined
  return (
    <fieldset className="va-field" aria-describedby={describedBy}>
      <legend className="va-label">{legend}</legend>
      <div className="va-radio-group" role="presentation">
        {options.map((o) => (
          <label key={o.value} className="va-radio">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} disabled={disabled} />
            {o.label}
          </label>
        ))}
      </div>
      {hint && <span id={`${id}-h`} className="va-hint">{hint}</span>}
      {error && <span id={`${id}-e`} className="va-error-text">{error}</span>}
    </fieldset>
  )
}

/**
 * Product create/edit form. Owns the field state; the parent performs the save.
 *
 * mode: 'new' | 'edit'. product: getProduct() result (edit) or null (new).
 * categories: [{ id, name }]. images: current images (edit; drives the checklist).
 * canEdit: may change details (product.create / product.update).
 * onSubmit(values, { changed }) -> parent saves; values are productToValues-shaped.
 * fieldErrors: { field: message } from the server; error: form-level message.
 * Price (edit): read-only here; onEditPrice opens PriceEditModal (canEditPrice).
 * Stock (edit): onAdjustStock / onStartTracking / onStopTracking (canEditStock).
 * imageManager: node rendered in the Images card (edit only).
 * onDirtyChange(bool): lets the parent know about unsaved changes.
 */
export default function ProductFormView({
  mode = 'edit',
  product = null,
  categories = [],
  images = [],
  canEdit = true,
  canEditPrice = false,
  canEditStock = false,
  saving = false,
  error,
  fieldErrors = {},
  onSubmit,
  onCancel,
  onDirtyChange,
  onEditPrice,
  onAdjustStock,
  onStartTracking,
  onStopTracking,
  imageManager,
  badge,
}) {
  const isNew = mode === 'new'
  const initial = useMemo(() => productToValues(product), [product])
  const [values, setValues] = useState(initial)
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const dirty = valuesDiffer(values, initial)
  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  const set = (key, value) => setValues((v) => ({ ...v, [key]: value }))
  const bind = (key, transform = (x) => x) => ({
    value: values[key],
    onChange: (e) => set(key, transform(e.target.value)),
    onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
    disabled: !canEdit || saving,
  })

  const clientErrors = validateProductValues(values, { isNew })
  if (!isNew) delete clientErrors.price // legacy drafts may lack a price; publishing is gated below
  const checklist = publishChecklist(values, isNew ? [] : images)
  const publishable = checklist.every((c) => c.ok)
  if (values.status === 'ACTIVE' && !publishable && values.status !== initial.status) {
    clientErrors.status = 'Complete the publish checklist before setting the product to Active.'
  }
  const errorFor = (key) => fieldErrors?.[key] ?? (submitted || touched[key] ? clientErrors[key] : undefined)
  const hasClientErrors = Object.keys(clientErrors).length > 0

  const typeLocked = !isNew && initial.status !== 'DRAFT'
  const tracked = isNew ? values.trackingMode === 'TRACKED' : product?.trackingMode !== 'NOT_TRACKED'
  const statusOptions = isNew
    ? PRODUCT_STATUS_OPTIONS.filter((o) => o.value === 'DRAFT')
    : initial.status === 'ARCHIVED'
      ? PRODUCT_STATUS_OPTIONS.filter((o) => o.value !== 'ACTIVE') // archived products can only go back to Draft
      : PRODUCT_STATUS_OPTIONS.map((o) => (o.value === 'ACTIVE' && !publishable && initial.status !== 'ACTIVE' ? { ...o, label: 'Active (checklist incomplete)' } : o))

  const submit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    if (hasClientErrors || !canEdit) return
    const changed = Object.keys(values).filter((k) => String(values[k] ?? '') !== String(initial[k] ?? ''))
    onSubmit?.(values, { changed })
  }

  const categoryOptions = [{ value: '', label: 'None' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]
  const statusLabel = STATUS_LABEL[initial.status]

  return (
    <>
      <PageHeader
        eyebrow={`Catalog · ${values.type === 'STRAP' ? 'Straps' : 'Watches'}`}
        title={isNew ? 'New product' : product?.name || 'Edit product'}
        description={isNew ? 'Products are created as drafts. Add images on the next screen, then publish.' : product?.sku ? `SKU ${product.sku}` : undefined}
        badge={
          <>
            {!isNew && <StatusPill status={statusLabel} tone={initial.status === 'ACTIVE' ? 'success' : initial.status === 'ARCHIVED' ? 'neutral' : 'warning'} />}
            {badge}
          </>
        }
        actions={onCancel && <Button variant="ghost" icon={ArrowLeft} onClick={onCancel}>Back to products</Button>}
      />

      <form className="va-stack" onSubmit={submit} noValidate aria-label={isNew ? 'New product' : 'Edit product'}>
        {error && <Alert tone="danger" title="Not saved">{error}</Alert>}
        {submitted && hasClientErrors && <Alert tone="warning">Fix the highlighted fields and try again.</Alert>}
        {!canEdit && <Alert tone="info" title="Read-only">You can view this product but not change it.</Alert>}
        {canEdit && !isNew && initial.status === 'ARCHIVED' && <Alert tone="info" title="Archived">Set the status back to Draft and save before editing other details.</Alert>}

        <div className="va-grid va-grid-main">
          <div className="va-stack">
            <Card title="Details">
              <div className="va-form-grid">
                <FormField label="Name" required error={errorFor('name')} className="va-span-full">
                  <Input {...bind('name')} maxLength={NAME_MAX} autoComplete="off" />
                </FormField>
                <FormField label="SKU" required hint={`Letters, digits and hyphens; up to ${SKU_MAX} characters.`} error={errorFor('sku')}>
                  <Input {...bind('sku', normalizeSku)} maxLength={SKU_MAX} autoComplete="off" spellCheck={false} className="va-mono" />
                </FormField>
                <FormField label="Category" error={errorFor('categoryId')}>
                  <Select {...bind('categoryId')} options={categoryOptions} />
                </FormField>
                <div className="va-span-full">
                  <RadioGroup
                    legend="Type"
                    name="product-type"
                    value={values.type}
                    options={PRODUCT_TYPES}
                    onChange={(v) => set('type', v)}
                    disabled={!canEdit || saving || typeLocked}
                    hint={typeLocked ? 'The type is locked once a product leaves Draft.' : undefined}
                    error={errorFor('type')}
                  />
                </div>
                <FormField label="Description" hint="Shown on the product page." error={errorFor('description')} className="va-span-full">
                  <Textarea {...bind('description')} rows={6} maxLength={DESCRIPTION_MAX} />
                </FormField>
              </div>
            </Card>

            <Card title="Images" subtitle={isNew ? undefined : 'The main image is used on cards and as the first product photo.'}>
              {isNew ? (
                <Alert tone="info" title="Images come next">
                  <ImagePlus size={14} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /> Create the draft first. You will be taken to its edit page, where you can upload the main image and gallery.
                </Alert>
              ) : (
                imageManager
              )}
            </Card>
          </div>

          <div className="va-stack">
            <Card title="Status">
              <div className="va-stack">
                <FormField label="Status" error={errorFor('status')} hint={isNew ? 'New products always start as Draft.' : undefined}>
                  <Select {...bind('status')} options={statusOptions} disabled={!canEdit || saving || isNew} />
                </FormField>
                <div>
                  <p className="va-label" id="va-publish-checklist">Publish checklist</p>
                  <ul className="va-checklist" aria-labelledby="va-publish-checklist">
                    {checklist.map((c) => (
                      <li key={c.key}>
                        {c.ok ? <CircleCheck size={16} className="va-ok" aria-hidden="true" /> : <CircleDashed size={16} className="va-missing" aria-hidden="true" />}
                        <span>{c.label}</span>
                        <span className="va-sr-only">{c.ok ? 'done' : 'missing'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            <Card title="Price">
              <div className="va-stack">
                <div className="va-price-row">
                  {isNew ? (
                    <FormField label="Price" required hint="Example: 499.99" error={errorFor('price')}>
                      <Input {...bind('price')} inputMode="decimal" autoComplete="off" placeholder="0.00" />
                    </FormField>
                  ) : (
                    <FormField label="Price" hint="Changed with a reason; every change is audit-logged.">
                      <Input value={product?.price != null ? formatDollars(product.price) : ''} placeholder="Not set" readOnly />
                    </FormField>
                  )}
                  <FormField label="Currency" hint="USD only for now.">
                    <Select value="USD" options={CURRENCIES} disabled onChange={() => {}} />
                  </FormField>
                </div>
                {!isNew && product?.price == null && <Badge tone="warning" dot>{NO_PRICE_WARNING}</Badge>}
                {!isNew && (canEditPrice && onEditPrice ? (
                  <Button icon={Pencil} onClick={onEditPrice}>{product?.price == null ? 'Set price' : 'Change price'}</Button>
                ) : (
                  <span className="va-hint"><Lock size={12} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-1px' }} /> Requires product.price.update</span>
                ))}
              </div>
            </Card>

            <Card title="Inventory">
              <div className="va-stack">
                {isNew ? (
                  <>
                    <RadioGroup legend="Stock tracking" name="tracking-mode" value={values.trackingMode} options={TRACKING_MODES} onChange={(v) => set('trackingMode', v)} disabled={!canEdit || saving} error={errorFor('trackingMode')} />
                    {tracked ? (
                      <FormField label="Quantity on hand" required hint="Recorded as the initial count." error={errorFor('quantity')}>
                        <Input {...bind('quantity')} inputMode="numeric" autoComplete="off" />
                      </FormField>
                    ) : (
                      <p className="va-hint">Not tracked: the product never shows as out of stock.</p>
                    )}
                  </>
                ) : (
                  <>
                    <dl className="va-kv">
                      <dt>Tracking</dt>
                      <dd>{tracked ? <Badge tone="info">Tracked</Badge> : <Badge>Not tracked</Badge>}</dd>
                      {tracked && (
                        <>
                          <dt>On hand</dt>
                          <dd>{Number.isInteger(product?.quantity) ? product.quantity : '—'}</dd>
                        </>
                      )}
                    </dl>
                    {canEditStock ? (
                      <div className="va-row">
                        {tracked && onAdjustStock && <Button icon={SlidersHorizontal} onClick={onAdjustStock}>Adjust stock</Button>}
                        {!tracked && onStartTracking && <Button icon={SlidersHorizontal} onClick={onStartTracking}>Start tracking</Button>}
                        {tracked && onStopTracking && <Button variant="ghost" onClick={onStopTracking}>Stop tracking</Button>}
                      </div>
                    ) : (
                      <span className="va-hint"><Lock size={12} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-1px' }} /> Requires inventory.update</span>
                    )}
                    <p className="va-hint">Quantity changes are recorded in the stock ledger with a reason.</p>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>

        {canEdit && (
          <div className="va-form-actions">
            {dirty && !isNew && <span className="va-hint" aria-live="polite" style={{ alignSelf: 'center' }}>Unsaved changes</span>}
            {onCancel && <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>}
            <Button type="submit" variant="primary" icon={Save} loading={saving} disabled={!isNew && !dirty}>
              {isNew ? 'Create draft' : 'Save changes'}
            </Button>
          </div>
        )}
      </form>
    </>
  )
}
