import { redirect } from 'next/navigation'
import { requireAdminAllowingMfaSetup } from '@/server/auth/guards'
import MfaSetupClient from '@/admin/client/MfaSetupClient'

// Signed in with a password but MFA not yet enrolled: this is the only admin page
// such a session can open (every other page redirects here).
export default async function AdminMfaSetupPage() {
  const { user } = await requireAdminAllowingMfaSetup()
  if (user.twoFactorEnabled === true) redirect('/admin')
  return <MfaSetupClient accountLabel={user.email} />
}
