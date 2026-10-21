// STAGED - move to src/app/admin/(panel)/inventory/page.jsx after the catalog migration.
import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import { listInventory } from '@/server/catalog/repository'
import { adjustInventory, setTrackingMode } from '@/server/catalog/actions'
import InventoryClient from '@/admin/client/catalog/InventoryClient'

export const dynamic = 'force-dynamic'

export default async function AdminInventoryPage() {
  const ctx = await requirePagePermission(PERMISSIONS.PRODUCT_VIEW)
  const items = await listInventory()
  const canEdit = ctx.permissions.includes(PERMISSIONS.INVENTORY_UPDATE)
  return (
    <InventoryClient
      items={items}
      canEdit={canEdit}
      adjustInventoryAction={canEdit ? adjustInventory : undefined}
      setTrackingModeAction={canEdit ? setTrackingMode : undefined}
    />
  )
}
