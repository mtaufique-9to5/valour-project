'use client'

import { ScrollText } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Card } from '../components/Card'
import DataTable from '../components/DataTable'
import { StatusPill } from '../components/Badge'
import EmptyState from '../components/EmptyState'

// entries = [{ id, at, actor, action, target, ip, result: 'Success' | 'Failed' | 'Denied' }]
export default function AuditLogView({ entries = [], loading = false, badge }) {
  const actions = [...new Set(entries.map((e) => e.action))].sort().map((a) => ({ value: a, label: a }))
  return (
    <>
      <PageHeader eyebrow="Administration" title="Audit log" description="Security-relevant actions taken in the admin panel. Entries cannot be edited." badge={badge} />
      <Card flush>
        <DataTable
          caption="Audit log"
          rows={entries}
          loading={loading}
          pageSize={15}
          searchPlaceholder="Search actor, action or target…"
          filters={[
            ...(actions.length ? [{ key: 'action', label: 'Actions', options: actions }] : []),
            { key: 'result', label: 'Results', options: ['Success', 'Failed', 'Denied'].map((s) => ({ value: s, label: s })) },
          ]}
          emptyState={<EmptyState icon={ScrollText} title="No audit entries" />}
          columns={[
            { key: 'at', header: 'Time (UTC)', sortable: true, render: (r) => <span className="va-mono">{r.at}</span> },
            { key: 'actor', header: 'Actor', sortable: true },
            { key: 'action', header: 'Action', sortable: true, render: (r) => <span className="va-mono">{r.action}</span> },
            { key: 'target', header: 'Target', render: (r) => <span className="va-muted">{r.target}</span> },
            { key: 'ip', header: 'IP', render: (r) => <span className="va-mono va-muted">{r.ip}</span> },
            { key: 'result', header: 'Result', sortable: true, render: (r) => <StatusPill status={r.result} tone={r.result === 'Denied' ? 'warning' : undefined} /> },
          ]}
        />
      </Card>
    </>
  )
}
