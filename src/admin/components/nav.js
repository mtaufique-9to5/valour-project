import {
  Boxes,
  FileText,
  LayoutDashboard,
  Link2,
  Package,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tag,
  UserCog,
  Users,
  Watch,
} from 'lucide-react'

// Sidebar structure. `path` is relative to the shell's basePath ('' = index);
// it may carry a query string (filtered links), matched by Sidebar.
// `permission` hides the item when the user lacks it; this is cosmetic only,
// the server enforces every permission.
export const ADMIN_NAV = [
  { group: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', path: '', icon: LayoutDashboard, permission: 'dashboard.view' }] },
  {
    group: 'Catalog',
    items: [
      { id: 'products', label: 'Products', path: '/products', icon: Package, permission: 'product.view' },
      { id: 'watches', label: 'Watches', path: '/products?type=WATCH', icon: Watch, permission: 'product.view' },
      { id: 'straps', label: 'Straps', path: '/products?type=STRAP', icon: Link2, permission: 'product.view' },
      { id: 'pricing', label: 'Pricing', path: '/pricing', icon: Tag, permission: 'product.view' },
      { id: 'inventory', label: 'Inventory', path: '/inventory', icon: Boxes, permission: 'product.view' },
    ],
  },
  {
    group: 'Sales',
    items: [
      { id: 'orders', label: 'Orders', path: '/orders', icon: ShoppingBag, permission: 'order.view' },
      { id: 'customers', label: 'Customers', path: '/customers', icon: Users, permission: 'customer.view' },
    ],
  },
  { group: 'Content', items: [{ id: 'content', label: 'Content', path: '/content', icon: FileText, permission: 'content.update' }] },
  {
    group: 'Administration',
    items: [
      { id: 'admin-users', label: 'Admin users', path: '/users', icon: UserCog, permission: 'admin_user.view' },
      { id: 'roles', label: 'Roles & permissions', path: '/roles', icon: ShieldCheck, permission: 'role.view' },
      { id: 'audit', label: 'Audit log', path: '/audit', icon: ScrollText, permission: 'audit.view' },
      { id: 'settings', label: 'Settings', path: '/settings', icon: Settings, permission: 'settings.view' },
    ],
  },
]

// permissions undefined = show everything (e.g. design preview).
export function filterNav(nav, permissions) {
  if (!Array.isArray(permissions)) return nav
  const allowed = new Set(permissions)
  return nav
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.permission || allowed.has(i.permission)) }))
    .filter((g) => g.items.length > 0)
}

export { activeNavIds } from './nav-match'
