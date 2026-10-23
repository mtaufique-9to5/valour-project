'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArrowLeft, Plus, RotateCcw, Save, Send, Trash2, Undo2 } from 'lucide-react'
import PageHeader from '@/admin/components/PageHeader'
import { Card } from '@/admin/components/Card'
import Button from '@/admin/components/Button'
import { Alert, ToastViewport } from '@/admin/components/Alert'
import { Badge, StatusPill } from '@/admin/components/Badge'
import { ConfirmDialog } from '@/admin/components/Modal'
import { FormField, Input, Select, Textarea, Toggle } from '@/admin/components/FormField'
import ImageManager, { xhrUpload } from '@/admin/components/ImageManager'
import useToasts from '@/admin/hooks/useToasts'
import SectionImageField from './SectionImageField'
import { MAX_STOCK, normalizeSku, parsePrice, validateSku } from './format'

// Product editor for watchwebsite `products` (Revision 3), built from the
// existing admin design components. New products are saved as drafts; prices,
// stock, status and images of an existing product are saved by their own
// actions so one change never overwrites another. Display details are stored in
// products.additional_info (Decision 1). The server validates everything again.

const STATUS_VIEW = { draft: 'Draft', active: 'Active', inactive: 'Archived' }
const TYPE_OPTIONS = [{ value: 'watch', label: 'Watch' }, { value: 'strap', label: 'Strap' }]
const TEXT_DISPLAY = [
  ['subtitle', 'Subtitle', 120, 'e.g. Lucent Collection'],
  ['collection', 'Collection', 80],
  ['movement', 'Movement', 80, 'e.g. automatic'],
  ['material', 'Material', 80, 'e.g. titanium'],
  ['color', 'Colour', 80],
  ['tagline', 'Tagline', 200],
  ['pdpSubtitle', 'Product page subtitle', 200],
  ['accent', 'Accent colour', 7, '#RRGGBB'],
  ['edition', 'Edition', 40],
]
// Storefront details used only by watch pages. For straps they are hidden (their
// stored values are kept and saved back unchanged); the subtitle is edited in the
// Strap Hero card instead.
const WATCH_ONLY_DISPLAY = new Set(['movement', 'tagline', 'pdpSubtitle', 'accent', 'edition'])
const visibleDisplay = (type) => TEXT_DISPLAY.filter(([k]) => (type === 'strap' ? !WATCH_ONLY_DISPLAY.has(k) && k !== 'subtitle' : true))

const emptyValues = (type) => ({
  name: '', sku: '', slug: '', type: type === 'strap' ? 'strap' : 'watch', categoryId: '', brandId: '',
  shortDescription: '', longDescription: '', metaTitle: '', metaDescription: '', isFeatured: false,
  basePrice: '', salePrice: '', trackStock: false, stock: '0',
})

// Product page sections, in page order (admin cards). Text and spec tables are
// saved with "Save details" (additional_info.pdp); images are saved immediately
// by their own slot (additional_info.media) so a text save never touches them.
const PDP_CARDS = [
  { key: 'hero', title: 'Hero', subtitle: 'First screen: product name, subtitle and Add to Cart.', subtitleField: true,
    images: [['hero', 'Hero image', 'Shown behind the hero. When empty, the main product image is used.']] },
  { key: 'intro', title: 'Intro', subtitle: 'Heading, paragraph, "Feature / Specification" table and two images.', heading: true, text: true, specs: true,
    images: [['introLeft', 'Intro image (left)'], ['introRight', 'Intro image (right)']] },
  { key: 'parallax1', title: 'Parallax 1', subtitle: 'Full-width image with heading and paragraph.', heading: true, text: true, images: [['parallax1', 'Parallax 1 image']] },
  { key: 'movement', title: 'Movement', subtitle: 'Heading, paragraph, spec table and image.', heading: true, text: true, specs: true, images: [['movement', 'Movement image']] },
  { key: 'parallax2', title: 'Parallax 2', subtitle: 'Second full-width image with heading and paragraph.', heading: true, text: true, images: [['parallax2', 'Parallax 2 image']] },
  { key: 'dial', title: 'Dial Finish', subtitle: 'Heading, paragraph, spec table and image.', heading: true, text: true, specs: true, images: [['dial', 'Dial Finish image']] },
  { key: 'strap', title: 'About Strap', subtitle: 'Heading, paragraph and two strap images.', heading: true, text: true, images: [['strapLeft', 'Strap image (left)'], ['strapRight', 'Strap image (right)']] },
]

function toDisplayForm(display = {}) {
  const pdp = display.pdp ?? {}
  return {
    ...Object.fromEntries(TEXT_DISPLAY.map(([k]) => [k, display[k] ?? ''])),
    limited: Boolean(display.limited),
    editions: (display.editions ?? []).join(', '),
    specs: (display.specs ?? []).map((s) => ({ label: s.label, value: s.value })),
    pdp: Object.fromEntries(PDP_CARDS.map(({ key }) => [key, {
      subtitle: pdp[key]?.subtitle ?? '',
      heading: pdp[key]?.heading ?? '',
      text: pdp[key]?.text ?? '',
      specs: (pdp[key]?.specs ?? []).map((s) => ({ label: s.label, value: s.value })),
    }])),
  }
}

const cleanRows = (rows) => (rows ?? []).map((s) => ({ label: s.label.trim(), value: s.value.trim() })).filter((s) => s.label && s.value)

/** Form state -> additional_info.pdp (only the keys each section has; empty ones left out). */
function pdpFromForm(form) {
  const out = {}
  for (const card of PDP_CARDS) {
    const f = form?.[card.key] ?? {}
    const sec = {}
    if (card.subtitleField && f.subtitle.trim()) sec.subtitle = f.subtitle.trim()
    if (card.heading && f.heading.trim()) sec.heading = f.heading.trim()
    if (card.text && f.text.trim()) sec.text = f.text.trim()
    if (card.specs) {
      const rows = cleanRows(f.specs)
      if (rows.length) sec.specs = rows
    }
    if (Object.keys(sec).length) out[card.key] = sec
  }
  return out
}

// Label / value rows editor (same pattern as the Specifications editor).
function SpecRows({ rows, onChange, name }) {
  return (
    <div className="va-span-full va-stack">
      <span className="va-label">{name}</span>
      {rows.map((s, i) => (
        <div className="va-row" key={i}>
          <Input aria-label={`${name} row ${i + 1} label`} placeholder="Label (e.g. Power Reserve)" value={s.label} maxLength={80}
            onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <Input aria-label={`${name} row ${i + 1} value`} placeholder="Value (e.g. 72 Hours)" value={s.value} maxLength={200}
            onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
          <Button variant="ghost" size="sm" iconOnly icon={Trash2} aria-label={`Remove ${name} row ${i + 1}`}
            onClick={() => onChange(rows.filter((_, j) => j !== i))} />
        </div>
      ))}
      <div><Button variant="secondary" size="sm" icon={Plus} onClick={() => onChange([...rows, { label: '', value: '' }])}>Add row</Button></div>
    </div>
  )
}

function fromDisplayForm(d) {
  const out = {}
  for (const [k] of TEXT_DISPLAY) if (String(d[k] ?? '').trim()) out[k] = String(d[k]).trim()
  if (d.limited) out.limited = true
  const editions = String(d.editions ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (editions.length) out.editions = editions
  const specs = cleanRows(d.specs)
  if (specs.length) out.specs = specs
  const pdp = pdpFromForm(d.pdp)
  if (Object.keys(pdp).length) out.pdp = pdp
  return out
}

/** Form values -> action input (only the keys the server schema accepts). */
function toDetailsInput(v, { isNew }) {
  const out = {
    name: v.name.trim(),
    sku: normalizeSku(v.sku),
    type: v.type,
    categoryId: v.categoryId || null,
    brandId: v.brandId || null,
    shortDescription: v.shortDescription,
    longDescription: v.longDescription,
    metaTitle: v.metaTitle,
    metaDescription: v.metaDescription,
    isFeatured: Boolean(v.isFeatured),
  }
  if (v.slug.trim()) out.slug = v.slug.trim().toLowerCase()
  if (isNew) {
    out.basePrice = v.basePrice.trim()
    if (v.salePrice.trim()) out.salePrice = v.salePrice.trim()
    out.trackStock = Boolean(v.trackStock)
    out.stock = v.trackStock ? Number(v.stock) : 0
  }
  return out
}

function clientErrors(v, { isNew }) {
  const e = {}
  if (!v.name.trim()) e.name = 'Name is required.'
  const sku = validateSku(v.sku)
  if (sku) e.sku = sku
  if (v.slug.trim() && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug.trim().toLowerCase())) e.slug = 'Use lower-case letters, digits and hyphens.'
  if (isNew) {
    const base = parsePrice(v.basePrice)
    if (base.error) e.basePrice = base.error
    if (v.salePrice.trim()) {
      const sale = parsePrice(v.salePrice)
      if (sale.error) e.salePrice = sale.error
      else if (!base.error && sale.minor > base.minor) e.salePrice = 'The sale price cannot be higher than the base price.'
    }
    if (v.trackStock && !(/^\d+$/.test(String(v.stock)) && Number(v.stock) <= MAX_STOCK)) e.stock = `Enter a whole number from 0 to ${MAX_STOCK.toLocaleString('en-US')}.`
  }
  return e
}

export default function ProductEditorClient({
  mode = 'edit', product = null, initialType, categories = [], brands = [],
  createProductAction, updateProductAction, setPricesAction, setInventoryAction, setProductStatusAction,
  deleteProductImageAction, setPrimaryImageAction, reorderImagesAction, removeSectionImageAction,
}) {
  const router = useRouter()
  const isNew = mode === 'new'
  const { toasts, push, dismiss } = useToasts()
  const [pending, startTransition] = useTransition()
  const [values, setValues] = useState(() => (isNew ? emptyValues(initialType) : {
    ...emptyValues(product.type), ...product, slug: product.slug ?? '', stock: String(product.stock ?? 0),
  }))
  const [display, setDisplay] = useState(() => toDisplayForm(product?.display))
  const [prices, setPrices] = useState({ basePrice: product?.basePrice ?? '', salePrice: product?.salePrice ?? '' })
  const [inventory, setInventory] = useState({ trackStock: Boolean(product?.trackStock), stock: String(product?.stock ?? 0) })
  const [images, setImages] = useState(product?.images ?? [])
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [confirmArchive, setConfirmArchive] = useState(false)

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }))
  const setD = (k) => (e) => setDisplay((d) => ({ ...d, [k]: e?.target ? e.target.value : e }))
  const setPdp = (sec, field) => (e) => setDisplay((d) => ({ ...d, pdp: { ...d.pdp, [sec]: { ...d.pdp[sec], [field]: e?.target ? e.target.value : e } } }))
  const refresh = () => startTransition(() => router.refresh())
  const notify = (res, title, ok) => {
    if (res?.ok) { push({ tone: 'success', title: ok }); return true }
    push({ tone: 'danger', title, message: res?.error || 'Could not save the change. Please try again.' })
    return false
  }

  async function saveDetails(e) {
    e.preventDefault()
    const errs = clientErrors(values, { isNew })
    setErrors(errs)
    setFormError(null)
    if (Object.keys(errs).length) { setFormError('Please correct the highlighted fields.'); return }
    const input = toDetailsInput(values, { isNew })
    const res = isNew
      ? await createProductAction(input, fromDisplayForm(display))
      : await updateProductAction(product.id, input, fromDisplayForm(display))
    if (!res?.ok) {
      setErrors(res?.fieldErrors ?? {})
      setFormError(res?.error || 'Could not save the product.')
      return
    }
    if (isNew) {
      router.push(`/admin/products/${res.id}`)
      return
    }
    push({ tone: 'success', title: 'Product saved' })
    refresh()
  }

  async function savePrices() {
    const base = parsePrice(prices.basePrice)
    const sale = prices.salePrice.trim() ? parsePrice(prices.salePrice) : null
    const problem = base.error || sale?.error || (sale && sale.minor > base.minor ? 'The sale price cannot be higher than the base price.' : null)
    if (problem) { push({ tone: 'danger', title: 'Price not saved', message: problem }); return }
    if (notify(await setPricesAction(product.id, { basePrice: base.amount, salePrice: sale?.amount ?? null }), 'Price not saved', 'Prices saved')) refresh()
  }

  async function saveInventory() {
    if (inventory.trackStock && !(/^\d+$/.test(inventory.stock) && Number(inventory.stock) <= MAX_STOCK)) {
      push({ tone: 'danger', title: 'Stock not saved', message: `Enter a whole number from 0 to ${MAX_STOCK.toLocaleString('en-US')}.` })
      return
    }
    const res = await setInventoryAction(product.id, { trackStock: inventory.trackStock, expected: product.stock, stock: Number(inventory.stock) })
    if (notify(res, 'Stock not saved', 'Stock saved')) refresh()
  }

  async function changeStatus(to, ok) {
    if (notify(await setProductStatusAction(product.id, to), 'Status not changed', ok)) refresh()
  }

  const hasMain = images.some((i) => i.isPrimary)
  const checklist = isNew ? [] : [
    { label: 'Name', ok: Boolean(values.name.trim()) },
    { label: 'Valid SKU', ok: !validateSku(values.sku) },
    { label: 'Base price above 0', ok: !parsePrice(product.basePrice).error },
    { label: 'Main image', ok: hasMain },
  ]
  const typeLocked = !isNew && (product.status !== 'draft' || product.hasOrders)
  // Fields and cards follow the selected type immediately (no reload). Fields of
  // the other type are only hidden: their values stay in the form and are saved back.
  const isWatch = values.type !== 'strap'

  // One product page image slot (additional_info.media[role]); new products save first.
  const sectionImage = (role, label, hint) => (isNew ? (
    <div className="va-field"><span className="va-label">{label}</span><span className="va-hint">Save the product first, then upload this image.</span></div>
  ) : (
    <SectionImageField
      productId={product.id}
      role={role}
      label={label}
      hint={hint}
      path={product.media?.[role] ?? null}
      disabled={product.status === 'inactive'}
      removeAction={removeSectionImageAction}
      onChanged={refresh}
      onNotify={push}
    />
  ))

  // Main-image uploads move the old main image into the gallery on the server;
  // reload so the gallery shows it.
  const upload = (file, role, onProgress) => {
    const h = xhrUpload(`/api/admin/products/${encodeURIComponent(product.id)}/images/`, file, role, onProgress)
    return { abort: h.abort, promise: h.promise.then((r) => { if (r?.ok && role === 'MAIN') refresh(); return r }) }
  }

  return (
    <>
      <PageHeader
        eyebrow={isNew ? 'Catalog' : values.type === 'strap' ? 'Strap' : 'Watch'}
        title={isNew ? `New ${values.type}` : product.name}
        description={isNew ? 'New products are saved as drafts. Add images, then publish.' : `SKU ${product.sku} · /our-shop/${product.slug}/`}
        badge={!isNew && <StatusPill status={STATUS_VIEW[product.status]} />}
        actions={<Button variant="secondary" icon={ArrowLeft} onClick={() => router.push(`/admin/products${values.type ? `?type=${values.type.toUpperCase()}` : ''}`)}>Back to list</Button>}
      />

      <div className="va-grid va-grid-main">
        <form className="va-stack" onSubmit={saveDetails} noValidate>
          {formError && <Alert tone="danger">{formError}</Alert>}

          <Card title="Details">
            <div className="va-form-grid">
              <FormField label="Name" required error={errors.name}>
                <Input value={values.name} onChange={set('name')} maxLength={255} />
              </FormField>
              <FormField label="SKU" required error={errors.sku} hint="A–Z, 0–9 and hyphens. Must be unique.">
                <Input value={values.sku} onChange={set('sku')} maxLength={32} className="va-mono" />
              </FormField>
              <FormField label="Type" required error={errors.type} hint={typeLocked ? 'Fixed once published or ordered.' : undefined}>
                <Select value={values.type} onChange={set('type')} options={TYPE_OPTIONS} disabled={typeLocked} />
              </FormField>
              <FormField label="URL slug" error={errors.slug} hint={isNew ? 'Leave empty to create one from the name and SKU.' : 'Changing it changes the product URL.'}>
                <Input value={values.slug} onChange={set('slug')} maxLength={255} className="va-mono" />
              </FormField>
              <FormField label="Category" error={errors.categoryId} hint={categories.length ? undefined : 'No categories yet (managed in a later phase).'}>
                <Select value={values.categoryId} onChange={set('categoryId')} options={[{ value: '', label: 'None' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
              </FormField>
              <FormField label="Brand" error={errors.brandId} hint={brands.length ? undefined : 'No brands yet (managed in a later phase).'}>
                <Select value={values.brandId} onChange={set('brandId')} options={[{ value: '', label: 'None' }, ...brands.map((b) => ({ value: b.id, label: b.name }))]} />
              </FormField>
              <div className="va-span-full">
                <Toggle label="Featured product" description="Highlight this product where the storefront shows featured items." checked={Boolean(values.isFeatured)} onChange={set('isFeatured')} />
              </div>
            </div>
          </Card>

          {isNew && (
            <Card title="Price and stock" subtitle="Prices in the store currency. There is no 'price on request'.">
              <div className="va-form-grid">
                <FormField label="Base price" required error={errors.basePrice} hint="e.g. 525.00">
                  <Input inputMode="decimal" value={values.basePrice} onChange={set('basePrice')} />
                </FormField>
                <FormField label="Sale price" error={errors.salePrice} hint="Optional; not higher than the base price.">
                  <Input inputMode="decimal" value={values.salePrice} onChange={set('salePrice')} />
                </FormField>
                <div className="va-span-full">
                  <Toggle label="Track stock" description="Off: never deducted at checkout." checked={Boolean(values.trackStock)} onChange={set('trackStock')} />
                </div>
                {values.trackStock && (
                  <FormField label="Quantity in stock" required error={errors.stock}>
                    <Input inputMode="numeric" value={values.stock} onChange={set('stock')} />
                  </FormField>
                )}
              </div>
            </Card>
          )}

          {isWatch && (
          <Card title="Descriptions">
            <div className="va-stack">
              <FormField label="Short description" error={errors.shortDescription}>
                <Textarea rows={3} value={values.shortDescription} onChange={set('shortDescription')} maxLength={5000} />
              </FormField>
              <FormField label="Full description" error={errors.longDescription}>
                <Textarea rows={8} value={values.longDescription} onChange={set('longDescription')} />
              </FormField>
            </div>
          </Card>
          )}

          <Card title="Storefront details" subtitle="Shown on the product page. Leave empty what does not apply.">
            <div className="va-form-grid">
              {visibleDisplay(values.type).map(([k, label, max, hint]) => (
                <FormField key={k} label={label} hint={hint} error={errors[k]}>
                  <Input value={display[k]} onChange={setD(k)} maxLength={max} />
                </FormField>
              ))}
              {isWatch && (
                <>
                  <FormField label="Editions" hint="Comma-separated, e.g. P-01, P-02" error={errors.editions}>
                    <Input value={display.editions} onChange={setD('editions')} />
                  </FormField>
                  <div className="va-span-full">
                    <Toggle label="Limited edition" checked={display.limited} onChange={setD('limited')} />
                  </div>
                </>
              )}
              <div className="va-span-full va-stack">
                <span className="va-label">Specifications</span>
                {display.specs.map((s, i) => (
                  <div className="va-row" key={i}>
                    <Input aria-label={`Specification ${i + 1} label`} placeholder="Label (e.g. Case Diameter)" value={s.label} maxLength={80}
                      onChange={(e) => setDisplay((d) => ({ ...d, specs: d.specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) }))} />
                    <Input aria-label={`Specification ${i + 1} value`} placeholder="Value (e.g. 40mm)" value={s.value} maxLength={200}
                      onChange={(e) => setDisplay((d) => ({ ...d, specs: d.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) }))} />
                    <Button variant="ghost" size="sm" iconOnly icon={Trash2} aria-label={`Remove specification ${i + 1}`}
                      onClick={() => setDisplay((d) => ({ ...d, specs: d.specs.filter((_, j) => j !== i) }))} />
                  </div>
                ))}
                {errors.specs && <span className="va-error-text">{errors.specs}</span>}
                <div><Button variant="secondary" size="sm" icon={Plus} onClick={() => setDisplay((d) => ({ ...d, specs: [...d.specs, { label: '', value: '' }] }))}>Add specification</Button></div>
              </div>
            </div>
          </Card>

          <div className="va-stack">
            <h2 className="va-label" style={{ margin: '8px 0 0' }}>Product page</h2>
            <p className="va-hint" style={{ margin: 0 }}>
              Everything below appears on this product&apos;s page, in this order. Headings, paragraphs and tables are saved with
              {isNew ? ' Create draft' : ' Save details'}; images are saved as soon as you upload or remove them. Empty fields are not shown on the website.
            </p>
          </div>

          {!isWatch && (
            <>
              <Card title="Strap Hero" subtitle="First section: SKU label, name, collection subtitle and the large strap image.">
                <div className="va-form-grid">
                  <div className="va-span-full">
                    <FormField label="Collection subtitle" hint="Shown under the strap name, e.g. Hybrid Sailcloth / FKM Rubber Strap. Also shown on shop cards.">
                      <Input value={display.subtitle} onChange={setD('subtitle')} maxLength={120} />
                    </FormField>
                  </div>
                  <div>{sectionImage('hero', 'Hero image', 'When empty, the main product image is used.')}</div>
                </div>
              </Card>
              <Card title="Strap Details" subtitle="Second section: large image, SKU, name, price, description and Add to Cart. Name, SKU, price and stock are edited in their own cards.">
                <div className="va-form-grid">
                  <div className="va-span-full">
                    <FormField label="Product description" error={errors.longDescription}>
                      <Textarea rows={6} value={values.longDescription} onChange={set('longDescription')} />
                    </FormField>
                  </div>
                  <div>{sectionImage('detail', 'Detail image', 'The large image on the left. When empty, the main product image is used.')}</div>
                </div>
              </Card>
            </>
          )}

          {isWatch && PDP_CARDS.map((card) => (
            <Card key={card.key} title={card.title} subtitle={card.subtitle}>
              <div className="va-form-grid">
                {card.subtitleField && (
                  <div className="va-span-full">
                    <FormField label="Hero subtitle" hint="Shown under the product name, e.g. a model line or movement name.">
                      <Input value={display.pdp[card.key].subtitle} onChange={setPdp(card.key, 'subtitle')} maxLength={120} />
                    </FormField>
                  </div>
                )}
                {card.heading && (
                  <div className="va-span-full">
                    <FormField label={`${card.title} heading`}>
                      <Input value={display.pdp[card.key].heading} onChange={setPdp(card.key, 'heading')} maxLength={120} />
                    </FormField>
                  </div>
                )}
                {card.text && (
                  <div className="va-span-full">
                    <FormField label={`${card.title} paragraph`}>
                      <Textarea rows={4} value={display.pdp[card.key].text} onChange={setPdp(card.key, 'text')} maxLength={5000} />
                    </FormField>
                  </div>
                )}
                {card.specs && (
                  <SpecRows name={`${card.title} specifications`} rows={display.pdp[card.key].specs} onChange={setPdp(card.key, 'specs')} />
                )}
                {card.images.map(([role, label, hint]) => <div key={role}>{sectionImage(role, label, hint)}</div>)}
              </div>
            </Card>
          ))}

          <Card title="Search engines">
            <div className="va-stack">
              <FormField label="Meta title" error={errors.metaTitle}><Input value={values.metaTitle} onChange={set('metaTitle')} maxLength={255} /></FormField>
              <FormField label="Meta description" error={errors.metaDescription}><Textarea rows={3} value={values.metaDescription} onChange={set('metaDescription')} maxLength={5000} /></FormField>
            </div>
          </Card>

          <div className="va-form-actions">
            <Button type="submit" variant="primary" icon={Save} loading={pending}>{isNew ? 'Create draft' : 'Save details'}</Button>
          </div>
        </form>

        <aside className="va-stack">
          {isNew ? (
            <Card title="Images"><p className="va-hint">Save the product first, then add its main image and gallery.</p></Card>
          ) : (
            <>
              <Card title="Status">
                <div className="va-stack">
                  <ul className="va-checklist" aria-label="Ready to publish">
                    {checklist.map((c) => <li key={c.label} className={c.ok ? 'va-ok' : 'va-missing'}>{c.label}</li>)}
                  </ul>
                  {product.status === 'draft' && <Button variant="primary" icon={Send} disabled={!checklist.every((c) => c.ok)} onClick={() => changeStatus('active', 'Published')}>Publish</Button>}
                  {product.status === 'active' && <Button variant="secondary" icon={Undo2} onClick={() => changeStatus('draft', 'Moved to draft')}>Unpublish (draft)</Button>}
                  {product.status !== 'inactive' && <Button variant="secondary" icon={Archive} onClick={() => setConfirmArchive(true)}>Archive</Button>}
                  {product.status === 'inactive' && <Button variant="secondary" icon={RotateCcw} onClick={() => changeStatus('draft', 'Restored as draft')}>Restore as draft</Button>}
                </div>
              </Card>

              <Card title="Price" subtitle="Customers pay the sale price when one is set.">
                <div className="va-stack">
                  <FormField label="Base price" required><Input inputMode="decimal" value={prices.basePrice} onChange={(e) => setPrices((p) => ({ ...p, basePrice: e.target.value }))} /></FormField>
                  <FormField label="Sale price" hint="Leave empty for no sale."><Input inputMode="decimal" value={prices.salePrice} onChange={(e) => setPrices((p) => ({ ...p, salePrice: e.target.value }))} /></FormField>
                  <Button variant="secondary" onClick={savePrices}>Save prices</Button>
                </div>
              </Card>

              <Card title="Inventory">
                <div className="va-stack">
                  <Toggle label="Track stock" description="Off: never deducted at checkout." checked={inventory.trackStock} onChange={(on) => setInventory((s) => ({ ...s, trackStock: on }))} />
                  {inventory.trackStock && (
                    <FormField label="Quantity in stock" hint={`Currently ${product.stock}.`}>
                      <Input inputMode="numeric" value={inventory.stock} onChange={(e) => setInventory((s) => ({ ...s, stock: e.target.value }))} />
                    </FormField>
                  )}
                  <Button variant="secondary" onClick={saveInventory}>Save stock</Button>
                </div>
              </Card>

              <Card title="Images" subtitle="JPG, PNG or WebP, up to 5 MB. Main image plus up to 12 gallery images.">
                <ImageManager
                  productId={product.id}
                  productName={product.name}
                  images={product.images}
                  canEdit={product.status !== 'inactive'}
                  upload={upload}
                  // The server promotes the next image when the main one is deleted and puts the
                  // old main image first in the gallery; reload so the panel shows exactly that.
                  deleteImageAction={(path) => deleteProductImageAction(product.id, path).then((r) => { if (r?.ok) refresh(); return r })}
                  setPrimaryAction={(id, path) => setPrimaryImageAction(id, path).then((r) => { if (r?.ok) refresh(); return r })}
                  reorderAction={(id, order) => reorderImagesAction(id, order)}
                  onImagesChange={setImages}
                  onNotify={push}
                />
                {product.status === 'inactive' && <p className="va-hint">Restore the product to change its images.</p>}
              </Card>

              {product.hasOrders && <Badge tone="neutral">Has orders: kept for order history, never hard-deleted.</Badge>}
            </>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={() => { setConfirmArchive(false); changeStatus('inactive', 'Archived') }}
        title={`Archive ${product?.name ?? 'product'}?`}
        message="It disappears from the storefront but keeps its data and order history. You can restore it later."
        confirmLabel="Archive"
      />
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
