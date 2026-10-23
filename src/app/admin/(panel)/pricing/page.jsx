import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import { db } from '@/server/db'
import { listAllProducts } from '@/server/catalog-v2/admin-read'
import PricesClient from '@/admin/client/catalog/PricesClient'
import { setPricesAction } from '../products/actions'

export const dynamic = 'force-dynamic'

export default async function AdminPricingPage() {
  await requirePagePermission(PERMISSIONS.PRODUCT_PRICE_UPDATE)
  return <PricesClient products={await listAllProducts(db)} setPricesAction={setPricesAction} />
}
