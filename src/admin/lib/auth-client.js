'use client'
// Browser client for the admin sign-in, MFA setup and MFA verification pages.
import { createAuthClient } from 'better-auth/react'
import { twoFactorClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  basePath: '/api/auth',
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = '/admin/mfa-verify'
      },
    }),
  ],
})

export const { signIn, signOut, useSession, twoFactor } = authClient
