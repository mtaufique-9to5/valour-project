import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import { db } from '@/server/db'
import { listAllProducts } from '@/server/catalog-v2/admin-read'
import StockClient from '@/admin/client/catalog/StockClient'
import { setInventoryAction } from '../products/actions'

export const dynamic = 'force-dynamic'

export default async function AdminInventoryPage() {
  await requirePagePermission(PERMISSIONS.INVENTORY_UPDATE)
  // InventoryView reads `status` as the stock state.
  const items = (await listAllProducts(db)).map((r) => ({ ...r, status: r.stockStatus }))
  return <StockClient items={items} setInventoryAction={setInventoryAction} />
}
