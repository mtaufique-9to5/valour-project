'use client'

import { useState } from 'react'
import MfaVerify from '@/admin/components/auth/MfaVerify'
import { verifyTotp } from '@/admin/lib/auth-client'

export default function MfaVerifyClient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit({ code }) {
    setLoading(true)
    setError(null)
    const { ok, status, data } = await verifyTotp({ code })
    if (ok && data.next) {
      window.location.href = data.next
      return
    }
    if (status === 401 && data.code === 'expired') {
      window.location.href = '/admin/login'
      return
    }
    setError(status === 429 ? data.error : status === 401 ? 'That code is not valid.' : 'Verification is unavailable right now. Please try again.')
    setLoading(false)
  }

  return (
    <MfaVerify
      allowRecovery={false}
      onSubmit={handleSubmit}
      onCancel={() => { window.location.href = '/admin/login' }}
      loading={loading}
      error={error}
    />
  )
}
