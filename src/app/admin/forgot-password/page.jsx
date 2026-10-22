import ForgotPasswordClient from '@/admin/client/ForgotPasswordClient'

// Public. The response is identical whether or not the email belongs to an admin.
export default function AdminForgotPasswordPage() {
  return <ForgotPasswordClient />
}
