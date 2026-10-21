'use client'

import { useRouter } from 'next/navigation'
import WatchesView from '@/admin/views/WatchesView'
import StrapsView from '@/admin/views/StrapsView'
import { getProductHref } from '@/app/features/product/productUrl'

// products: toAdminRow rows. canEdit: has product.update -> rows open the edit page.
export default function ProductListClient({ kind = 'watch', products = [], canEdit = false, badge }) {
  const router = useRouter()
  const View = kind === 'strap' ? StrapsView : WatchesView
  return (
    <View
      products={products}
      storefrontHref={getProductHref}
      onEdit={canEdit ? (row) => router.push(`/admin/products/${row.id}`) : undefined}
      badge={badge}
    />
  )
}
