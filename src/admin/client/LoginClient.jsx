'use client'

import { useState } from 'react'
import LoginForm from '@/admin/components/auth/LoginForm'
import { signIn } from '@/admin/lib/auth-client'

const GENERIC_ERROR = 'Invalid email or password.'

// Email + password step. When the account has MFA, Better Auth answers with a
// two-factor challenge and the client plugin moves to /admin/mfa-verify; no
// session exists until the code is verified. Errors stay generic.
export default function LoginClient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit({ email, password }) {
    setLoading(true)
    setError(null)
    try {
      const { data, error: failure } = await signIn.email({ email, password })
      if (failure) {
        // Only a 401 means "wrong credentials" (also used for locked/disabled
        // accounts, deliberately). Anything else is a service problem and must not
        // be reported as a bad password.
        setError(
          failure.status === 401 ? GENERIC_ERROR
            : failure.status === 429 ? 'Too many attempts. Please wait a few minutes and try again.'
            : 'Sign-in is unavailable right now. Please try again later.'
        )
        return
      }
      if (data?.twoFactorRedirect) return // the plugin is already navigating to /admin/mfa-verify
      // Signed in without MFA: the server sends unenrolled admins to /admin/mfa-setup.
      window.location.href = '/admin'
    } catch {
      setError('Sign-in is unavailable right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return <LoginForm onSubmit={handleSubmit} loading={loading} error={error} />
}
