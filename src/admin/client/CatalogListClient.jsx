'use client'

import WatchesView from '@/admin/views/WatchesView'
import StrapsView from '@/admin/views/StrapsView'
import { Badge } from '@/admin/components/Badge'
import { getProductHref } from '@/app/features/product/productUrl'

// Read-only product lists (editing arrives with the catalog database tables).
export default function CatalogListClient({ kind, products }) {
  const View = kind === 'strap' ? StrapsView : WatchesView
  return <View products={products} storefrontHref={getProductHref} badge={<Badge>Read-only · catalog file</Badge>} />
}
