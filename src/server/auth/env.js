// Startup validation for auth settings (pure). Errors never include values.

export const MIN_SECRET_LENGTH = 32

export function assertAuthSecret(secret) {
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new Error('BETTER_AUTH_SECRET is not set')
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`BETTER_AUTH_SECRET must be at least ${MIN_SECRET_LENGTH} characters`)
  }
  return secret
}

export function assertAuthUrl(url) {
  if (typeof url !== 'string' || url === '') throw new Error('BETTER_AUTH_URL is not set')
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('BETTER_AUTH_URL is not a valid URL')
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('BETTER_AUTH_URL must use http or https')
  }
  return url
}

/**
 * Auth settings for the watchwebsite auth module. AUTH_SECRET / APP_URL are the
 * names going forward; the previous BETTER_AUTH_* names are still accepted so an
 * existing .env.local keeps working. Values are validated, never logged.
 */
export function getAuthConfig(env = process.env) {
  const secret = env.AUTH_SECRET || env.BETTER_AUTH_SECRET
  const appUrl = env.APP_URL || env.BETTER_AUTH_URL
  if (!secret || secret.length < MIN_SECRET_LENGTH) throw new Error(`AUTH_SECRET must be set (at least ${MIN_SECRET_LENGTH} characters)`)
  assertAuthUrl(appUrl)
  return { secret, appUrl: new URL(appUrl).origin, secure: new URL(appUrl).protocol === 'https:' || env.NODE_ENV === 'production' }
}
