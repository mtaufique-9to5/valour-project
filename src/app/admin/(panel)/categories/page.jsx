import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import { db } from '@/server/db'
import { listCategoriesAdmin } from '@/server/catalog-v2/admin-read'
import TaxonomyClient from '@/admin/client/catalog/TaxonomyClient'
import { createCategoryAction, deleteCategoryAction, setCategoryStatusAction, updateCategoryAction } from '../taxonomy-actions'

export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  await requirePagePermission(PERMISSIONS.PRODUCT_UPDATE)
  return (
    <TaxonomyClient
      mode="category"
      rows={await listCategoriesAdmin(db)}
      actions={{ create: createCategoryAction, update: updateCategoryAction, setStatus: setCategoryStatusAction, remove: deleteCategoryAction }}
    />
  )
}
