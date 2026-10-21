// Custom-watch options (SC-3 / SC-8). The storefront sends option keys
// { caseId, dialId, strapId } (customizer_options.option_key); the server checks
// each against the ACTIVE options for its part and stores:
//   cart_items.options      normalised keys          options_hash  SHA-256 of them
//   order_items.options     keys + display names (order-time snapshot)
import { createHash } from 'node:crypto'
import { CommerceError } from './errors.js'

export const PARTS = Object.freeze({ caseId: 'case', dialId: 'dial', strapId: 'strap' })
export const OPTION_KEY_RE = /^[a-z0-9-]{1,50}$/

/** SHA-256 of the normalised options in fixed key order; '' when there are none. */
export function optionsHash(options) {
  if (options == null) return ''
  const canonical = JSON.stringify(Object.keys(PARTS).map((k) => [k, options[k]]))
  return createHash('sha256').update(canonical).digest('hex')
}

/**
 * Validate a custom selection against active options.
 * activeOptions: [{ part, optionKey, name, status }]
 * Returns { options, snapshot, hash }. Watches and straps must send no options.
 */
export function normalizeCustomOptions(productType, raw, activeOptions) {
  if (productType !== 'custom') {
    if (raw != null && Object.keys(raw).length) throw new CommerceError('options_not_allowed')
    return { options: null, snapshot: null, hash: '' }
  }
  if (!raw || typeof raw !== 'object') throw new CommerceError('options_required')
  const extra = Object.keys(raw).filter((k) => !Object.hasOwn(PARTS, k))
  if (extra.length) throw new CommerceError('unknown_option', 'Unknown option', { fields: extra })

  const options = {}
  const snapshot = {}
  for (const [field, part] of Object.entries(PARTS)) {
    const key = raw[field]
    const match = typeof key === 'string' && OPTION_KEY_RE.test(key)
      ? activeOptions.find((o) => o.part === part && o.optionKey === key && o.status === 'active')
      : undefined
    if (!match) throw new CommerceError('invalid_option', `Choose an available ${part}`, { field })
    options[field] = key
    snapshot[part] = { key, name: match.name }
  }
  return { options, snapshot, hash: optionsHash(options) }
}
