import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import CustomersView from '@/admin/views/CustomersView'

// Customers are created with orders, which do not exist yet.
export default async function AdminCustomersPage() {
  await requirePagePermission(PERMISSIONS.CUSTOMER_VIEW)
  return <CustomersView customers={[]} />
}
