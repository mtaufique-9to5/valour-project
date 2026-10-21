'use client'

import { Boxes, SlidersHorizontal } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Card, StatCard } from '../components/Card'
import DataTable from '../components/DataTable'
import Button from '../components/Button'
import { Badge, StatusPill } from '../components/Badge'
import EmptyState from '../components/EmptyState'
import { capitalize } from './format'

// A row is untracked when trackingMode is NOT_TRACKED, or (legacy rows) onHand is null.
export const isTracked = (r) => (r.trackingMode ? r.trackingMode === 'TRACKED' : Number.isInteger(r.onHand))
const stockState = (r) => (isTracked(r) ? r.status : 'Not tracked')
const num = (v, r) => (isTracked(r) && v != null ? v : <span className="va-muted">—</span>)

// items = [{ id, name, ref|sku, type, image, trackingMode?, onHand|null, reserved, available, reorderPoint, status }]
// onAdjust(item) opens a stock adjustment (parent-owned).
export default function InventoryView({ items = [], loading = false, onAdjust, badge }) {
  const tracked = items.filter(isTracked)
  const low = tracked.filter((i) => i.status === 'Low stock').length
  const out = tracked.filter((i) => i.status === 'Out of stock').length
  return (
    <>
      <PageHeader eyebrow="Catalog" title="Inventory" description="Stock on hand, reserved for open orders, and available to sell." badge={badge} />
      {items.length > 0 && (
        <div className="va-grid va-grid-stats">
          <StatCard label="Tracked products" value={tracked.length} icon={Boxes} />
          <StatCard label="Not tracked" value={items.length - tracked.length} />
          <StatCard label="Low stock" value={low} />
          <StatCard label="Out of stock" value={out} />
        </div>
      )}
      <Card flush>
        <DataTable
          caption="Inventory"
          rows={items}
          loading={loading}
          searchPlaceholder="Search inventory…"
          filters={[
            {
              key: 'status',
              label: 'Stock states',
              options: ['In stock', 'Low stock', 'Out of stock', 'Not tracked'].map((s) => ({ value: s, label: s })),
              match: (r, v) => stockState(r) === v,
            },
            { key: 'type', label: 'Types', options: [{ value: 'watch', label: 'Watches' }, { value: 'strap', label: 'Straps' }], match: (r, v) => String(r.type).toLowerCase() === v },
          ]}
          emptyState={<EmptyState icon={Boxes} title="No products yet" description="Products appear here once they exist in the catalog." />}
          columns={[
            { key: 'name', header: 'Product', sortable: true, searchValue: (r) => `${r.name} ${r.ref ?? ''} ${r.sku ?? ''}`, render: (r) => <div><div className="va-cell-title">{r.name}</div><div className="va-cell-sub">{r.sku ?? r.ref}</div></div> },
            { key: 'type', header: 'Type', sortable: true, render: (r) => capitalize(String(r.type ?? '').toLowerCase()) },
            { key: 'tracking', header: 'Tracking', sortable: true, sortValue: (r) => (isTracked(r) ? 0 : 1), render: (r) => (isTracked(r) ? <Badge tone="info">Tracked</Badge> : <Badge>Not tracked</Badge>) },
            { key: 'onHand', header: 'On hand', sortable: true, align: 'right', render: (r) => num(r.onHand, r) },
            { key: 'reserved', header: 'Reserved', sortable: true, align: 'right', render: (r) => num(r.reserved, r) },
            { key: 'available', header: 'Available', sortable: true, align: 'right', render: (r) => num(r.available, r) },
            { key: 'status', header: 'Status', sortable: true, sortValue: stockState, render: (r) => <StatusPill status={stockState(r)} /> },
          ]}
          rowActions={onAdjust ? (r) => <Button variant="ghost" size="sm" icon={SlidersHorizontal} onClick={() => onAdjust(r)} aria-label={`Adjust stock for ${r.name}`}>Adjust</Button> : undefined}
        />
      </Card>
    </>
  )
}
