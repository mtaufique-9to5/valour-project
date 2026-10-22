import { db } from '@/server/db'
import { getAuthConfig } from '@/server/auth/env'
import { checkResetToken } from '@/server/auth/service'
import ResetPasswordClient from '@/admin/client/ResetPasswordClient'

export const dynamic = 'force-dynamic'
// The token is in the URL: never send it onward in a Referer header.
export const metadata = { referrer: 'no-referrer', robots: { index: false } }

// Public. The link's signed token is checked (expiry, signature, still unused)
// before the form is shown; it is checked again when the new password is saved.
export default async function AdminResetPasswordPage({ searchParams }) {
  const { token } = await searchParams
  const user = typeof token === 'string' ? await checkResetToken(db, token, getAuthConfig()).catch(() => null) : null
  return <ResetPasswordClient token={user ? token : null} email={user?.email ?? null} />
}
