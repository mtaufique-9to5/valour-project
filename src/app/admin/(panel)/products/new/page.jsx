import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import { db } from '@/server/db'
import { listBrandOptions, listCategoryOptions } from '@/server/catalog-v2/admin-read'
import ProductEditorClient from '@/admin/client/catalog/ProductEditorClient'
import { createProductAction } from '../actions'

export const dynamic = 'force-dynamic'

export default async function AdminNewProductPage({ searchParams }) {
  await requirePagePermission(PERMISSIONS.PRODUCT_CREATE)
  const { type } = await searchParams
  const [categories, brands] = await Promise.all([listCategoryOptions(db), listBrandOptions(db)])
  return (
    <ProductEditorClient
      mode="new"
      initialType={String(type ?? '').toLowerCase() === 'strap' ? 'strap' : 'watch'}
      categories={categories}
      brands={brands}
      createProductAction={createProductAction}
    />
  )
}
