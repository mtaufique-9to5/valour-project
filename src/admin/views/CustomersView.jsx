'use client'

import { Users } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Card } from '../components/Card'
import DataTable from '../components/DataTable'
import { StatusPill } from '../components/Badge'
import EmptyState from '../components/EmptyState'
import { formatDate, formatPrice } from './format'

// customers = [{ id, name, email, orders, spent, lastOrder, status }]
export default function CustomersView({ customers = [], loading = false, badge }) {
  return (
    <>
      <PageHeader eyebrow="Sales" title="Customers" description="People who have placed orders." badge={badge} />
      <Card flush>
        <DataTable
          caption="Customers"
          rows={customers}
          loading={loading}
          searchPlaceholder="Search by name or email…"
          emptyState={<EmptyState icon={Users} title="No customers yet" description="Customers appear after their first order. Online payment is not live." />}
          columns={[
            { key: 'name', header: 'Customer', sortable: true, searchValue: (r) => `${r.name} ${r.email}`, render: (r) => <div><div className="va-cell-title">{r.name}</div><div className="va-cell-sub">{r.email}</div></div> },
            { key: 'orders', header: 'Orders', sortable: true, align: 'right' },
            { key: 'spent', header: 'Total spent', sortable: true, align: 'right', render: (r) => formatPrice(r.spent) },
            { key: 'lastOrder', header: 'Last order', sortable: true, render: (r) => formatDate(r.lastOrder) },
            { key: 'status', header: 'Status', render: (r) => <StatusPill status={r.status} /> },
          ]}
        />
      </Card>
    </>
  )
}
