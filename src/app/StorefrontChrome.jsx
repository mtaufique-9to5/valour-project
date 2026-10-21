'use client'

import { usePathname } from 'next/navigation'
import CartSidebar from '@/components/CartSidebar'
import CartHydrator from './CartHydrator'
import { Toaster } from 'react-hot-toast'

// Storefront-only UI (cart drawer, cart restore, toasts). The admin area has its
// own layout and never shows or hydrates the customer's cart.
export default function StorefrontChrome() {
  const pathname = usePathname() || ''
  if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/admin-preview' || pathname.startsWith('/admin-preview/')) return null
  return (
    <>
      <CartHydrator />
      <Toaster position="bottom-right" />
      <CartSidebar />
    </>
  )
}
