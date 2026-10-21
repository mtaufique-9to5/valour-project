'use client'

import { Eye, ShoppingBag } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Card } from '../components/Card'
import DataTable from '../components/DataTable'
import Button from '../components/Button'
import { StatusPill } from '../components/Badge'
import EmptyState from '../components/EmptyState'
import { formatDate, formatPrice } from './format'

const STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']

// orders = [{ id, customer, email, date, status, payment, itemCount, total }]; onView(order).
export default function OrdersView({ orders = [], loading = false, onView, badge }) {
  return (
    <>
      <PageHeader eyebrow="Sales" title="Orders" description="Customer orders and their fulfilment status." badge={badge} />
      <Card flush>
        <DataTable
          caption="Orders"
          rows={orders}
          loading={loading}
          searchPlaceholder="Search by order or customer…"
          filters={[{ key: 'status', label: 'Statuses', options: STATUSES.map((s) => ({ value: s, label: s })) }]}
          emptyState={<EmptyState icon={ShoppingBag} title="No orders yet" description="Online payment is not live, so no orders have been placed." />}
          columns={[
            { key: 'id', header: 'Order', sortable: true, render: (r) => <span className="va-mono">{r.id}</span> },
            { key: 'customer', header: 'Customer', sortable: true, searchValue: (r) => `${r.customer} ${r.email}`, render: (r) => <div><div className="va-cell-title">{r.customer}</div><div className="va-cell-sub">{r.email}</div></div> },
            { key: 'date', header: 'Date', sortable: true, render: (r) => formatDate(r.date) },
            { key: 'status', header: 'Status', sortable: true, render: (r) => <StatusPill status={r.status} /> },
            { key: 'payment', header: 'Payment', sortable: true, render: (r) => <StatusPill status={r.payment} /> },
            { key: 'itemCount', header: 'Items', sortable: true, align: 'right' },
            { key: 'total', header: 'Total', sortable: true, align: 'right', render: (r) => formatPrice(r.total) },
          ]}
          rowActions={onView ? (r) => <Button variant="ghost" size="sm" iconOnly icon={Eye} aria-label={`View order ${r.id}`} onClick={() => onView(r)} /> : undefined}
        />
      </Card>
    </>
  )
}
