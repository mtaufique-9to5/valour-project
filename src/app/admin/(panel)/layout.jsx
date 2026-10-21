import { getAdminContext } from '@/server/admin/context'
import AdminPanelFrame from '@/admin/client/AdminPanelFrame'

// Fully protected area: a valid session, an active account and completed MFA
// are checked on the server for every request (getAdminContext → requireAdmin).
// Each page additionally checks its own permission.
export default async function AdminPanelLayout({ children }) {
  const { user, permissions } = await getAdminContext()
  return (
    <AdminPanelFrame user={user} permissions={permissions}>
      {children}
    </AdminPanelFrame>
  )
}
