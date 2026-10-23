import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import { db } from '@/server/db'
import { listProducts, listCategoryOptions } from '@/server/catalog-v2/admin-read'
import ProductsClient from '@/admin/client/catalog/ProductsClient'
import { archiveProductAction } from './actions'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20
const one = (v) => (Array.isArray(v) ? v[0] : v) ?? ''
const pick = (v, allowed) => (allowed.includes(v) ? v : '')

// Products from watchwebsite (Revision 3). Watches and Straps are this list
// filtered by type (?type=WATCH / ?type=STRAP).
export default async function AdminProductsPage({ searchParams }) {
  await requirePagePermission(PERMISSIONS.PRODUCT_VIEW)
  const sp = await searchParams
  const query = {
    q: one(sp?.q).trim().slice(0, 100),
    type: pick(one(sp?.type).toUpperCase(), ['WATCH', 'STRAP']),
    status: pick(one(sp?.status).toUpperCase(), ['DRAFT', 'ACTIVE', 'ARCHIVED']),
    category: one(sp?.category),
  }
  const page = Math.max(1, Number.parseInt(one(sp?.page), 10) || 1)
  const [list, categories] = await Promise.all([listProducts(db, { ...query, page, pageSize: PAGE_SIZE }), listCategoryOptions(db)])
  return (
    <ProductsClient
      key={JSON.stringify(query)}
      rows={list.rows}
      total={list.total}
      page={list.page}
      pageSize={list.pageSize}
      query={query}
      categories={categories}
      canCreate
      canEdit
      archiveProductAction={archiveProductAction}
      newHref={query.type === 'STRAP' ? '/admin/products/new?type=strap' : '/admin/products/new'}
    />
  )
}
