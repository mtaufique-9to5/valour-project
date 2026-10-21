// Client-side copies of tiny pure helpers (src/server/** is server-only and
// must not be imported here). The server re-validates everything.

// Mirrors INVENTORY_REASONS in src/server/catalog/schemas.js / enum InventoryReason.
export const INVENTORY_REASONS = [
  { value: 'INITIAL_COUNT', label: 'Initial count' },
  { value: 'RESTOCK', label: 'Restock' },
  { value: 'SALE', label: 'Sale' },
  { value: 'RETURN', label: 'Return' },
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'CORRECTION', label: 'Correction' },
]
export const MAX_STOCK = 1_000_000
export const MAX_AMOUNT_MINOR = 999_999_999

const AMOUNT_RE = /^(\d{1,7})(?:\.(\d{1,2}))?$/
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/** '525.5' -> 52550; invalid -> null (exact string arithmetic). */
export function amountToMinor(value) {
  const m = typeof value === 'string' ? value.trim().match(AMOUNT_RE) : null
  if (!m) return null
  const minor = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'))
  return minor <= MAX_AMOUNT_MINOR ? minor : null
}

/** dollars number -> '525.00'; null -> ''. */
export const dollarsToAmountString = (d) => (Number.isFinite(d) ? d.toFixed(2) : '')

// A null price only exists on legacy DRAFT products; it is never a storefront option.
export const NO_PRICE_LABEL = 'No price set'
export const NO_PRICE_WARNING = 'No price — set a price to publish'

/** dollars number -> '$525.00'; null -> 'No price'. */
export const formatDollars = (d) => (Number.isFinite(d) ? usd.format(d) : NO_PRICE_LABEL)
export const formatMinor = (m) => (Number.isInteger(m) ? usd.format(m / 100) : NO_PRICE_LABEL)

// ProductEditView status labels <-> DB ProductStatus.
export const STATUS_TO_DB = { Draft: 'DRAFT', Published: 'ACTIVE', Active: 'ACTIVE', Archived: 'ARCHIVED' }
export const DB_TO_STATUS = { DRAFT: 'Draft', ACTIVE: 'Published', ARCHIVED: 'Archived' }

export const GENERIC_ERROR = 'Could not save the change. Please try again.'
export const errorOf = (res) => (res && typeof res.error === 'string' && res.error) || GENERIC_ERROR

// ---------------------------------------------------------------------------
// Product form validation (mirrors the server rules; the server re-validates).

export const CURRENCIES = [{ value: 'USD', label: 'USD — US dollar' }]
export const PRODUCT_TYPES = [{ value: 'WATCH', label: 'Watch' }, { value: 'STRAP', label: 'Strap' }]
export const PRODUCT_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
]
export const STATUS_LABEL = { DRAFT: 'Draft', ACTIVE: 'Active', ARCHIVED: 'Archived' }
export const TRACKING_MODES = [
  { value: 'TRACKED', label: 'Tracked' },
  { value: 'NOT_TRACKED', label: 'Not tracked' },
]
export const SKU_MAX = 32
export const NAME_MAX = 120
export const DESCRIPTION_MAX = 5000

/** 'active' | 'Active' | 'ACTIVE' -> 'ACTIVE' (unknown -> 'DRAFT'). */
export const normalizeStatus = (s) => {
  const up = String(s ?? '').toUpperCase()
  if (up === 'PUBLISHED') return 'ACTIVE'
  return STATUS_LABEL[up] ? up : 'DRAFT'
}
export const normalizeType = (t) => (String(t ?? '').toUpperCase() === 'STRAP' ? 'STRAP' : 'WATCH')

/**
 * Price input -> { amount: '499.99', minor: 49999 } or { error }.
 * Required, > 0, max 9,999,999.99, up to 2 decimals. Returns a normalised
 * 2-decimal string so the server never has to round.
 */
export function parsePrice(value) {
  const raw = typeof value === 'string' ? value.trim() : typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : ''
  if (raw === '') return { error: 'Price is required.' }
  const minor = amountToMinor(raw.replace(/,/g, ''))
  if (minor === null) return { error: 'Enter an amount like 499.99 (up to 2 decimals, max 9,999,999.99).' }
  if (minor <= 0) return { error: 'Price must be greater than 0.' }
  const amount = `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`
  return { amount, minor }
}

/** Uppercases and strips whitespace; does not validate. */
export const normalizeSku = (value) => String(value ?? '').toUpperCase().replace(/\s+/g, '')

/** Returns an error message or undefined. */
export function validateSku(value) {
  const sku = normalizeSku(value)
  if (!sku) return 'SKU is required.'
  if (sku.length > SKU_MAX) return `SKU must be ${SKU_MAX} characters or fewer.`
  if (!/^[A-Z0-9-]+$/.test(sku)) return 'Use only letters A–Z, digits and hyphens.'
  return undefined
}

/** Whole number 0..MAX_STOCK -> number; otherwise null. */
export function parseQuantity(value) {
  const raw = String(value ?? '').trim()
  if (!/^\d+$/.test(raw)) return null
  const n = Number(raw)
  return n <= MAX_STOCK ? n : null
}

/**
 * Field-level validation for ProductForm values. Returns { [field]: message }.
 * On edit (isNew=false) a tracked quantity is changed through the stock ledger,
 * so it is only validated when switching from Not tracked to Tracked.
 */
export function validateProductValues(values, { isNew = true, requireQuantity = isNew } = {}) {
  const errors = {}
  const name = String(values.name ?? '').trim()
  if (!name) errors.name = 'Name is required.'
  else if (name.length > NAME_MAX) errors.name = `Keep the name under ${NAME_MAX} characters.`
  if (String(values.description ?? '').length > DESCRIPTION_MAX) errors.description = `Keep the description under ${DESCRIPTION_MAX.toLocaleString('en-US')} characters.`
  const skuError = validateSku(values.sku)
  if (skuError) errors.sku = skuError
  if (!PRODUCT_TYPES.some((t) => t.value === values.type)) errors.type = 'Choose watch or strap.'
  const price = parsePrice(values.price)
  if (price.error) errors.price = price.error
  if (values.currency !== 'USD') errors.currency = 'Only USD is supported.'
  if (!TRACKING_MODES.some((t) => t.value === values.trackingMode)) errors.trackingMode = 'Choose a tracking mode.'
  if (requireQuantity && values.trackingMode === 'TRACKED' && parseQuantity(values.quantity) === null) {
    errors.quantity = `Enter a whole number from 0 to ${MAX_STOCK.toLocaleString('en-US')}.`
  }
  if (!PRODUCT_STATUS_OPTIONS.some((s) => s.value === values.status)) errors.status = 'Choose a status.'
  return errors
}

/**
 * Publish checklist (mirrors the server's ACTIVE rules): name, SKU, price, main image.
 * images: [{ role, isPrimary }]. Returns [{ key, label, ok }].
 */
export function publishChecklist(values, images = []) {
  const hasMain = (images ?? []).some((i) => i && (i.role === 'MAIN' || i.isPrimary))
  return [
    { key: 'name', label: 'Name', ok: Boolean(String(values.name ?? '').trim()) },
    { key: 'sku', label: 'Valid SKU', ok: !validateSku(values.sku) },
    { key: 'price', label: 'Price greater than 0', ok: !parsePrice(values.price).error },
    { key: 'image', label: 'Main image', ok: hasMain },
  ]
}
export const canPublish = (values, images) => publishChecklist(values, images).every((c) => c.ok)

/** Form values -> backend input (contract shape). */
export function toProductInput(values, { includeQuantity = true } = {}) {
  const tracked = values.trackingMode === 'TRACKED'
  return {
    name: String(values.name ?? '').trim(),
    description: String(values.description ?? '').trim(),
    sku: normalizeSku(values.sku),
    categoryId: values.categoryId === '' || values.categoryId == null ? null : values.categoryId,
    type: values.type,
    price: parsePrice(values.price).amount ?? null,
    currency: 'USD',
    trackingMode: values.trackingMode,
    quantity: includeQuantity && tracked ? parseQuantity(values.quantity) : null,
    status: values.status,
  }
}

/** Product (getProduct) or null -> form values. */
export function productToValues(product) {
  return {
    name: product?.name ?? '',
    description: product?.description ?? '',
    sku: product?.sku ?? '',
    categoryId: product?.categoryId == null ? '' : String(product.categoryId),
    type: normalizeType(product?.typeCode ?? product?.type),
    price: typeof product?.priceAmount === 'string' ? product.priceAmount : dollarsToAmountString(product?.price),
    currency: 'USD',
    trackingMode: product?.trackingMode === 'NOT_TRACKED' ? 'NOT_TRACKED' : 'TRACKED',
    quantity: Number.isInteger(product?.quantity) ? String(product.quantity) : product ? '' : '0',
    status: product ? normalizeStatus(product.statusCode ?? product.status) : 'DRAFT',
  }
}

/** Shallow diff of two values objects -> true when anything changed. */
export const valuesDiffer = (a, b) => Object.keys({ ...a, ...b }).some((k) => String(a[k] ?? '') !== String(b[k] ?? ''))

// ---------------------------------------------------------------------------
// Image upload validation (mirrors POST /api/admin/products/{id}/images).

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const IMAGE_MAX_GALLERY = 12
export const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
const IMAGE_TYPES = { 'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'], 'image/webp': ['webp'] }

/** file: { name, type, size }. Returns an error message or undefined. */
export function validateImageFile(file) {
  if (!file) return 'No file selected.'
  const name = String(file.name ?? '')
  const ext = name.includes('.') ? name.toLowerCase().split('.').pop() : ''
  const exts = IMAGE_TYPES[String(file.type ?? '').toLowerCase()]
  if (!exts || !exts.includes(ext)) return `${name || 'File'}: use a JPG, PNG or WebP image.`
  if (!(file.size > 0)) return `${name}: the file is empty.`
  if (file.size > IMAGE_MAX_BYTES) return `${name}: larger than 5 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`
  return undefined
}

/**
 * Splits picked files into { accepted, errors } given how many gallery slots
 * are already used (including in-flight uploads).
 */
export function partitionImageFiles(files, usedGallerySlots = 0) {
  const accepted = []
  const errors = []
  let free = Math.max(0, IMAGE_MAX_GALLERY - usedGallerySlots)
  for (const f of Array.from(files ?? [])) {
    const err = validateImageFile(f)
    if (err) errors.push(err)
    else if (free <= 0) errors.push(`${f.name}: the gallery is full (max ${IMAGE_MAX_GALLERY} images).`)
    else {
      accepted.push(f)
      free -= 1
    }
  }
  return { accepted, errors }
}

export const formatBytes = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

// ---------------------------------------------------------------------------
// Product list URL state and edit diffs.

export const PRODUCT_FILTER_KEYS = ['q', 'type', 'status', 'category']

/** Current query + changes -> '?a=b' (empty values dropped; page reset unless changed). */
export function buildProductsSearch(query, changes) {
  const next = { ...query, ...changes }
  if (!('page' in changes)) delete next.page
  const params = new URLSearchParams()
  for (const k of [...PRODUCT_FILTER_KEYS, 'page']) {
    const v = next[k]
    if (v != null && String(v).trim() !== '' && !(k === 'page' && Number(v) <= 1)) params.set(k, String(v).trim())
  }
  const s = params.toString()
  return s ? `?${s}` : ''
}

const DETAIL_FIELDS = ['name', 'description', 'sku', 'categoryId', 'type']

/** Changed detail fields -> partial updateProduct input (status/price/stock excluded). */
export function buildDetailUpdate(values, changed) {
  const full = toProductInput(values, { includeQuantity: false })
  const out = {}
  for (const k of changed) if (DETAIL_FIELDS.includes(k)) out[k] = full[k]
  return out
}
