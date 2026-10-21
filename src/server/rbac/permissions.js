// Permission keys referenced in code. The seed script (scripts/db/seed-rbac.mjs)
// writes these to the `permissions` table; code must only use these constants.
// Pure module (no server-only import) so CLI scripts and tests can load it.

export const PERMISSIONS = Object.freeze({
  DASHBOARD_VIEW: 'dashboard.view',
  PRODUCT_VIEW: 'product.view',
  PRODUCT_CREATE: 'product.create',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_PRICE_UPDATE: 'product.price.update',
  INVENTORY_UPDATE: 'inventory.update',
  ORDER_VIEW: 'order.view',
  ORDER_UPDATE: 'order.update',
  CUSTOMER_VIEW: 'customer.view',
  CONTENT_UPDATE: 'content.update',
  ADMIN_USER_VIEW: 'admin_user.view',
  ADMIN_USER_MANAGE: 'admin_user.manage',
  ROLE_VIEW: 'role.view',
  ROLE_MANAGE: 'role.manage',
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_UPDATE: 'settings.update',
  AUDIT_VIEW: 'audit.view',
})

export const PERMISSION_DESCRIPTIONS = Object.freeze({
  'dashboard.view': 'View the admin dashboard',
  'product.view': 'View products',
  'product.create': 'Create products',
  'product.update': 'Edit product details',
  'product.price.update': 'Change product prices',
  'inventory.update': 'Change stock levels',
  'order.view': 'View orders',
  'order.update': 'Update order status',
  'customer.view': 'View customer records',
  'content.update': 'Edit site content',
  'admin_user.view': 'View administrator accounts',
  'admin_user.manage': 'Create, disable and assign roles to administrators',
  'role.view': 'View roles and permissions',
  'role.manage': 'Change roles and their permissions',
  'settings.view': 'View store settings',
  'settings.update': 'Change store settings',
  'audit.view': 'View the audit log',
})

export const ALL_PERMISSION_KEYS = Object.freeze(Object.values(PERMISSIONS))

const KNOWN = new Set(ALL_PERMISSION_KEYS)

export function isKnownPermission(key) {
  return typeof key === 'string' && KNOWN.has(key)
}
