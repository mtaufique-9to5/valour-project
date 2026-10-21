import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import DashboardView from '@/admin/views/DashboardView'

// Online payment is not live, so there are no orders or sales figures yet: the
// view shows its "No orders yet" state instead of invented statistics.
export default async function AdminDashboardPage() {
  const { user } = await requirePagePermission(PERMISSIONS.DASHBOARD_VIEW)
  return <DashboardView userName={user.name} stats={null} />
}
