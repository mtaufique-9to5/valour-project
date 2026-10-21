'use client'

import { useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import '../styles/admin.css'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

// Layout frame: sidebar (off-canvas drawer below 1024px), topbar and content.
// Purely presentational; pass the signed-in user, their permission keys and a
// sign-out callback from the protected layout.
export default function AdminShell({
  user,
  permissions,
  basePath = '/admin',
  currentPath = '',
  currentSearch,
  linkComponent,
  onSignOut,
  onSearch,
  banner,
  sidebarFooter,
  children,
}) {
  const [navOpen, setNavOpen] = useState(false)
  const sidebarProps = { basePath, currentPath, currentSearch, permissions, linkComponent, footer: sidebarFooter }

  return (
    <div className="va-admin">
      <a href="#va-main" className="va-skip-link">Skip to content</a>
      {banner}
      <div className="va-shell">
        <Sidebar {...sidebarProps} />

        <Dialog open={navOpen} onClose={setNavOpen} className="va-admin va-portal va-only-mobile">
          <DialogBackdrop transition className="va-drawer-backdrop va-modal-backdrop" />
          <DialogPanel transition className="va-drawer-panel">
            <Sidebar {...sidebarProps} onNavigate={() => setNavOpen(false)} onClose={() => setNavOpen(false)} />
          </DialogPanel>
        </Dialog>

        <div className="va-shell-main">
          <Topbar user={user} onSignOut={onSignOut} onSearch={onSearch} onOpenNav={() => setNavOpen(true)} />
          <main id="va-main" className="va-content" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
