import MfaVerifyClient from '@/admin/client/MfaVerifyClient'

// Public by design: between the password and the code there is no session, only
// Better Auth's signed, short-lived two-factor cookie, which its verify endpoints
// check on the server. Without that cookie verification simply fails.
export default function AdminMfaVerifyPage() {
  return <MfaVerifyClient />
}
