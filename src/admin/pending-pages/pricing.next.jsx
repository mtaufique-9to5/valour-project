// STAGED - move to src/app/admin/(panel)/pricing/page.jsx after the catalog migration.
import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import { listProducts } from '@/server/catalog/repository'
import { updatePrice } from '@/server/catalog/actions'
import PricingClient from '@/admin/client/catalog/PricingClient'

export const dynamic = 'force-dynamic'

export default async function AdminPricingPage() {
  const ctx = await requirePagePermission(PERMISSIONS.PRODUCT_VIEW)
  // Pricing needs every product on one page; pageSize is capped by the backend.
  const { rows: products } = await listProducts({ page: 1, pageSize: 500 })
  const canEdit = ctx.permissions.includes(PERMISSIONS.PRODUCT_PRICE_UPDATE)
  return <PricingClient products={products} canEdit={canEdit} updatePriceAction={canEdit ? updatePrice : undefined} />
}
