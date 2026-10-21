'use client'

import ProductListView from './ProductListView'

// products: strap rows (see ProductListView); onEdit(row); storefrontHref(row) => url.
export default function StrapsView({ products, loading, onEdit, storefrontHref, badge, actions }) {
  return (
    <ProductListView
      kind="strap"
      title="Straps"
      description="Interchangeable straps sold on their own and with the customizer."
      products={products}
      loading={loading}
      onEdit={onEdit}
      storefrontHref={storefrontHref}
      badge={badge}
      actions={actions}
    />
  )
}
