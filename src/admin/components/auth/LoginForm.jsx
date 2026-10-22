'use client'

import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import AuthCard from './AuthCard'
import Button from '../Button'
import { Alert } from '../Alert'
import { FormField, Input } from '../FormField'

// onSubmit({ email, password }) is called by the parent, which owns the request.
// error: a generic message only (never say which field was wrong).
// lockedUntil: Date/string when the account is temporarily locked.
// footer: optional node shown under the button (e.g. a "Forgot password?" link).
export default function LoginForm({ onSubmit, loading = false, error, lockedUntil, defaultEmail = '', footer }) {
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const locked = Boolean(lockedUntil)

  const submit = (e) => {
    e.preventDefault()
    if (!locked) onSubmit?.({ email: email.trim(), password })
  }

  return (
    <AuthCard title="Sign in to admin" subtitle="Authorised staff only.">
      <form className="va-auth-form" onSubmit={submit} noValidate={false}>
        {locked && (
          <Alert tone="warning" title="Sign-in temporarily locked">
            Too many attempts. Try again{' '}
            {lockedUntil instanceof Date ? `after ${lockedUntil.toLocaleTimeString()}` : 'later'}, or contact an administrator.
          </Alert>
        )}
        {!locked && error && <Alert tone="danger">{error}</Alert>}
        <FormField label="Email" required>
          <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} disabled={locked} />
        </FormField>
        <FormField label="Password" required id="va-login-password" cloneControl={false}>
          <div className="va-input-wrap">
            <Input
              id="va-login-password"
              required
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={locked}
            />
            <span className="va-input-addon">
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={show ? EyeOff : Eye}
                aria-label={show ? 'Hide password' : 'Show password'}
                aria-pressed={show}
                onClick={() => setShow((s) => !s)}
              />
            </span>
          </div>
        </FormField>
        <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={locked} icon={Lock}>
          Sign in
        </Button>
        {footer}
      </form>
    </AuthCard>
  )
}
