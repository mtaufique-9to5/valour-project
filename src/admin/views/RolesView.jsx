import { Check, Minus } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Card } from '../components/Card'
import EmptyState from '../components/EmptyState'

// Read-only role x permission matrix.
// roles = [{ id, name, description, permissions: string[] }]
// permissions = [{ key, group, label }]
export default function RolesView({ roles = [], permissions = [], badge }) {
  const groups = [...new Set(permissions.map((p) => p.group))]
  return (
    <>
      <PageHeader eyebrow="Administration" title="Roles & permissions" description="What each role can do. Changes are made by an owner and are audit-logged." badge={badge} />
      <Card flush title="Permission matrix" subtitle="Read-only">
        {roles.length === 0 ? (
          <EmptyState title="No roles defined" />
        ) : (
          <div className="va-table-scroll">
            <table className="va-table va-matrix">
              <caption className="va-sr-only">Permissions granted to each role</caption>
              <thead>
                <tr>
                  <th scope="col">Permission</th>
                  {roles.map((r) => <th key={r.id} scope="col" title={r.description}>{r.name}</th>)}
                </tr>
              </thead>
              {groups.map((g) => (
                <tbody key={g}>
                  <tr>
                    <th scope="colgroup" colSpan={roles.length + 1} style={{ color: 'var(--va-gold)', background: 'var(--va-surface-2)' }}>{g}</th>
                  </tr>
                  {permissions.filter((p) => p.group === g).map((p) => (
                    <tr key={p.key}>
                      <th scope="row" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 14, color: 'var(--va-text)', fontWeight: 400 }}>
                        {p.label}
                        <div className="va-cell-sub va-mono">{p.key}</div>
                      </th>
                      {roles.map((r) => {
                        const has = r.permissions.includes(p.key)
                        return (
                          <td key={r.id}>
                            {has ? <Check size={16} className="va-matrix-yes" aria-label="Granted" /> : <Minus size={16} className="va-matrix-no" aria-label="Not granted" />}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
