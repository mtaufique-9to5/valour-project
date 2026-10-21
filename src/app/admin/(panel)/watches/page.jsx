import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import { catalogWatches } from '@/server/admin/catalog-source'
import CatalogListClient from '@/admin/client/CatalogListClient'

export default async function AdminWatchesPage() {
  await requirePagePermission(PERMISSIONS.PRODUCT_VIEW)
  return <CatalogListClient kind="watch" products={catalogWatches()} />
}
