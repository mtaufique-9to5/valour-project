import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import PageHeader from '@/admin/components/PageHeader'
import { Card } from '@/admin/components/Card'
import EmptyState from '@/admin/components/EmptyState'

// Revision 3 has no audit table (owner decision): admin actions are written as
// sanitised "[audit]" lines to the server log instead of the database.
export default async function AdminAuditPage() {
  await requirePagePermission(PERMISSIONS.AUDIT_VIEW)
  return (
    <>
      <PageHeader eyebrow="Administration" title="Audit log" description="History of administrative changes." />
      <Card>
        <EmptyState
          title="Not stored in the database"
          description="The approved schema has no audit table, so admin actions are recorded as [audit] lines in the server log rather than shown here."
        />
      </Card>
    </>
  )
}
