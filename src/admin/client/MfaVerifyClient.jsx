'use client'

import { useState } from 'react'
import MfaVerify from '@/admin/components/auth/MfaVerify'
import { twoFactor } from '@/admin/lib/auth-client'

export default function MfaVerifyClient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit({ method, code }) {
    setLoading(true)
    setError(null)
    try {
      const verify = method === 'recovery' ? twoFactor.verifyBackupCode : twoFactor.verifyTotp
      const { error: failure } = await verify({ code: code.trim(), trustDevice: false })
      if (failure) {
        setError(failure.status === 429 ? 'Too many attempts. Please wait and try again.' : 'That code is not valid. Sign in again if it keeps failing.')
        return
      }
      window.location.href = '/admin'
    } catch {
      setError('Verification is unavailable right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return <MfaVerify onSubmit={handleSubmit} onCancel={() => { window.location.href = '/admin/login' }} loading={loading} error={error} />
}
