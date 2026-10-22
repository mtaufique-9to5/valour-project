'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthCard from '@/admin/components/auth/AuthCard'
import { FormField, Input } from '@/admin/components/FormField'
import Button from '@/admin/components/Button'
import { Alert } from '@/admin/components/Alert'
import { requestPasswordReset } from '@/admin/lib/auth-client'

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { ok, data } = await requestPasswordReset({ email: email.trim() })
    if (ok) setMessage(data.message)
    else setError(data.error || 'Something went wrong. Please try again.')
    setLoading(false)
  }

  return (
    <AuthCard title="Reset your password" subtitle="Enter the email address of your admin account.">
      {message ? (
        <Alert tone="success">{message}</Alert>
      ) : (
        <form className="va-auth-form" onSubmit={submit}>
          {error && <Alert tone="danger">{error}</Alert>}
          <FormField label="Email" required>
            <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <Button type="submit" variant="primary" block loading={loading} disabled={!email.trim()}>Send reset link</Button>
        </form>
      )}
      <p className="va-auth-footnote"><Link href="/admin/login" className="va-link-btn">Back to sign in</Link></p>
    </AuthCard>
  )
}
