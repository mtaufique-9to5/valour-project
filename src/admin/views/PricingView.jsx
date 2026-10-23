'use client'

import { Lock, Pencil } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Card } from '../components/Card'
import DataTable from '../components/DataTable'
import Button from '../components/Button'
import { Badge } from '../components/Badge'
import { Alert } from '../components/Alert'
import { capitalize, formatPrice } from './format'
import { NO_PRICE_WARNING } from '../client/catalog/format'

// products: catalog rows with price (null = unconfirmed). canEdit reflects
// product.price.update (cosmetic; the server enforces); onEditPrice(row).
export default function PricingView({ products = [], loading = false, canEdit = false, onEditPrice, badge }) {
  const confirmed = products.filter((p) => p.price != null).length
  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Pricing"
        description="Every product has a base price above zero; an optional sale price (not higher than the base price) is what customers pay. Any administrator can change prices; each change is recorded in the server log."
        badge={badge}
      />
      {!canEdit && (
        <Alert tone="info" title="Read-only">
          Prices can be viewed here but not changed.
        </Alert>
      )}
      <Card flush title="Unit prices" subtitle={`${confirmed} of ${products.length} products have a price`}>
        <DataTable
          caption="Unit prices"
          rows={products}
          loading={loading}
          searchPlaceholder="Search products…"
          filters={[
            { key: 'type', label: 'Types', options: [{ value: 'watch', label: 'Watches' }, { value: 'strap', label: 'Straps' }], match: (r, v) => String(r.type).toLowerCase() === v },
            { key: 'priced', label: 'Price states', options: [{ value: 'yes', label: 'Priced' }, { value: 'no', label: 'No price' }], match: (r, v) => (v === 'yes') === (r.price != null) },
          ]}
          columns={[
            { key: 'name', header: 'Product', sortable: true, render: (r) => <div><div className="va-cell-title">{r.name}</div><div className="va-cell-sub">{r.ref}</div></div> },
            { key: 'type', header: 'Type', sortable: true, render: (r) => capitalize(String(r.type ?? '').toLowerCase()) },
            { key: 'price', header: 'Price', sortable: true, align: 'right', sortValue: (r) => r.price ?? -1, render: (r) => formatPrice(r.price) },
            { key: 'state', header: 'State', render: (r) => (r.price != null ? <Badge tone="success" dot>Priced</Badge> : <Badge tone="warning" dot>{NO_PRICE_WARNING}</Badge>) },
          ]}
          rowActions={(r) =>
            canEdit && onEditPrice ? (
              <Button variant="ghost" size="sm" iconOnly icon={Pencil} aria-label={`Change price of ${r.name}`} onClick={() => onEditPrice(r)} />
            ) : (
              <span className="va-muted" title="Prices cannot be changed here"><Lock size={14} aria-label="Locked" /></span>
            )
          }
        />
      </Card>
    </>
  )
}
