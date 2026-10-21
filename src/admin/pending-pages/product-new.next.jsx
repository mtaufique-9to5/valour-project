// STAGED - move to src/app/admin/(panel)/products/new/page.jsx after the catalog migration.
import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import { listCategories } from '@/server/catalog/repository'
import { createProduct } from '@/server/catalog/actions'
import ProductFormClient from '@/admin/client/catalog/ProductFormClient'

export const dynamic = 'force-dynamic'

export default async function AdminProductNewPage() {
  await requirePagePermission(PERMISSIONS.PRODUCT_CREATE)
  const categories = await listCategories()
  return <ProductFormClient mode="new" categories={categories} canEdit createProductAction={createProduct} />
}
