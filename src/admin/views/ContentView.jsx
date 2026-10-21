'use client'

import { FileText, Pencil, Plus } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Card } from '../components/Card'
import DataTable from '../components/DataTable'
import Button from '../components/Button'
import { StatusPill } from '../components/Badge'
import EmptyState from '../components/EmptyState'
import { formatDate } from './format'

// entries = [{ id, title, type, status, updated, author }]; onCreate(); onEdit(entry).
export default function ContentView({ entries = [], loading = false, onCreate, onEdit, badge }) {
  const types = [...new Set(entries.map((e) => e.type))].map((t) => ({ value: t, label: t }))
  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Content"
        description="Pages, homepage sections and blog posts."
        badge={badge}
        actions={onCreate && <Button variant="primary" icon={Plus} onClick={onCreate}>New entry</Button>}
      />
      <Card flush>
        <DataTable
          caption="Content entries"
          rows={entries}
          loading={loading}
          searchPlaceholder="Search content…"
          filters={[
            ...(types.length > 1 ? [{ key: 'type', label: 'Types', options: types }] : []),
            { key: 'status', label: 'Statuses', options: ['Published', 'Draft', 'Scheduled'].map((s) => ({ value: s, label: s })) },
          ]}
          emptyState={<EmptyState icon={FileText} title="No content yet" description="Content managed here will appear on the storefront." />}
          columns={[
            { key: 'title', header: 'Title', sortable: true, render: (r) => <span className="va-cell-title">{r.title}</span> },
            { key: 'type', header: 'Type', sortable: true },
            { key: 'status', header: 'Status', sortable: true, render: (r) => <StatusPill status={r.status} /> },
            { key: 'updated', header: 'Updated', sortable: true, render: (r) => formatDate(r.updated) },
            { key: 'author', header: 'Last edited by', sortable: true, render: (r) => <span className="va-muted">{r.author}</span> },
          ]}
          rowActions={onEdit ? (r) => <Button variant="ghost" size="sm" iconOnly icon={Pencil} aria-label={`Edit ${r.title}`} onClick={() => onEdit(r)} /> : undefined}
        />
      </Card>
    </>
  )
}
