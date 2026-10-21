'use client'

import { Archive, ExternalLink, Eye, Package, Pencil, Plus } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Card } from '../components/Card'
import DataTable from '../components/DataTable'
import Button from '../components/Button'
import { Badge, StatusPill } from '../components/Badge'
import EmptyState from '../components/EmptyState'
import { NO_PRICE_WARNING, PRODUCT_STATUS_OPTIONS, STATUS_LABEL, formatDollars, normalizeStatus, normalizeType } from '../client/catalog/format'

const STATUS_TONE = { ACTIVE: 'success', DRAFT: 'warning', ARCHIVED: 'neutral' }

/** Server list row -> display row (tolerates admin-row and getProduct shapes). */
export function normalizeProductRow(r, categories = []) {
  const images = r.images ?? []
  const primary = images.find((i) => i.isPrimary) ?? images.find((i) => i.role === 'MAIN') ?? images[0]
  const category = r.categoryName ?? (typeof r.category === 'string' ? r.category : r.category?.name) ?? categories.find((c) => String(c.id) === String(r.categoryId))?.name ?? null
  return {
    ...r,
    type: normalizeType(r.typeCode ?? r.type),
    status: normalizeStatus(r.statusCode ?? r.status),
    sku: r.sku ?? r.ref ?? null,
    image: r.image ?? primary?.url ?? null,
    category,
    price: Number.isFinite(r.price) ? r.price : Number.isInteger(r.amountMinor) ? r.amountMinor / 100 : null,
    tracked: r.trackingMode ? r.trackingMode === 'TRACKED' : Number.isInteger(r.quantity),
  }
}

/**
 * Server-paginated product list. Filters live in the URL (see ProductsClient).
 * rows: current page; total/page/pageSize from listProducts. query: { q, type, status, category }.
 * categories: [{ id, name }]. Callbacks: onSearch(q), onFilterChange(key, value), onPageChange(page),
 * onNew, onEdit(row), onArchive(row), storefrontHref(row) -> url.
 */
export default function ProductsView({
  rows = [],
  total = 0,
  page = 1,
  pageSize = 20,
  query = {},
  categories = [],
  canCreate = false,
  canEdit = false,
  loading = false,
  updating = false,
  onSearch,
  onFilterChange,
  onPageChange,
  onNew,
  onEdit,
  onArchive,
  storefrontHref,
  badge,
}) {
  const list = rows.map((r) => normalizeProductRow(r, categories))
  const title = query.type === 'WATCH' ? 'Watches' : query.type === 'STRAP' ? 'Straps' : 'Products'
  const filtering = Boolean(query.q || query.status || query.category)

  const columns = [
    {
      key: 'name',
      header: 'Product',
      render: (r) => (
        <div className="va-cell-product">
          {r.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
            <img className="va-thumb" src={r.image} alt="" width={44} height={44} loading="lazy" />
          ) : (
            <span className="va-thumb" aria-hidden="true" />
          )}
          <div>
            <div className="va-cell-title">{r.name}</div>
            <div className="va-cell-sub va-mono">{r.sku ?? '—'}</div>
          </div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (r) => (r.type === 'STRAP' ? 'Strap' : 'Watch') },
    { key: 'category', header: 'Category', render: (r) => r.category ?? <span className="va-muted">—</span> },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      render: (r) => (r.price != null ? formatDollars(r.price) : <Badge tone="warning" dot>{NO_PRICE_WARNING}</Badge>),
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'right',
      render: (r) => (r.tracked ? (Number.isInteger(r.quantity) ? r.quantity : '—') : <span className="va-muted">Not tracked</span>),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusPill status={STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} /> },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title={title}
        description="Search, filter and manage watches and straps."
        badge={badge}
        actions={canCreate && onNew && <Button variant="primary" icon={Plus} onClick={onNew}>New product</Button>}
      />
      <Card flush>
        <DataTable
          manual
          caption={title}
          columns={columns}
          rows={list}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={onPageChange}
          search={query.q ?? ''}
          onSearch={onSearch}
          searchPlaceholder="Search name or SKU…"
          loading={loading}
          filterValues={{ type: query.type ?? '', status: query.status ?? '', category: query.category ?? '' }}
          onFilterChange={onFilterChange}
          filters={[
            { key: 'type', label: 'Types', options: [{ value: 'WATCH', label: 'Watches' }, { value: 'STRAP', label: 'Straps' }] },
            { key: 'status', label: 'Statuses', options: PRODUCT_STATUS_OPTIONS },
            ...(categories.length ? [{ key: 'category', label: 'Categories', options: categories.map((c) => ({ value: String(c.id), label: c.name })) }] : []),
          ]}
          toolbarExtra={updating ? <span className="va-hint" role="status">Updating…</span> : null}
          emptyState={
            <EmptyState
              icon={Package}
              title={filtering ? 'No matching products' : `No ${title.toLowerCase()} yet`}
              description={filtering ? 'Try a different search or clear the filters.' : canCreate ? 'Create a product to get started.' : undefined}
              action={!filtering && canCreate && onNew ? <Button variant="primary" icon={Plus} onClick={onNew}>New product</Button> : undefined}
            />
          }
          rowActions={(r) => (
            <>
              {onEdit && (
                <Button variant="ghost" size="sm" iconOnly icon={canEdit ? Pencil : Eye} aria-label={`${canEdit ? 'Edit' : 'View'} ${r.name}`} onClick={() => onEdit(r)} />
              )}
              {storefrontHref && r.status === 'ACTIVE' && r.slug && (
                <a className="va-btn va-btn-ghost va-btn-sm va-btn-icon" href={storefrontHref(r)} target="_blank" rel="noreferrer" aria-label={`View ${r.name} on storefront (opens new tab)`}>
                  <ExternalLink size={16} aria-hidden="true" />
                </a>
              )}
              {canEdit && onArchive && r.status !== 'ARCHIVED' && (
                <Button variant="ghost" size="sm" iconOnly icon={Archive} aria-label={`Archive ${r.name}`} onClick={() => onArchive(r)} />
              )}
            </>
          )}
        />
      </Card>
    </>
  )
}
