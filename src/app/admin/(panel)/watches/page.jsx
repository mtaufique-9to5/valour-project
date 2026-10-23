import { redirect } from 'next/navigation'
import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'

// Kept URL: Watches are products of type watch, managed in the product list.
export default async function AdminWatchesPage() {
  await requirePagePermission(PERMISSIONS.PRODUCT_VIEW)
  redirect('/admin/products?type=WATCH')
}
