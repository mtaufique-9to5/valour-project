'use client'

import { useState } from 'react'
import Link from 'next/link'
import LoginForm from '@/admin/components/auth/LoginForm'
import { signIn } from '@/admin/lib/auth-client'

// Email + password step. On success the server sets a short-lived MFA cookie and
// says where to go next (code entry, or first-time MFA setup). No session exists
// until the code is verified. Errors stay generic.
export default function LoginClient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit({ email, password }) {
    setLoading(true)
    setError(null)
    const { ok, status, data } = await signIn({ email, password })
    if (ok && data.next) {
      window.location.href = data.next
      return
    }
    setError(
      status === 401 ? 'Invalid email or password.'
        : status === 429 ? data.error || 'Too many attempts. Please wait a few minutes and try again.'
        : 'Sign-in is unavailable right now. Please try again later.'
    )
    setLoading(false)
  }

  return (
    <LoginForm
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      footer={<p className="va-auth-footnote"><Link href="/admin/forgot-password" className="va-link-btn">Forgot password?</Link></p>}
    />
  )
}
