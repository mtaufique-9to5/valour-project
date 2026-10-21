import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import OrdersView from '@/admin/views/OrdersView'

// Online payment is not live, so no orders exist yet.
export default async function AdminOrdersPage() {
  await requirePagePermission(PERMISSIONS.ORDER_VIEW)
  return <OrdersView orders={[]} />
}
