import { redirect } from 'next/navigation'
import { getAdminSession } from '@/server/auth/guards'
import LoginClient from '@/admin/client/LoginClient'

// Public. An administrator who is already fully signed in goes straight to the
// dashboard; one who still has to enrol MFA goes to the setup page.
export default async function AdminLoginPage() {
  const current = await getAdminSession()
  if (current?.user?.status === 'ACTIVE') redirect(current.user.twoFactorEnabled === true ? '/admin' : '/admin/mfa-setup')
  return <LoginClient />
}
