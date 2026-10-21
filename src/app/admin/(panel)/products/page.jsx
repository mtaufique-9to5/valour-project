import { redirect } from 'next/navigation'
import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'

// TEMPORARY until the catalog migration: the sidebar links to
// /admin/products?type=…, but products still come from the read-only catalog
// file pages. Replaced by src/admin/pending-pages/products.next.jsx.
export default async function AdminProductsRedirect({ searchParams }) {
  await requirePagePermission(PERMISSIONS.PRODUCT_VIEW)
  const { type } = await searchParams
  redirect(type === 'STRAP' ? '/admin/straps' : '/admin/watches')
}
