// Screens reachable at /admin-preview/<id>. Shell screens follow the sidebar
// paths; the rest are listed in the sidebar footer.
export const PREVIEW_VIEWS = [
  'products', 'watches', 'straps', 'pricing', 'inventory', 'orders', 'customers', 'content',
  'users', 'roles', 'audit', 'settings',
  'product-new', 'product-edit', 'product-view', 'dashboard-empty', 'orders-empty', 'loading', 'access-denied',
  'login', 'login-error', 'login-locked', 'mfa-setup', 'mfa-recovery', 'mfa-verify',
]

export const EXTRA_SCREENS = [
  ['product-new', 'Product (new)'],
  ['product-edit', 'Product edit'],
  ['product-view', 'Product (read-only)'],
  ['watches', 'Watches (legacy list)'],
  ['straps', 'Straps (legacy list)'],
  ['dashboard-empty', 'Dashboard (empty)'],
  ['orders-empty', 'Orders (empty)'],
  ['loading', 'Table loading'],
  ['access-denied', 'Access denied'],
  ['login', 'Login'],
  ['login-error', 'Login (error)'],
  ['login-locked', 'Login (locked)'],
  ['mfa-setup', 'MFA setup'],
  ['mfa-recovery', 'MFA recovery codes'],
  ['mfa-verify', 'MFA verify'],
]
