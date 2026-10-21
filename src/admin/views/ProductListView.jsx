'use client'

import { ExternalLink, Pencil } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Card } from '../components/Card'
import DataTable from '../components/DataTable'
import Button from '../components/Button'
import { StatusPill } from '../components/Badge'
import EmptyState from '../components/EmptyState'
import { capitalize, formatPrice } from './format'

// Shared list for WatchesView and StrapsView.
// products = [{ id, name, ref, subtitle, collection, movement, image, price|null, status, slug }]
export default function ProductListView({ kind, title, description, products = [], loading = false, onEdit, storefrontHref, badge, actions }) {
  const isWatch = kind === 'watch'
  const columns = [
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      searchValue: (r) => `${r.name} ${r.ref}`,
      render: (r) => (
        <div className="va-cell-product">
          {/* eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail */}
          <img className="va-thumb" src={r.image} alt="" width={44} height={44} loading="lazy" />
          <div>
            <div className="va-cell-title">{r.name}</div>
            <div className="va-cell-sub">{r.ref}</div>
          </div>
        </div>
      ),
    },
    ...(isWatch
      ? [
          { key: 'collection', header: 'Collection', sortable: true, render: (r) => capitalize(r.collection) || '—' },
          { key: 'movement', header: 'Movement', sortable: true, render: (r) => capitalize(r.movement) || '—' },
        ]
      : []),
    { key: 'price', header: 'Price', sortable: true, align: 'right', sortValue: (r) => r.price ?? -1, render: (r) => <span className={r.price == null ? 'va-muted' : undefined}>{formatPrice(r.price)}</span> },
    { key: 'status', header: 'Status', sortable: true, render: (r) => <StatusPill status={r.status} /> },
  ]

  const statuses = [...new Set(products.map((p) => p.status))].map((s) => ({ value: s, label: s }))
  const collections = [...new Set(products.map((p) => p.collection).filter(Boolean))].map((c) => ({ value: c, label: capitalize(c) }))

  return (
    <>
      <PageHeader eyebrow="Catalog" title={title} description={description} badge={badge} actions={actions} />
      <Card flush>
        <DataTable
          caption={title}
          columns={columns}
          rows={products}
          loading={loading}
          searchPlaceholder={`Search ${title.toLowerCase()}…`}
          filters={[
            ...(isWatch && collections.length > 1 ? [{ key: 'collection', label: 'Collections', options: collections }] : []),
            ...(statuses.length > 1 ? [{ key: 'status', label: 'Statuses', options: statuses }] : []),
          ]}
          emptyState={<EmptyState title={`No ${title.toLowerCase()} found`} />}
          rowActions={(r) => (
            <>
              {storefrontHref && (
                <a className="va-btn va-btn-ghost va-btn-sm va-btn-icon" href={storefrontHref(r)} target="_blank" rel="noreferrer" aria-label={`View ${r.name} on storefront (opens new tab)`}>
                  <ExternalLink size={16} aria-hidden="true" />
                </a>
              )}
              {onEdit && <Button variant="ghost" size="sm" iconOnly icon={Pencil} aria-label={`Edit ${r.name}`} onClick={() => onEdit(r)} />}
            </>
          )}
        />
      </Card>
    </>
  )
}
