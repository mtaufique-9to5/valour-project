import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import { catalogProducts } from '@/server/admin/catalog-source'
import PricingView from '@/admin/views/PricingView'
import { Badge } from '@/admin/components/Badge'

// Confirmed prices from the catalog file; editing is enabled once prices live in
// the database (product.price.update, audit-logged).
export default async function AdminPricingPage() {
  await requirePagePermission(PERMISSIONS.PRODUCT_VIEW)
  return <PricingView products={catalogProducts()} canEdit={false} badge={<Badge>Read-only · catalog file</Badge>} />
}
