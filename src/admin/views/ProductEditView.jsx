'use client'

import { useState } from 'react'
import { ArrowLeft, ImagePlus, Lock, Save, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Card } from '../components/Card'
import Button from '../components/Button'
import { Alert } from '../components/Alert'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import { StatusPill } from '../components/Badge'
import { capitalize, formatPrice } from './format'

const STATUS_OPTIONS = ['Draft', 'Published', 'Archived']

// product: { name, subtitle, collection, status, images[], price|null, ref, type, description? }
// collections: [{ value, label }] or strings. onSave(values) gets
// { name, subtitle, collection, status, description, images } (never the price).
// Price is read-only here; changing it needs the product.price.update permission.
export default function ProductEditView({ product, collections = [], onSave, onCancel, saving = false, error, success, canEditPrice = false, onEditPrice, badge }) {
  const [values, setValues] = useState(() => ({
    name: product?.name ?? '',
    subtitle: product?.subtitle ?? '',
    collection: product?.collection ?? '',
    status: product?.status ?? 'Draft',
    description: product?.description ?? '',
    images: product?.images ?? [],
  }))
  const [newImage, setNewImage] = useState('')
  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }))
  const nameError = values.name.trim() ? undefined : 'Name is required.'

  const addImage = () => {
    const url = newImage.trim()
    if (url && !values.images.includes(url)) setValues((v) => ({ ...v, images: [...v.images, url] }))
    setNewImage('')
  }

  return (
    <>
      <PageHeader
        eyebrow={product?.type === 'strap' ? 'Catalog · Straps' : 'Catalog · Watches'}
        title={product ? `Edit ${product.name}` : 'New product'}
        description={product?.ref ? `Reference ${product.ref}` : undefined}
        badge={badge}
        actions={onCancel && <Button variant="ghost" icon={ArrowLeft} onClick={onCancel}>Back</Button>}
      />
      <form
        className="va-stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (!nameError) onSave?.({ ...values, name: values.name.trim(), subtitle: values.subtitle.trim() })
        }}
      >
        {error && <Alert tone="danger">{error}</Alert>}
        {success && <Alert tone="success">{success}</Alert>}

        <div className="va-grid va-grid-main">
          <Card title="Details">
            <div className="va-form-grid">
              <FormField label="Name" required error={values.name ? nameError : undefined} className="va-span-full">
                <Input value={values.name} onChange={set('name')} maxLength={120} />
              </FormField>
              <FormField label="Subtitle" hint="Shown under the name on the storefront." className="va-span-full">
                <Input value={values.subtitle} onChange={set('subtitle')} maxLength={160} />
              </FormField>
              <FormField label="Collection">
                <Select value={values.collection} onChange={set('collection')} options={[{ value: '', label: 'None' }, ...collections.map((c) => (typeof c === 'string' ? { value: c, label: capitalize(c) } : c))]} />
              </FormField>
              <FormField label="Status">
                <Select value={values.status} onChange={set('status')} options={STATUS_OPTIONS} />
              </FormField>
              <FormField label="Description" className="va-span-full">
                <Textarea value={values.description} onChange={set('description')} rows={5} />
              </FormField>
            </div>
          </Card>

          <div className="va-stack">
            <Card title="Price">
              <div className="va-stack">
                <FormField label="Unit price (USD)" hint="Read-only. Changing a price requires the product.price.update permission and is audit-logged.">
                  <Input value={formatPrice(product?.price)} readOnly />
                </FormField>
                {canEditPrice && onEditPrice ? (
                  <Button icon={Lock} onClick={onEditPrice}>Request price change</Button>
                ) : (
                  <span className="va-hint"><Lock size={12} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-1px' }} /> Requires product.price.update</span>
                )}
              </div>
            </Card>
            <Card title="Visibility">
              <StatusPill status={values.status} />
            </Card>
          </div>
        </div>

        <Card title="Images" subtitle="The first image is the main product image.">
          <div className="va-stack">
            {values.images.length ? (
              <ul className="va-image-list" aria-label="Product images">
                {values.images.map((src, i) => (
                  <li key={src} className="va-image-tile">
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary image paths */}
                    <img src={src} alt={`Image ${i + 1} of ${values.name}`} loading="lazy" />
                    <div className="va-row va-between">
                      <span className="va-hint">{i === 0 ? 'Main' : `#${i + 1}`}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon={Trash2}
                        aria-label={`Remove image ${i + 1}`}
                        onClick={() => setValues((v) => ({ ...v, images: v.images.filter((x) => x !== src) }))}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="va-muted">No images yet.</p>
            )}
            <div className="va-row" style={{ alignItems: 'flex-end' }}>
              <FormField label="Add image by path" hint="e.g. /images/watch-1.png" className="va-grow" >
                <Input value={newImage} onChange={(e) => setNewImage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImage() } }} />
              </FormField>
              <Button icon={ImagePlus} onClick={addImage} disabled={!newImage.trim()}>Add</Button>
            </div>
          </div>
        </Card>

        <div className="va-row" style={{ justifyContent: 'flex-end' }}>
          {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" variant="primary" icon={Save} loading={saving} disabled={Boolean(nameError)}>Save changes</Button>
        </div>
      </form>
    </>
  )
}
