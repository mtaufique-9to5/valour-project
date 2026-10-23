// Audit service. Revision 3 has no audit table: entries go to the server log.
// Call it with the transaction of the change it records: recordAudit(tx, {...}).
// Pure helpers are exported for unit tests.
import 'server-only'

export const ACTOR_TYPES = Object.freeze(['ADMIN', 'SYSTEM', 'CLI'])
export const MAX_SNAPSHOT_BYTES = 60_000
export const TRUNCATED_MARKER = '{"_truncated":true}'

const LIMITS = Object.freeze({
  action: 100,
  targetType: 50,
  targetId: 64,
  actorId: 64,
  actorLabel: 255,
  requestId: 64,
  userAgent: 255,
  ipAddress: 45,
})

// Keys never stored, at any depth (compared case-insensitively, ignoring _ and -).
const SENSITIVE = [
  'password', 'passwordhash', 'hash', 'token', 'accesstoken', 'refreshtoken', 'idtoken',
  'secret', 'backupcodes', 'backupcode', 'apikey', 'otp', 'code', 'totp', 'cookie',
  'authorization', 'session', 'sessiontoken', 'databaseurl', 'connectionstring',
  'creditcard', 'cardnumber', 'cvv',
]
function isSensitiveKey(key) {
  const k = String(key).toLowerCase().replace(/[_-]/g, '')
  return SENSITIVE.some((s) => k === s || k.endsWith(s)) || k.includes('password') || k.includes('secret')
}

// Per-action allowlists of top-level before/after fields. Actions not listed
// keep all non-sensitive fields; add entries as admin features are built.
export const ACTION_ALLOWLIST = Object.freeze({
  'auth.login.success': ['email', 'mfaPending'],
  'auth.login.failure': ['email', 'failedLoginCount', 'reason'],
  'auth.lockout': ['email', 'failedLoginCount', 'lockedUntil'],
  'admin_user.create': ['id', 'email', 'name', 'status', 'roles'],
  'admin_user.update': ['email', 'name', 'status', 'roles'],
  'role.assign': ['roleKey', 'userId'],
  'role.permission.grant': ['roleKey', 'permissionKey'],
  'role.permission.revoke': ['roleKey', 'permissionKey'],
  'product.create': ['name', 'description', 'sku', 'categoryId', 'type', 'status', 'price', 'currency', 'trackingMode', 'quantity',
    'slug', 'brandId', 'basePrice', 'salePrice', 'trackStock', 'stock', 'isFeatured'],
  'product.update': ['name', 'description', 'sku', 'categoryId', 'type', 'status', 'subtitle', 'movement', 'material', 'color', 'tagline', 'limited', 'edition',
    'slug', 'brandId', 'shortDescription', 'additionalInfo', 'metaTitle', 'isFeatured'],
  'product.status.update': ['status'],
  'product.archive': ['status'],
  'product.image.upload': ['imageId', 'role', 'mime', 'bytes', 'width', 'height', 'path'],
  'product.image.delete': ['imageId', 'role', 'source', 'storageKey', 'url', 'position', 'path'],
  'product.image.primary': ['imageId', 'path'],
  'product.image.section': ['role', 'path'],
  'product.image.section.remove': ['role', 'path'],
  'product.image.reorder': ['order'],
  'inventory.tracking.update': ['trackingMode', 'quantityOnHand', 'delta', 'reason'],
  'product.price.update': ['price', 'amountMinor', 'confirmed', 'currency', 'reason', 'basePrice', 'salePrice'],
  'inventory.update': ['quantityOnHand', 'delta', 'reason', 'note', 'trackStock', 'stock'],
  // Approved-schema (rev. 2) actions; used once the replacement migration is live.
  'product.delete': ['status', 'deleted'],
  'product.restore': ['status', 'deleted'],
  'category.create': ['name', 'slug', 'type', 'parentId', 'sortOrder'],
  'category.update': ['name', 'slug', 'type', 'parentId', 'sortOrder'],
  'category.status.update': ['status'],
  'category.delete': ['deleted'],
  'brand.create': ['name', 'slug'],
  'brand.update': ['name', 'slug'],
  'brand.status.update': ['status'],
  'brand.delete': ['deleted'],
  'order.status.update': ['status'],
  'order.cancel': ['status', 'released', 'couponReleased'],
  'payment.confirm': ['paymentStatus', 'paymentId', 'reference'],
  'payment.status.update': ['paymentStatus'],
  'payment.refund': ['paymentStatus', 'amount', 'refundedTotal'],
  'catalog.seed': ['collections', 'products', 'images', 'prices', 'pricedConfirmed', 'unpricedDrafts', 'inventoryRows', 'customizerOptions', 'roles', 'settings'],
})

function stripSensitive(value, depth = 0) {
  if (depth > 20) return '[depth]'
  if (Array.isArray(value)) return value.map((v) => stripSensitive(v, depth + 1))
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'bigint') return value.toString()
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      if (isSensitiveKey(k)) continue
      out[k] = stripSensitive(v, depth + 1)
    }
    return out
  }
  return value
}

/** Apply the action's allowlist, then remove sensitive keys at every depth. */
export function sanitizeSnapshot(action, data) {
  if (data === undefined || data === null) return null
  let picked = data
  const allow = Object.hasOwn(ACTION_ALLOWLIST, action) ? ACTION_ALLOWLIST[action] : null
  if (allow && typeof data === 'object' && !Array.isArray(data)) {
    picked = {}
    for (const k of allow) if (Object.hasOwn(data, k)) picked[k] = data[k]
  }
  return stripSensitive(picked)
}

/** Serialize to JSON, replacing anything over the byte cap with a marker. */
export function serializeSnapshot(value, maxBytes = MAX_SNAPSHOT_BYTES) {
  if (value === null || value === undefined) return null
  const json = JSON.stringify(value)
  if (json === undefined) return null
  const bytes = Buffer.byteLength(json, 'utf8')
  if (bytes <= maxBytes) return json
  return JSON.stringify({ _truncated: true, originalBytes: bytes })
}

/** Trim to a column length in characters (code points; never splits a surrogate pair). */
export function trimTo(value, max) {
  if (value === null || value === undefined) return null
  const s = String(value)
  if (s.length <= max) return s
  return Array.from(s).slice(0, max).join('')
}

/** Zero the last IPv4 octet, or keep only the first 48 bits (3 groups) of IPv6. */
export function minimizeIp(ip) {
  if (typeof ip !== 'string' || ip === '') return null
  const v4 = ip.match(/^(?:::ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/i)
  if (v4) return `${v4[1]}.0`
  if (ip.includes(':')) {
    const [head] = ip.split('::')
    const groups = head.split(':').filter(Boolean).slice(0, 3)
    return `${groups.join(':')}::`
  }
  return null
}

/** Validate and build the Prisma `data` object (pure). Throws on invalid input. */
export function buildAuditData(entry, { minimize = false } = {}) {
  const e = entry ?? {}
  if (!ACTOR_TYPES.includes(e.actorType)) throw new Error('audit: invalid actorType')
  if (typeof e.action !== 'string' || e.action.trim() === '') throw new Error('audit: action is required')
  if (e.actorType === 'ADMIN' && (typeof e.actorId !== 'string' || e.actorId === '')) {
    throw new Error('audit: ADMIN events require actorId')
  }
  const ip = minimize ? minimizeIp(e.ipAddress) : e.ipAddress
  return {
    actorType: e.actorType,
    actorId: trimTo(e.actorId, LIMITS.actorId),
    actorLabel: trimTo(e.actorLabel, LIMITS.actorLabel),
    action: trimTo(e.action, LIMITS.action),
    targetType: trimTo(e.targetType, LIMITS.targetType),
    targetId: trimTo(e.targetId, LIMITS.targetId),
    before: serializeSnapshot(sanitizeSnapshot(e.action, e.before)),
    after: serializeSnapshot(sanitizeSnapshot(e.action, e.after)),
    requestId: trimTo(e.requestId, LIMITS.requestId),
    ipAddress: trimTo(ip, LIMITS.ipAddress),
    userAgent: trimTo(e.userAgent, LIMITS.userAgent),
  }
}

/**
 * Write one audit row.
 * @param {object} client Prisma client or interactive transaction (tx)
 * @param {object} entry { actorType, actorId, actorLabel, action, targetType, targetId,
 *   before, after, requestId, ipAddress, userAgent }
 * @param {{ minimize?: boolean }} [options] minimize: store a reduced IP address
 */
/**
 * Record an admin action. Revision 3 has no audit table (owner decision), so the
 * validated, sanitised entry is written as one JSON line to the server log
 * ("[audit] {...}"); sensitive keys are already removed by buildAuditData.
 * The first argument (client/transaction) is kept for call-site compatibility.
 */
export async function recordAudit(_client, entry, options) {
  const data = buildAuditData(entry, options)
  console.info('[audit] ' + JSON.stringify({ at: new Date().toISOString(), ...data }))
  return { id: null }
}
