// Better Auth (1.7.8) server instance for the VALOUR admin area.
// Admin accounts are created only by scripts/create-first-admin.mjs or by an
// administrator; public sign-up is disabled. MFA (TOTP) is enforced by the
// session guards in ./guards.js.
import 'server-only'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { APIError, createAuthMiddleware, getIP } from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'
import { twoFactor } from 'better-auth/plugins'

import { db } from '../db.js'
import { recordAudit } from '../audit/audit.js'
import { assertAuthSecret, assertAuthUrl } from './env.js'
import { hashPassword, verifyPassword } from './password.js'
import {
  evaluateSignInAttempt,
  GENERIC_SIGN_IN_ERROR,
  nextFailureState,
  normalizeEmail,
  successState,
} from './lockout.js'

const secret = assertAuthSecret(process.env.BETTER_AUTH_SECRET)
const baseURL = assertAuthUrl(process.env.BETTER_AUTH_URL)
const isProduction = process.env.NODE_ENV === 'production'

const SIGN_IN_PATH = '/sign-in/email'

function genericSignInError() {
  return APIError.from('UNAUTHORIZED', {
    code: 'INVALID_EMAIL_OR_PASSWORD',
    message: GENERIC_SIGN_IN_ERROR,
  })
}

function requestMeta(ctx) {
  const headers = ctx.request?.headers ?? ctx.headers
  let ipAddress = null
  try {
    ipAddress = headers ? getIP(ctx.request ?? headers, ctx.context.options) : null
  } catch {
    ipAddress = null
  }
  return { ipAddress, userAgent: headers?.get?.('user-agent') ?? null }
}

const lockoutUserSelect = {
  id: true, email: true, status: true, failedLoginCount: true, lockedUntil: true,
}

async function findUserByEmail(email) {
  if (!email) return null
  return db.adminUser.findUnique({ where: { email }, select: lockoutUserSelect })
}

// Audit failures must never break sign-in or reveal anything to the client.
async function safeAudit(client, entry) {
  try {
    await recordAudit(client, entry, { minimize: true })
  } catch {
    console.error('[auth] audit write failed for', entry.action)
  }
}

// Before: refuse disabled or locked accounts with the same error as a bad password.
const beforeHook = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== SIGN_IN_PATH) return
  const email = normalizeEmail(ctx.body?.email)
  const user = await findUserByEmail(email)
  const { blocked, reason } = evaluateSignInAttempt(user)
  if (!blocked) return
  await safeAudit(db, {
    actorType: 'SYSTEM',
    action: 'auth.login.failure',
    targetType: 'admin_user',
    targetId: user.id,
    after: { email: user.email, failedLoginCount: user.failedLoginCount, reason },
    ...requestMeta(ctx),
  })
  throw genericSignInError()
})

// After: count failures, lock at the threshold, reset on success.
const afterHook = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== SIGN_IN_PATH) return
  const email = normalizeEmail(ctx.body?.email)
  const user = await findUserByEmail(email)
  if (!user) return // unknown email: Better Auth already returned the generic error
  const returned = ctx.context.returned
  const meta = requestMeta(ctx)
  const failed = returned?.statusCode === 401 || returned?.status === 'UNAUTHORIZED'
  // Other errors (validation, rate limit, server) neither count nor reset.
  if (!failed && returned instanceof Error) return

  if (failed) {
    const state = nextFailureState(user)
    await db.$transaction(async (tx) => {
      await tx.adminUser.update({
        where: { id: user.id },
        data: { failedLoginCount: state.failedLoginCount, lockedUntil: state.lockedUntil },
      })
      await safeAudit(tx, {
        actorType: 'SYSTEM',
        action: 'auth.login.failure',
        targetType: 'admin_user',
        targetId: user.id,
        after: { email: user.email, failedLoginCount: state.failedLoginCount, reason: 'bad_password' },
        ...meta,
      })
      if (state.lockedNow) {
        await safeAudit(tx, {
          actorType: 'SYSTEM',
          action: 'auth.lockout',
          targetType: 'admin_user',
          targetId: user.id,
          after: { email: user.email, failedLoginCount: state.failedLoginCount, lockedUntil: state.lockedUntil },
          ...meta,
        })
      }
    })
    return
  }

  // Password accepted (either a session, or the two-factor challenge redirect).
  const mfaPending = returned?.twoFactorRedirect === true
  await db.$transaction(async (tx) => {
    await tx.adminUser.update({ where: { id: user.id }, data: successState() })
    await safeAudit(tx, {
      actorType: 'ADMIN',
      actorId: user.id,
      actorLabel: user.email,
      action: 'auth.login.success',
      targetType: 'admin_user',
      targetId: user.id,
      after: { email: user.email, mfaPending },
      ...meta,
    })
  })
})

export const auth = betterAuth({
  appName: 'VALOUR Admin',
  database: prismaAdapter(db, { provider: 'mysql' }),
  secret,
  baseURL,
  basePath: '/api/auth',
  user: {
    modelName: 'adminUser',
    additionalFields: {
      status: { type: 'string', required: false, defaultValue: 'ACTIVE', input: false },
      failedLoginCount: { type: 'number', required: false, defaultValue: 0, input: false, returned: false },
      lockedUntil: { type: 'date', required: false, input: false, returned: false },
    },
  },
  session: {
    modelName: 'adminSession',
    expiresIn: 60 * 60 * 8, // 8 hours
    updateAge: 60 * 60, // refresh expiry at most hourly
    cookieCache: { enabled: false },
  },
  account: { modelName: 'adminAccount' },
  verification: { modelName: 'adminVerification' },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 14,
    maxPasswordLength: 128,
    password: { hash: hashPassword, verify: verifyPassword },
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    modelName: 'adminRateLimit',
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/two-factor/*': { window: 60, max: 5 },
    },
  },
  telemetry: { enabled: false },
  advanced: {
    useSecureCookies: isProduction,
    cookiePrefix: 'valour_admin',
  },
  hooks: { before: beforeHook, after: afterHook },
  plugins: [
    twoFactor({
      issuer: 'VALOUR',
      twoFactorTable: 'adminTwoFactor',
      backupCodeOptions: { storeBackupCodes: 'encrypted' },
    }),
    nextCookies(), // must stay last
  ],
})
