'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AdminShell from '@/admin/components/AdminShell'
import { signOut } from '@/admin/lib/auth-client'

// Client frame for the protected admin area. The sidebar hides items the user
// lacks permission for; that is cosmetic only, as every page checks on the server.
export default function AdminPanelFrame({ user, permissions, children }) {
  const pathname = usePathname() || '/admin'

  async function handleSignOut() {
    try {
      await signOut()
    } finally {
      window.location.href = '/admin/login'
    }
  }

  return (
    <AdminShell user={user} permissions={permissions} basePath="/admin" currentPath={pathname} linkComponent={Link} onSignOut={handleSignOut}>
      {children}
    </AdminShell>
  )
}
