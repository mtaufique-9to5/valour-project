'use client'

import { useState } from 'react'
import QRCode from 'qrcode'
import AuthCard from '@/admin/components/auth/AuthCard'
import MfaSetup from '@/admin/components/auth/MfaSetup'
import { Alert } from '@/admin/components/Alert'
import Button from '@/admin/components/Button'
import { confirmMfaSetup, startMfaSetup } from '@/admin/lib/auth-client'

// Mandatory MFA enrolment after the first password sign-in: the server issues a
// new secret (inside a signed, 10-minute enrolment token), the browser draws the
// QR code locally, and the first valid code turns MFA on and starts the session.
// The secret is shown once for manual entry and is never stored by this page.
export default function MfaSetupClient({ accountLabel }) {
  const [setup, setSetup] = useState(null) // { qrDataUrl, secret, enrolment }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function begin() {
    setLoading(true)
    setError(null)
    const { ok, status, data } = await startMfaSetup()
    if (!ok) {
      if (status === 401) { window.location.href = '/admin/login'; return }
      setError('Two-factor setup is unavailable right now. Please try again.')
      setLoading(false)
      return
    }
    try {
      const qrDataUrl = await QRCode.toDataURL(data.otpauthUri, { margin: 1, width: 220 })
      setSetup({ qrDataUrl, secret: data.secret, enrolment: data.enrolment })
    } catch {
      setError('Could not draw the QR code. Use the setup key instead.')
      setSetup({ qrDataUrl: '', secret: data.secret, enrolment: data.enrolment })
    } finally {
      setLoading(false)
    }
  }

  async function verify(code) {
    setLoading(true)
    setError(null)
    const { ok, status, data } = await confirmMfaSetup({ enrolment: setup.enrolment, code: String(code).trim() })
    if (ok && data.next) {
      window.location.href = data.next
      return
    }
    if (status === 401 && data.code === 'expired') { window.location.href = '/admin/login'; return }
    setError(status === 429 ? data.error : 'That code is not valid. Check your authenticator app and try again.')
    setLoading(false)
  }

  if (!setup) {
    return (
      <AuthCard title="Set up two-factor authentication" subtitle="Required for every administrator. You will need an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…).">
        {error && <Alert tone="danger">{error}</Alert>}
        <Button variant="primary" block onClick={begin} loading={loading}>{error ? 'Try again' : 'Show QR code'}</Button>
      </AuthCard>
    )
  }

  return (
    <MfaSetup
      qrDataUrl={setup.qrDataUrl}
      secret={setup.secret}
      onSubmit={verify}
      loading={loading}
      error={error}
      accountLabel={accountLabel}
    />
  )
}
