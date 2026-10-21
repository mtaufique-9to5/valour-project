'use client'

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { ChevronDown, LogOut, Menu as MenuIcon, Search } from 'lucide-react'

const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?'

// user = { name, email, role }; onSignOut is called from the user menu.
// The search box is a placeholder until a search endpoint exists.
export default function Topbar({ user, onSignOut, onOpenNav, searchPlaceholder = 'Search products, orders, customers…', onSearch }) {
  return (
    <header className="va-topbar">
      <button type="button" className="va-btn va-btn-ghost va-btn-icon va-only-mobile" onClick={onOpenNav} aria-label="Open navigation">
        <MenuIcon size={20} aria-hidden="true" />
      </button>
      <form className="va-search" role="search" onSubmit={(e) => { e.preventDefault(); onSearch?.(new FormData(e.currentTarget).get('q')) }}>
        <Search size={16} aria-hidden="true" />
        <input type="search" name="q" className="va-input" placeholder={searchPlaceholder} aria-label="Search admin" />
      </form>
      <div className="va-topbar-spacer" />
      {user && (
        <Menu>
          <MenuButton className="va-user-btn" aria-label={`Account menu for ${user.name}`}>
            <span className="va-avatar" aria-hidden="true">{initials(user.name)}</span>
            <span className="va-user-meta">
              <span className="va-user-name">{user.name}</span>
              <span className="va-user-role">{user.role}</span>
            </span>
            <ChevronDown size={16} className="va-chevron" aria-hidden="true" />
          </MenuButton>
          <MenuItems transition anchor={{ to: 'bottom end', gap: 8 }} className="va-admin va-portal va-menu">
            <div className="va-menu-head">
              <div className="va-user-name">{user.name}</div>
              {user.email && <div className="va-hint">{user.email}</div>}
              <div className="va-hint">{user.role}</div>
            </div>
            <MenuItem>
              <button type="button" className="va-menu-item va-danger" onClick={onSignOut}>
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </button>
            </MenuItem>
          </MenuItems>
        </Menu>
      )}
    </header>
  )
}
