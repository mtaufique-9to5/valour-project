import { redirect } from 'next/navigation'
import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'

// Kept URL: Straps are products of type strap, managed in the product list.
export default async function AdminStrapsPage() {
  await requirePagePermission(PERMISSIONS.PRODUCT_VIEW)
  redirect('/admin/products?type=STRAP')
}
