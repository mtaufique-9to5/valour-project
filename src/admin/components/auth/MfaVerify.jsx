'use client'

import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import AuthCard from './AuthCard'
import Button from '../Button'
import { Alert } from '../Alert'
import { FormField, Input } from '../FormField'

// onSubmit({ method: 'totp' | 'recovery', code }); onCancel optional (back to sign-in).
export default function MfaVerify({ onSubmit, onCancel, loading = false, error }) {
  const [method, setMethod] = useState('totp')
  const [code, setCode] = useState('')
  const isTotp = method === 'totp'
  const valid = isTotp ? code.length === 6 : code.trim().length >= 8

  const switchMethod = () => {
    setMethod(isTotp ? 'recovery' : 'totp')
    setCode('')
  }

  return (
    <AuthCard
      title="Two-factor verification"
      subtitle={isTotp ? 'Enter the 6-digit code from your authenticator app.' : 'Enter one of your saved recovery codes.'}
    >
      <form
        className="va-auth-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onSubmit?.({ method, code: code.trim() })
        }}
      >
        {error && <Alert tone="danger">{error}</Alert>}
        {isTotp ? (
          <FormField key="totp" label="Authentication code" required>
            <Input
              className="va-code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </FormField>
        ) : (
          <FormField key="recovery" label="Recovery code" hint="Each recovery code can be used once." required>
            <Input className="va-mono" autoComplete="off" spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)} />
          </FormField>
        )}
        <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={!valid} icon={ShieldCheck}>
          Verify
        </Button>
        <div className="va-row va-between">
          <button type="button" className="va-link-btn" onClick={switchMethod}>
            {isTotp ? 'Use a recovery code' : 'Use authenticator app'}
          </button>
          {onCancel && (
            <button type="button" className="va-link-btn" onClick={onCancel}>Back to sign in</button>
          )}
        </div>
      </form>
    </AuthCard>
  )
}
