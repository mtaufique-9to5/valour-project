import { redirect } from 'next/navigation'
import { getPendingMfa } from '@/server/auth/guards'
import MfaVerifyClient from '@/admin/client/MfaVerifyClient'

// Only reachable with the short-lived cookie issued after a correct password;
// the code itself is checked on the server.
export default async function AdminMfaVerifyPage() {
  if (!(await getPendingMfa())) redirect('/admin/login')
  return <MfaVerifyClient />
}
