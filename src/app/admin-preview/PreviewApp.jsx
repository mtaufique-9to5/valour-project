'use client'

// Design preview harness: wires src/admin views to mock data + the real
// catalog. No API calls, no auth, nothing from src/server. Callbacks only
// raise toasts. Delete at milestone M2.

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { TriangleAlert } from 'lucide-react'
import AdminShell from '@/admin/components/AdminShell'
import { SampleBadge } from '@/admin/components/Badge'
import { ToastViewport } from '@/admin/components/Alert'
import useToasts from '@/admin/hooks/useToasts'
import LoginForm from '@/admin/components/auth/LoginForm'
import MfaSetup from '@/admin/components/auth/MfaSetup'
import MfaVerify from '@/admin/components/auth/MfaVerify'
import DashboardView from '@/admin/views/DashboardView'
import WatchesView from '@/admin/views/WatchesView'
import StrapsView from '@/admin/views/StrapsView'
import PricingClient from '@/admin/client/catalog/PricingClient'
import InventoryClient from '@/admin/client/catalog/InventoryClient'
import OrdersView from '@/admin/views/OrdersView'
import CustomersView from '@/admin/views/CustomersView'
import ContentView from '@/admin/views/ContentView'
import AdminUsersView from '@/admin/views/AdminUsersView'
import RolesView from '@/admin/views/RolesView'
import AuditLogView from '@/admin/views/AuditLogView'
import SettingsView from '@/admin/views/SettingsView'
import AccessDeniedView from '@/admin/views/AccessDeniedView'
import { CATALOG_PRODUCTS, CATALOG_STRAPS, CATALOG_WATCHES, MOCK_CONTENT, MOCK_INVENTORY, MOCK_PRODUCTS, MOCK_SETTINGS } from '@/admin/mock/catalog'
import { MOCK_CUSTOMERS, MOCK_DASHBOARD, MOCK_ORDERS, MOCK_REVENUE_WEEKS } from '@/admin/mock/sales'
import {
  MOCK_ADMIN_USERS,
  MOCK_AUDIT_LOG,
  MOCK_CURRENT_USER,
  MOCK_MFA_SECRET,
  MOCK_PERMISSIONS,
  MOCK_RECOVERY_CODES,
  MOCK_ROLES,
} from '@/admin/mock/admin'
import { EXTRA_SCREENS } from './views'
import { ProductEditPreview, ProductNewPreview, ProductsPreview } from './ProductPreviews'

const BASE = '/admin-preview'
const sample = <SampleBadge />
const fakeOk = async () => {
  await new Promise((r) => setTimeout(r, 400))
  return { ok: true }
}
// Inventory rows with the mock tracking modes (untracked rows have no counts).
const PREVIEW_INVENTORY = MOCK_INVENTORY.map((row) => {
  const p = MOCK_PRODUCTS.find((x) => x.id === row.id)
  return p?.trackingMode === 'NOT_TRACKED'
    ? { ...row, trackingMode: 'NOT_TRACKED', onHand: null, reserved: null, available: null, status: 'Not tracked' }
    : { ...row, trackingMode: 'TRACKED' }
})

// Placeholder image standing in for a server-generated QR code.
const PLACEHOLDER_QR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><rect x="8" y="8" width="24" height="24" fill="none" stroke="#111" stroke-width="5"/><rect x="68" y="8" width="24" height="24" fill="none" stroke="#111" stroke-width="5"/><rect x="8" y="68" width="24" height="24" fill="none" stroke="#111" stroke-width="5"/><text x="50" y="54" font-size="9" text-anchor="middle" font-family="sans-serif" fill="#111">SAMPLE QR</text></svg>'
  )

function Banner() {
  return (
    <div className="va-preview-banner" role="note">
      <TriangleAlert size={14} aria-hidden="true" />
      Design preview — mock data — not the admin panel
    </div>
  )
}

export default function PreviewApp({ view }) {
  const pathname = usePathname() || BASE
  const router = useRouter()
  const { toasts, push, dismiss } = useToasts()
  const note = (title, message = 'Preview only: nothing was saved.') => push({ tone: 'info', title, message })

  const toasts$ = <ToastViewport toasts={toasts} onDismiss={dismiss} />

  // Auth screens render without the shell, as they will in the real app.
  const auth = {
    login: <LoginForm onSubmit={() => router.push(`${BASE}/mfa-verify`)} />,
    'login-error': <LoginForm error="Invalid email or password." defaultEmail="preview.admin@example.com" onSubmit={() => note('Sign in')} />,
    'login-locked': <LoginForm lockedUntil="later" onSubmit={() => {}} />,
    'mfa-setup': <MfaSetup qrDataUrl={PLACEHOLDER_QR} secret={MOCK_MFA_SECRET} onSubmit={() => router.push(`${BASE}/mfa-recovery`)} />,
    'mfa-recovery': <MfaSetup qrDataUrl={PLACEHOLDER_QR} secret={MOCK_MFA_SECRET} recoveryCodes={MOCK_RECOVERY_CODES} accountLabel="preview.admin@example.com" onComplete={() => router.push(BASE)} />,
    'mfa-verify': <MfaVerify onSubmit={() => router.push(BASE)} onCancel={() => router.push(`${BASE}/login`)} />,
  }
  if (auth[view]) {
    return (
      <div className="va-admin">
        <Banner />
        {auth[view]}
        {toasts$}
      </div>
    )
  }

  const editHref = (r) => router.push(`${BASE}/product-edit?key=${encodeURIComponent(r.id)}`)
  const storefrontHref = (r) => (r.type === 'strap' ? `/straps/${r.slug}` : `/our-shop/${r.slug}`)

  const screens = {
    dashboard: (
      <DashboardView
        userName={MOCK_CURRENT_USER.name}
        stats={MOCK_DASHBOARD}
        revenueSeries={MOCK_REVENUE_WEEKS}
        recentOrders={MOCK_ORDERS.slice(0, 5)}
        lowStock={MOCK_INVENTORY.filter((i) => i.status !== 'In stock').slice(0, 5)}
        sample
      />
    ),
    'dashboard-empty': <DashboardView userName={MOCK_CURRENT_USER.name} stats={null} />,
    watches: <WatchesView products={CATALOG_WATCHES} onEdit={editHref} storefrontHref={storefrontHref} />,
    straps: <StrapsView products={CATALOG_STRAPS} onEdit={editHref} storefrontHref={storefrontHref} />,
    products: <ProductsPreview />,
    'product-new': <ProductNewPreview />,
    'product-edit': <ProductEditPreview />,
    'product-view': <ProductEditPreview readOnly />,
    pricing: <PricingClient products={CATALOG_PRODUCTS} canEdit updatePriceAction={fakeOk} badge={sample} />,
    inventory: <InventoryClient items={PREVIEW_INVENTORY} canEdit adjustInventoryAction={fakeOk} setTrackingModeAction={fakeOk} badge={sample} />,
    orders: <OrdersView orders={MOCK_ORDERS} onView={(r) => note(`Open order ${r.id}`)} badge={sample} />,
    'orders-empty': <OrdersView orders={[]} />,
    loading: <OrdersView orders={[]} loading />,
    customers: <CustomersView customers={MOCK_CUSTOMERS} badge={sample} />,
    content: <ContentView entries={MOCK_CONTENT} onCreate={() => note('New content entry')} onEdit={(r) => note(`Edit ${r.title}`)} badge={sample} />,
    users: (
      <AdminUsersView
        users={MOCK_ADMIN_USERS}
        roles={MOCK_ROLES}
        onInvite={(v) => note(`Invite ${v.email}`)}
        onSuspend={(u) => note(`Suspend ${u.name}`)}
        onResetMfa={(u) => note(`Reset 2FA for ${u.name}`)}
        badge={sample}
      />
    ),
    roles: <RolesView roles={MOCK_ROLES} permissions={MOCK_PERMISSIONS} badge={sample} />,
    audit: <AuditLogView entries={MOCK_AUDIT_LOG} badge={sample} />,
    settings: <SettingsView settings={MOCK_SETTINGS} onSave={() => note('Save settings')} badge={sample} />,
    'access-denied': <AccessDeniedView permission="audit.view" homeHref={BASE} linkComponent={Link} />,
  }

  return (
    <AdminShell
      user={MOCK_CURRENT_USER}
      basePath={BASE}
      currentPath={pathname}
      linkComponent={Link}
      onSignOut={() => router.push(`${BASE}/login`)}
      onSearch={(q) => note(`Search "${q}"`, 'Search is not wired yet.')}
      banner={<Banner />}
      sidebarFooter={
        <nav aria-label="Other preview screens">
          <div className="va-nav-group-label" style={{ padding: '0 0 6px' }}>Preview screens</div>
          <ul className="va-stack" style={{ gap: 4 }}>
            {EXTRA_SCREENS.map(([id, label]) => (
              <li key={id}>
                <Link href={`${BASE}/${id}`} aria-current={pathname === `${BASE}/${id}` ? 'page' : undefined}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      }
    >
      {screens[view] ?? screens.dashboard}
      {toasts$}
    </AdminShell>
  )
}
