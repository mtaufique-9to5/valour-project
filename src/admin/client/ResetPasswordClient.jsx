'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthCard from '@/admin/components/auth/AuthCard'
import { FormField, Input } from '@/admin/components/FormField'
import Button from '@/admin/components/Button'
import { Alert } from '@/admin/components/Alert'
import { resetPassword } from '@/admin/lib/auth-client'

// Set a new password from an emailed link. Two-factor authentication is not
// changed: the next sign-in still asks for the authenticator code.
export default function ResetPasswordClient({ token, email }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  if (!token) {
    return (
      <AuthCard title="Link not valid" subtitle="This reset link is invalid, has expired or was already used.">
        <p className="va-auth-footnote"><Link href="/admin/forgot-password" className="va-link-btn">Request a new link</Link></p>
      </AuthCard>
    )
  }

  async function submit(e) {
    e.preventDefault()
    if (password !== confirm) { setError('The passwords do not match.'); return }
    setLoading(true)
    setError(null)
    const { ok, data } = await resetPassword({ token, password })
    if (ok) setDone(data.message)
    else setError(data.error || 'Something went wrong. Please try again.')
    setLoading(false)
  }

  if (done) {
    return (
      <AuthCard title="Password changed">
        <Alert tone="success">{done}</Alert>
        <p className="va-auth-footnote"><Link href="/admin/login" className="va-link-btn">Sign in</Link></p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Choose a new password" subtitle={email ? `For ${email}. At least 12 characters, mixing letters, digits or symbols.` : undefined}>
      <form className="va-auth-form" onSubmit={submit}>
        {error && <Alert tone="danger">{error}</Alert>}
        <FormField label="New password" required>
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </FormField>
        <FormField label="Repeat new password" required>
          <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </FormField>
        <Button type="submit" variant="primary" block loading={loading} disabled={!password || !confirm}>Set password</Button>
      </form>
    </AuthCard>
  )
}
