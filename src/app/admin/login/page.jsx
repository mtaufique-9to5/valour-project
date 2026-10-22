import { redirect } from 'next/navigation'
import { getAdminSession } from '@/server/auth/guards'
import LoginClient from '@/admin/client/LoginClient'

// Public. An administrator who is already fully signed in goes straight to the dashboard.
export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect('/admin')
  return <LoginClient />
}
