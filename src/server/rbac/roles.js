// Role matrix (source of truth for the seed script). Pure module.
import { ALL_PERMISSION_KEYS, PERMISSIONS as P } from './permissions.js'

export const ROLE_KEYS = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  PRODUCT_MANAGER: 'PRODUCT_MANAGER',
  CONTENT_MANAGER: 'CONTENT_MANAGER',
  VIEWER: 'VIEWER',
})

const viewOnly = ALL_PERMISSION_KEYS.filter((k) => k.endsWith('.view'))

export const ROLE_DEFINITIONS = Object.freeze({
  SUPER_ADMIN: {
    name: 'Super administrator',
    description: 'Full access, including role management',
    permissions: [...ALL_PERMISSION_KEYS],
  },
  ADMIN: {
    name: 'Administrator',
    description: 'Full access except changing roles',
    permissions: ALL_PERMISSION_KEYS.filter((k) => k !== P.ROLE_MANAGE),
  },
  PRODUCT_MANAGER: {
    name: 'Product manager',
    description: 'Products, prices, inventory; read-only orders',
    permissions: [
      P.DASHBOARD_VIEW, P.PRODUCT_VIEW, P.PRODUCT_CREATE, P.PRODUCT_UPDATE,
      P.PRODUCT_PRICE_UPDATE, P.INVENTORY_UPDATE, P.ORDER_VIEW,
    ],
  },
  CONTENT_MANAGER: {
    name: 'Content manager',
    description: 'Site content; read-only products',
    permissions: [P.DASHBOARD_VIEW, P.CONTENT_UPDATE, P.PRODUCT_VIEW],
  },
  VIEWER: {
    name: 'Viewer',
    description: 'Read-only access',
    permissions: viewOnly,
  },
})

/** Permissions granted by a set of role keys (unknown roles grant nothing). */
export function permissionsForRoles(roleKeys) {
  const out = new Set()
  for (const key of roleKeys ?? []) {
    const def = Object.hasOwn(ROLE_DEFINITIONS, key) ? ROLE_DEFINITIONS[key] : null
    if (def) for (const p of def.permissions) out.add(p)
  }
  return out
}
