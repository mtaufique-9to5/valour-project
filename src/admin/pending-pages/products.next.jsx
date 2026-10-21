// STAGED - move to src/app/admin/(panel)/products/page.jsx after the catalog migration.
// Assumes listProducts({ q, type, status, category, page, pageSize }) -> { rows, total, page, pageSize }
// and listCategories() -> [{ id, name }] from the backend contract.
import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import { listCategories, listProducts } from '@/server/catalog/repository'
import { archiveProduct } from '@/server/catalog/actions'
import ProductsClient from '@/admin/client/catalog/ProductsClient'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20
const one = (v) => (Array.isArray(v) ? v[0] : v) ?? ''
const pick = (v, allowed) => (allowed.includes(v) ? v : '')

export default async function AdminProductsPage({ searchParams }) {
  const ctx = await requirePagePermission(PERMISSIONS.PRODUCT_VIEW)
  const sp = await searchParams
  const query = {
    q: one(sp?.q).slice(0, 100),
    type: pick(one(sp?.type).toUpperCase(), ['WATCH', 'STRAP']),
    status: pick(one(sp?.status).toUpperCase(), ['DRAFT', 'ACTIVE', 'ARCHIVED']),
    category: one(sp?.category),
  }
  const page = Math.max(1, Number.parseInt(one(sp?.page), 10) || 1)
  const [list, categories] = await Promise.all([
    listProducts({ ...query, page, pageSize: PAGE_SIZE }),
    listCategories(),
  ])
  const canEdit = ctx.permissions.includes(PERMISSIONS.PRODUCT_UPDATE)
  return (
    <ProductsClient
      key={JSON.stringify(query)}
      rows={list.rows}
      total={list.total}
      page={list.page}
      pageSize={list.pageSize}
      query={query}
      categories={categories}
      canCreate={ctx.permissions.includes(PERMISSIONS.PRODUCT_CREATE)}
      canEdit={canEdit}
      archiveProductAction={canEdit ? archiveProduct : undefined}
    />
  )
}
