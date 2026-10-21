import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import { db } from '@/server/db'
import AuditLogView from '@/admin/views/AuditLogView'

const resultOf = (action) => (/failure|lockout/.test(action) ? 'Failed' : /denied/.test(action) ? 'Denied' : 'Success')

// Latest 200 entries. Snapshots (before/after) are not sent to the browser here.
export default async function AdminAuditPage() {
  await requirePagePermission(PERMISSIONS.AUDIT_VIEW)
  const entries = await db.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true, createdAt: true, actorType: true, actorLabel: true, action: true, targetType: true, targetId: true, ipAddress: true },
  })
  const rows = entries.map((e) => ({
    id: e.id,
    at: e.createdAt.toISOString().replace('T', ' ').slice(0, 19),
    actor: e.actorLabel || e.actorType,
    action: e.action,
    target: e.targetType ? `${e.targetType}${e.targetId ? ' ' + e.targetId : ''}` : '—',
    ip: e.ipAddress || '—',
    result: resultOf(e.action),
  }))
  return <AuditLogView entries={rows} />
}
