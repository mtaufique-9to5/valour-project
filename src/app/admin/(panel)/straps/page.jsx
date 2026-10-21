import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import { catalogStraps } from '@/server/admin/catalog-source'
import CatalogListClient from '@/admin/client/CatalogListClient'

export default async function AdminStrapsPage() {
  await requirePagePermission(PERMISSIONS.PRODUCT_VIEW)
  return <CatalogListClient kind="strap" products={catalogStraps()} />
}
