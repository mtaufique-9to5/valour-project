// MOCK DATA for the admin design preview only: placeholder staff accounts,
// a sample role/permission matrix and audit entries. The real roles and
// permission keys come from the server; keep the keys below in sync once known.

export const MOCK_CURRENT_USER = { name: 'Preview Admin', email: 'preview.admin@example.com', role: 'Owner' }

export const MOCK_PERMISSIONS = [
  { key: 'dashboard.view', group: 'Overview', label: 'View dashboard' },
  { key: 'product.view', group: 'Catalog', label: 'View products' },
  { key: 'product.update', group: 'Catalog', label: 'Edit products' },
  { key: 'product.price.view', group: 'Catalog', label: 'View pricing' },
  { key: 'product.price.update', group: 'Catalog', label: 'Change prices' },
  { key: 'inventory.view', group: 'Catalog', label: 'View inventory' },
  { key: 'inventory.update', group: 'Catalog', label: 'Adjust stock' },
  { key: 'order.view', group: 'Sales', label: 'View orders' },
  { key: 'order.update', group: 'Sales', label: 'Update orders' },
  { key: 'customer.view', group: 'Sales', label: 'View customers' },
  { key: 'content.view', group: 'Content', label: 'View content' },
  { key: 'content.update', group: 'Content', label: 'Edit content' },
  { key: 'admin_user.view', group: 'Administration', label: 'View admin users' },
  { key: 'admin_user.manage', group: 'Administration', label: 'Manage admin users' },
  { key: 'role.view', group: 'Administration', label: 'View roles' },
  { key: 'audit.view', group: 'Administration', label: 'View audit log' },
  { key: 'settings.view', group: 'Administration', label: 'View settings' },
  { key: 'settings.update', group: 'Administration', label: 'Change settings' },
]

const ALL = MOCK_PERMISSIONS.map((p) => p.key)

export const MOCK_ROLES = [
  { id: 'owner', name: 'Owner', description: 'Full access', permissions: ALL },
  {
    id: 'manager',
    name: 'Store manager',
    description: 'Catalog, sales and content',
    permissions: ALL.filter((k) => !k.startsWith('admin_user.manage') && !k.startsWith('settings.update') && k !== 'product.price.update'),
  },
  { id: 'support', name: 'Support', description: 'Orders and customers', permissions: ['dashboard.view', 'order.view', 'order.update', 'customer.view', 'product.view'] },
  { id: 'editor', name: 'Content editor', description: 'Site content only', permissions: ['dashboard.view', 'content.view', 'content.update', 'product.view'] },
]

export const MOCK_ALL_PERMISSION_KEYS = ALL

export const MOCK_ADMIN_USERS = [
  { id: 'u1', name: 'Preview Admin', email: 'preview.admin@example.com', role: 'Owner', status: 'Active', mfa: true, lastLogin: '2026-10-20 09:12' },
  { id: 'u2', name: 'Sample Manager', email: 'manager@example.com', role: 'Store manager', status: 'Active', mfa: true, lastLogin: '2026-10-19 17:40' },
  { id: 'u3', name: 'Sample Support', email: 'support@example.com', role: 'Support', status: 'Invited', mfa: false, lastLogin: null },
  { id: 'u4', name: 'Sample Editor', email: 'editor@example.com', role: 'Content editor', status: 'Suspended', mfa: true, lastLogin: '2026-09-30 11:05' },
]

export const MOCK_AUDIT_LOG = [
  { id: 'a9', at: '2026-10-20 09:12', actor: 'preview.admin@example.com', action: 'auth.login', target: '-', ip: '203.0.113.10', result: 'Success' },
  { id: 'a8', at: '2026-10-19 17:44', actor: 'manager@example.com', action: 'product.update', target: 'watch:2 (Astral Blue)', ip: '203.0.113.24', result: 'Success' },
  { id: 'a7', at: '2026-10-19 17:40', actor: 'manager@example.com', action: 'auth.login', target: '-', ip: '203.0.113.24', result: 'Success' },
  { id: 'a6', at: '2026-10-19 08:02', actor: 'unknown@example.com', action: 'auth.login', target: '-', ip: '198.51.100.7', result: 'Failed' },
  { id: 'a5', at: '2026-10-18 14:30', actor: 'preview.admin@example.com', action: 'admin_user.invite', target: 'support@example.com', ip: '203.0.113.10', result: 'Success' },
  { id: 'a4', at: '2026-10-18 14:22', actor: 'preview.admin@example.com', action: 'role.update', target: 'Support', ip: '203.0.113.10', result: 'Success' },
  { id: 'a3', at: '2026-10-17 10:15', actor: 'editor@example.com', action: 'content.update', target: 'Homepage hero', ip: '192.0.2.44', result: 'Success' },
  { id: 'a2', at: '2026-10-16 16:51', actor: 'support@example.com', action: 'product.price.update', target: 'strap:1 (Black Strap)', ip: '192.0.2.81', result: 'Denied' },
  { id: 'a1', at: '2026-10-15 09:00', actor: 'preview.admin@example.com', action: 'settings.update', target: 'Store details', ip: '203.0.113.10', result: 'Success' },
]

// Sample MFA enrolment values for the auth screen previews. Not a real secret.
export const MOCK_MFA_SECRET = 'SAMPLE-NOT-A-REAL-SECRET'
export const MOCK_RECOVERY_CODES = ['sample-0001', 'sample-0002', 'sample-0003', 'sample-0004', 'sample-0005', 'sample-0006', 'sample-0007', 'sample-0008']
