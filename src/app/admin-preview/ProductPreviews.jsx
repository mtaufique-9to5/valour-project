'use client'

// Product admin screens for the design preview: real client components wired
// to fake actions and a fake uploader. No network, nothing is saved.

import { useSearchParams } from 'next/navigation'
import ProductsClient from '@/admin/client/catalog/ProductsClient'
import ProductFormClient from '@/admin/client/catalog/ProductFormClient'
import { SampleBadge } from '@/admin/components/Badge'
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '@/admin/mock/catalog'

const BASE = '/admin-preview'
const PAGE_SIZE = 8
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const ok = async () => {
  await wait(400)
  return { ok: true }
}

// Simulated upload: progress ticks, then success. Files whose name contains
// "fail" end in an error so the Retry/Remove state can be reviewed.
function fakeUpload(file, role, onProgress) {
  let timer
  let cancel
  const promise = new Promise((resolve) => {
    let p = 0
    cancel = () => {
      clearInterval(timer)
      resolve({ ok: false, error: 'Upload cancelled.', aborted: true })
    }
    timer = setInterval(() => {
      p = Math.min(100, p + 8 + Math.round(Math.random() * 12))
      onProgress(p)
      if (p < 100) return
      clearInterval(timer)
      if (/fail/i.test(file.name)) {
        resolve({ ok: false, error: 'Preview: simulated server error.' })
        return
      }
      resolve({
        ok: true,
        image: {
          id: `preview-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          url: URL.createObjectURL(file), // preview only; never revoked, page-lifetime
          role,
          position: 99,
          isPrimary: role === 'MAIN',
          width: null,
          height: null,
        },
      })
    }, 150)
  })
  return { promise, abort: () => cancel?.() }
}

const actions = {
  createProductAction: async (input) => {
    await wait(500)
    if (input.sku === 'TAKEN') return { ok: false, error: 'Some fields need attention.', fieldErrors: { sku: 'This SKU is already used by another product.' } }
    return { ok: true, id: MOCK_PRODUCTS.find((p) => p.status === 'DRAFT')?.id ?? MOCK_PRODUCTS[0].id }
  },
  updateProductAction: ok,
  setProductStatusAction: ok,
  updatePriceAction: ok,
  adjustInventoryAction: ok,
  setTrackingModeAction: ok,
  deleteProductImageAction: ok,
  setPrimaryImageAction: ok,
  reorderImagesAction: ok,
}

const editHref = (id) => `${BASE}/product-edit?key=${encodeURIComponent(id)}`

export function ProductsPreview() {
  const sp = useSearchParams()
  const query = {
    q: sp.get('q') ?? '',
    type: sp.get('type') ?? '',
    status: sp.get('status') ?? '',
    category: sp.get('category') ?? '',
  }
  const q = query.q.trim().toLowerCase()
  const filtered = MOCK_PRODUCTS.filter(
    (p) =>
      (!q || `${p.name} ${p.sku}`.toLowerCase().includes(q)) &&
      (!query.type || p.type === query.type) &&
      (!query.status || p.status === query.status) &&
      (!query.category || String(p.categoryId) === query.category)
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(pageCount, Math.max(1, Number(sp.get('page')) || 1))
  return (
    <ProductsClient
      key={JSON.stringify(query)}
      rows={filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)}
      total={filtered.length}
      page={page}
      pageSize={PAGE_SIZE}
      query={query}
      categories={MOCK_CATEGORIES}
      canCreate
      canEdit
      archiveProductAction={ok}
      basePath={`${BASE}/products`}
      newHref={`${BASE}/product-new`}
      editHref={(r) => editHref(r.id)}
      storefrontHref={(r) => `/our-shop/${r.slug}/`}
      badge={<SampleBadge />}
    />
  )
}

export function ProductNewPreview() {
  return (
    <ProductFormClient
      mode="new"
      categories={MOCK_CATEGORIES}
      canEdit
      {...actions}
      backHref={`${BASE}/products`}
      editHref={editHref}
      badge={<SampleBadge />}
    />
  )
}

export function ProductEditPreview({ readOnly = false }) {
  const key = useSearchParams().get('key')
  const product = MOCK_PRODUCTS.find((p) => p.id === key) ?? MOCK_PRODUCTS[0]
  return (
    <ProductFormClient
      key={product.id}
      mode="edit"
      product={product}
      categories={MOCK_CATEGORIES}
      canEdit={!readOnly}
      canEditPrice={!readOnly}
      canEditStock={!readOnly}
      {...actions}
      upload={fakeUpload}
      backHref={`${BASE}/products`}
      editHref={editHref}
      badge={<SampleBadge />}
    />
  )
}
