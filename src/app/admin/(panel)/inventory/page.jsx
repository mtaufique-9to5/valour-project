import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import InventoryView from '@/admin/views/InventoryView'

// Stock is not tracked yet, so no figures are shown (never invented).
export default async function AdminInventoryPage() {
  await requirePagePermission(PERMISSIONS.PRODUCT_VIEW)
  return <InventoryView items={[]} />
}
