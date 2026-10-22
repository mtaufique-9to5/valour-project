import { redirect } from 'next/navigation'
import { getMfaSetup } from '@/server/auth/guards'
import MfaSetupClient from '@/admin/client/MfaSetupClient'

// Password accepted but MFA not yet enrolled: the only admin page such a
// sign-in can open. Every other admin page requires a full session.
export default async function AdminMfaSetupPage() {
  const pending = await getMfaSetup()
  if (!pending) redirect('/admin/login')
  return <MfaSetupClient accountLabel={pending.user.email} />
}
