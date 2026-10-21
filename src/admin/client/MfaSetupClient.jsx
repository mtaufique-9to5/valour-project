'use client'

import { useState } from 'react'
import QRCode from 'qrcode'
import AuthCard from '@/admin/components/auth/AuthCard'
import MfaSetup from '@/admin/components/auth/MfaSetup'
import { FormField, Input } from '@/admin/components/FormField'
import Button from '@/admin/components/Button'
import { Alert } from '@/admin/components/Alert'
import { twoFactor } from '@/admin/lib/auth-client'

// Mandatory MFA enrolment: confirm the password → scan the QR code → verify a
// code (this is what turns MFA on) → save the recovery codes → dashboard.
// The QR code is drawn in the browser from Better Auth's otpauth URI; the secret
// and codes are never sent anywhere else or stored by this page.
export default function MfaSetupClient({ accountLabel }) {
  const [password, setPassword] = useState('')
  const [setup, setSetup] = useState(null) // { qrDataUrl, secret, backupCodes }
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function start(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data, error: failure } = await twoFactor.enable({ password })
      if (failure || !data?.totpURI) {
        setError(failure?.status === 429 ? 'Too many attempts. Please wait and try again.' : 'Password not accepted.')
        return
      }
      const secret = new URL(data.totpURI).searchParams.get('secret') || ''
      const qrDataUrl = await QRCode.toDataURL(data.totpURI, { margin: 1, width: 220 })
      setSetup({ qrDataUrl, secret, backupCodes: data.backupCodes || [] })
      setPassword('')
    } catch {
      setError('MFA setup is unavailable right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function verify(code) {
    setLoading(true)
    setError(null)
    try {
      const { error: failure } = await twoFactor.verifyTotp({ code: String(code).trim() })
      if (failure) {
        setError('That code is not valid. Check your authenticator app and try again.')
        return
      }
      setVerified(true)
    } catch {
      setError('Verification is unavailable right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!setup) {
    return (
      <AuthCard title="Set up two-factor authentication" subtitle="Required for every administrator. Confirm your password to begin.">
        <form onSubmit={start} noValidate>
          {error && <Alert tone="danger">{error}</Alert>}
          <FormField label="Password" required>
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormField>
          <Button type="submit" variant="primary" block loading={loading} disabled={!password}>Continue</Button>
        </form>
      </AuthCard>
    )
  }

  return (
    <MfaSetup
      qrDataUrl={setup.qrDataUrl}
      secret={setup.secret}
      recoveryCodes={verified ? setup.backupCodes : undefined}
      onSubmit={verify}
      onComplete={() => { window.location.href = '/admin' }}
      loading={loading}
      error={error}
      accountLabel={accountLabel}
    />
  )
}
