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
