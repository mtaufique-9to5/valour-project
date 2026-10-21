'use client'

import { useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import { ADMIN_NAV, filterNav } from './nav'
import { activeNavIds } from './nav-match'

// basePath: route prefix ('/admin'); currentPath: pathname for aria-current;
// currentSearch: query string for filtered links (defaults to the URL's);
// linkComponent: e.g. next/link (defaults to <a>); onNavigate closes the drawer.
export default function Sidebar({
  basePath = '/admin',
  currentPath = '',
  currentSearch,
  permissions,
  nav = ADMIN_NAV,
  linkComponent: LinkTag = 'a',
  onNavigate,
  onClose,
  footer,
}) {
  const groups = filterNav(nav, permissions)
  const clean = (p) => (p.length > 1 ? p.replace(/\/$/, '') : p)
  const urlSearch = useSearchParams()
  const search = currentSearch ?? urlSearch?.toString() ?? ''
  const activeIds = activeNavIds(groups.flatMap((g) => g.items), basePath, currentPath, search)
  return (
    <aside className="va-sidebar" aria-label="Admin">
      <div className="va-brand">
        <span className="va-brand-mark">VALOUR</span>
        <span className="va-brand-tag">Admin</span>
        {onClose && (
          <button type="button" className="va-btn va-btn-ghost va-btn-icon va-btn-sm va-drawer-close" onClick={onClose} aria-label="Close navigation">
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      <nav className="va-nav" aria-label="Admin sections">
        {groups.map((g) => (
          <div key={g.group}>
            <div className="va-nav-group-label" id={`va-nav-${g.group}`}>{g.group}</div>
            <ul className="va-nav-list" aria-labelledby={`va-nav-${g.group}`}>
              {g.items.map((item) => {
                const href = item.path.includes('?') ? `${basePath}${item.path}` : clean(`${basePath}${item.path}`) || '/'
                const active = activeIds.has(item.id)
                const Icon = item.icon
                return (
                  <li key={item.id}>
                    <LinkTag href={href} className="va-nav-link" aria-current={active ? 'page' : undefined} onClick={onNavigate}>
                      <Icon size={18} aria-hidden="true" />
                      {item.label}
                    </LinkTag>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      {footer && <div className="va-sidebar-foot">{footer}</div>}
    </aside>
  )
}
