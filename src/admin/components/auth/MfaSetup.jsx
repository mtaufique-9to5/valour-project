'use client'

import { useState } from 'react'
import { Check, Copy, Download, KeyRound } from 'lucide-react'
import AuthCard from './AuthCard'
import Button from '../Button'
import { Alert } from '../Alert'
import { FormField, Input } from '../FormField'

// Two steps driven by props:
//  1. scan: qrDataUrl (data: URL image) + secret; onSubmit(code) verifies the first TOTP code.
//  2. recovery: once the parent passes recoveryCodes, show them; onComplete() is enabled
//     only after "I have saved these" is ticked.
export default function MfaSetup({ qrDataUrl, secret, recoveryCodes, onSubmit, onComplete, loading = false, error, accountLabel }) {
  const [code, setCode] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const step = recoveryCodes?.length ? 2 : 1

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const downloadCodes = () => {
    const text = `VALOUR admin recovery codes${accountLabel ? ` (${accountLabel})` : ''}\nEach code can be used once.\n\n${recoveryCodes.join('\n')}\n`
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'valour-admin-recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const steps = (
    <div className="va-steps" aria-label={`Step ${step} of 2`} role="img">
      <span data-active="true" />
      <span data-active={step === 2} />
    </div>
  )

  if (step === 2) {
    return (
      <AuthCard wide title="Save your recovery codes" subtitle="Use one of these if you lose access to your authenticator app. Each works once.">
        <div className="va-auth-form">
          {steps}
          <Alert tone="warning">These codes are shown only once. Store them somewhere safe, such as a password manager.</Alert>
          <ul className="va-codes va-mono" aria-label="Recovery codes">
            {recoveryCodes.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <div className="va-row">
            <Button icon={copied ? Check : Copy} onClick={copyCodes}>{copied ? 'Copied' : 'Copy'}</Button>
            <Button icon={Download} onClick={downloadCodes}>Download .txt</Button>
            <span className="va-sr-only" aria-live="polite">{copied ? 'Recovery codes copied' : ''}</span>
          </div>
          <label className="va-check">
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
            <span>I have saved these recovery codes</span>
          </label>
          <Button variant="primary" size="lg" block disabled={!saved} loading={loading} onClick={() => onComplete?.()}>
            Continue
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard wide title="Set up two-factor authentication" subtitle="Scan the QR code with an authenticator app, then enter the 6-digit code it shows.">
      <form
        className="va-auth-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (code.length === 6) onSubmit?.(code)
        }}
      >
        {steps}
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data: URL QR code, not an optimisable asset
          <img className="va-qr" src={qrDataUrl} alt="QR code for your authenticator app" width={196} height={196} />
        ) : (
          <div className="va-qr" aria-hidden="true" />
        )}
        <div style={{ textAlign: 'center' }}>
          <button type="button" className="va-link-btn" aria-expanded={showSecret} aria-controls="va-mfa-secret" onClick={() => setShowSecret((s) => !s)}>
            <KeyRound size={14} aria-hidden="true" style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
            {showSecret ? 'Hide setup key' : "Can't scan? Enter the key manually"}
          </button>
        </div>
        {showSecret && (
          <div id="va-mfa-secret" className="va-secret va-mono" aria-label="Manual setup key">
            {secret}
          </div>
        )}
        {error && <Alert tone="danger">{error}</Alert>}
        <FormField label="6-digit code" hint="From your authenticator app" required>
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
        <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={code.length !== 6}>
          Verify and continue
        </Button>
      </form>
    </AuthCard>
  )
}
