'use client'

import ProductListView from './ProductListView'

// products: watch rows (see ProductListView); onEdit(row); storefrontHref(row) => url.
export default function WatchesView({ products, loading, onEdit, storefrontHref, badge, actions }) {
  return (
    <ProductListView
      kind="watch"
      title="Watches"
      description="Every watch in the catalog. Prices show only when confirmed."
      products={products}
      loading={loading}
      onEdit={onEdit}
      storefrontHref={storefrontHref}
      badge={badge}
      actions={actions}
    />
  )
}
