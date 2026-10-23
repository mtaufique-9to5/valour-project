import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import { db } from '@/server/db'
import { listBrandsAdmin } from '@/server/catalog-v2/admin-read'
import TaxonomyClient from '@/admin/client/catalog/TaxonomyClient'
import { createBrandAction, deleteBrandAction, setBrandStatusAction, updateBrandAction } from '../taxonomy-actions'

export const dynamic = 'force-dynamic'

export default async function AdminBrandsPage() {
  await requirePagePermission(PERMISSIONS.PRODUCT_UPDATE)
  return (
    <TaxonomyClient
      mode="brand"
      rows={await listBrandsAdmin(db)}
      actions={{ create: createBrandAction, update: updateBrandAction, setStatus: setBrandStatusAction, remove: deleteBrandAction }}
    />
  )
}
