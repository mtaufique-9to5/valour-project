// In-memory rate limits, login lockout and TOTP replay protection (pure).
// Revision 3 has no column for failure counters, so these live in the server
// process: they reset on restart and assume a single server process (documented
// in Ordered_Ecommerce_CMS_Schema.md, users). Keys are hashed emails/IPs, never
// stored anywhere else.

export class SlidingWindow {
  constructor({ limit, windowMs, maxKeys = 10_000 }) {
    this.limit = limit
    this.windowMs = windowMs
    this.maxKeys = maxKeys
    this.hits = new Map()
  }

  /** Records a hit; returns true while the key is within its limit. */
  hit(key, now = Date.now()) {
    const fresh = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs)
    fresh.push(now)
    this.hits.set(key, fresh)
    if (this.hits.size > this.maxKeys) this.hits.delete(this.hits.keys().next().value)
    return fresh.length <= this.limit
  }

  reset(key) {
    this.hits.delete(key)
  }
}

/** N failures within the window lock the key until the window has passed. */
export class Lockout {
  constructor({ maxFailures = 5, lockMs = 15 * 60_000 } = {}) {
    this.maxFailures = maxFailures
    this.lockMs = lockMs
    this.state = new Map()
  }

  lockedUntil(key, now = Date.now()) {
    const s = this.state.get(key)
    if (!s?.until) return null
    if (s.until <= now) { this.state.delete(key); return null }
    return new Date(s.until)
  }

  /** Returns the lock expiry when this failure locks the key, else null. */
  fail(key, now = Date.now()) {
    const s = this.state.get(key) ?? { failures: [], until: 0 }
    s.failures = s.failures.filter((t) => now - t < this.lockMs)
    s.failures.push(now)
    if (s.failures.length >= this.maxFailures) { s.until = now + this.lockMs; s.failures = [] }
    this.state.set(key, s)
    return s.until > now ? new Date(s.until) : null
  }

  succeed(key) {
    this.state.delete(key)
  }
}

/** Remembers used (user, TOTP step) pairs so a code cannot be used twice. */
export class ReplayGuard {
  constructor({ ttlMs = 3 * 60_000 } = {}) {
    this.ttlMs = ttlMs
    this.used = new Map()
  }

  /** Returns false if this (user, step) was already used; otherwise records it. */
  use(userId, step, now = Date.now()) {
    for (const [k, t] of this.used) if (now - t > this.ttlMs) this.used.delete(k)
    const k = `${userId}:${step}`
    if (this.used.has(k)) return false
    this.used.set(k, now)
    return true
  }
}

// One set per server process.
export const limits = {
  loginPerIp: new SlidingWindow({ limit: 20, windowMs: 15 * 60_000 }),
  loginLockout: new Lockout({ maxFailures: 5, lockMs: 15 * 60_000 }),
  mfaPerUser: new Lockout({ maxFailures: 5, lockMs: 15 * 60_000 }),
  resetPerIp: new SlidingWindow({ limit: 5, windowMs: 15 * 60_000 }),
  resetPerEmail: new SlidingWindow({ limit: 3, windowMs: 60 * 60_000 }),
  totpReplay: new ReplayGuard(),
}
