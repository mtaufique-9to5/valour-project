'use client'

import { useState } from 'react'
import { Pencil, Plus, Power, RotateCcw } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Card } from '../components/Card'
import DataTable from '../components/DataTable'
import Button from '../components/Button'
import { Badge, StatusPill } from '../components/Badge'
import { ConfirmDialog, Modal } from '../components/Modal'
import { FormField, Input, Toggle } from '../components/FormField'
import { Alert } from '../components/Alert'

// roles = [{ id, name, active, users, adminAccess, builtIn }]; ownRoleId = signed-in admin's role.
// Callbacks return a Promise resolving to { ok, error }. Every rule is enforced
// again on the server; the UI only hides actions that would be refused.
export default function RolesManagerView({ roles = [], ownRoleId, onCreate, onRename, onSetAdminAccess, onDeactivate, onReactivate, message, error }) {
  const [edit, setEdit] = useState(null) // { id?, name }
  const [confirm, setConfirm] = useState(null) // { kind: 'revoke' | 'deactivate', role }
  const [busy, setBusy] = useState(false)

  const run = async (fn) => {
    setBusy(true)
    try { await fn() } finally { setBusy(false) }
  }

  const save = () => run(async () => {
    const result = edit.id ? await onRename(edit.id, edit.name) : await onCreate(edit.name)
    if (result?.ok) setEdit(null)
    else setEdit((v) => ({ ...v, error: result?.error || 'Could not save the role.' }))
  })

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Roles"
        description="Create roles and decide explicitly which ones may use this admin panel. New roles never get admin access automatically."
        actions={<Button variant="primary" icon={Plus} onClick={() => setEdit({ name: '' })}>New role</Button>}
      />
      {message && <Alert tone="success">{message}</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}
      <Card flush>
        <DataTable
          caption="Roles"
          rows={roles}
          searchPlaceholder="Search roles…"
          columns={[
            { key: 'name', header: 'Role', sortable: true, render: (r) => <div><div className="va-cell-title">{r.name}</div>{r.builtIn && <div className="va-cell-sub">Built in · guest customers</div>}</div> },
            { key: 'users', header: 'Users', sortable: true },
            {
              key: 'adminAccess', header: 'Admin access', sortValue: (r) => (r.adminAccess ? 1 : 0),
              render: (r) => (
                <Toggle
                  label={r.adminAccess ? 'Allowed' : 'No access'}
                  checked={r.adminAccess}
                  disabled={busy || r.builtIn || !r.active || (r.adminAccess && r.id === ownRoleId)}
                  onChange={(next) => (next ? run(() => onSetAdminAccess(r.id, true)) : setConfirm({ kind: 'revoke', role: r }))}
                />
              ),
            },
            { key: 'active', header: 'Status', sortValue: (r) => (r.active ? 1 : 0), render: (r) => <StatusPill status={r.active ? 'Active' : 'Inactive'} /> },
          ]}
          rowActions={(r) => (
            <div className="va-row">
              {!r.builtIn && <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setEdit({ id: r.id, name: r.name })} aria-label={`Rename ${r.name}`}>Rename</Button>}
              {!r.builtIn && r.active && r.id !== ownRoleId && (
                <Button variant="ghost" size="sm" icon={Power} onClick={() => setConfirm({ kind: 'deactivate', role: r })} disabled={r.users > 0} title={r.users > 0 ? 'Move its users to another role first' : undefined}>Deactivate</Button>
              )}
              {!r.active && <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => run(() => onReactivate(r.id))}>Reactivate</Button>}
              {r.adminAccess && <Badge tone="gold">Admin</Badge>}
            </div>
          )}
        />
      </Card>

      <Modal
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Rename role' : 'New role'}
        description={edit?.id ? undefined : 'The role starts without admin access. Grant it explicitly afterwards.'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={busy} disabled={!edit?.name?.trim()}>Save</Button>
          </>
        }
      >
        {edit && (
          <form className="va-stack" onSubmit={(e) => { e.preventDefault(); save() }}>
            {edit.error && <Alert tone="danger">{edit.error}</Alert>}
            <FormField label="Role name" required>
              <Input value={edit.name} maxLength={100} onChange={(e) => setEdit((v) => ({ ...v, name: e.target.value }))} autoComplete="off" />
            </FormField>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          const c = confirm
          setConfirm(null)
          run(() => (c.kind === 'revoke' ? onSetAdminAccess(c.role.id, false) : onDeactivate(c.role.id)))
        }}
        title={confirm?.kind === 'revoke' ? `Remove admin access from ${confirm?.role.name}?` : `Deactivate ${confirm?.role.name}?`}
        message={confirm?.kind === 'revoke'
          ? 'Everyone with this role is signed out of the admin panel immediately and cannot sign in again.'
          : 'The role can no longer be assigned. You can reactivate it later (without admin access).'}
        confirmLabel={confirm?.kind === 'revoke' ? 'Remove access' : 'Deactivate'}
      />
    </>
  )
}
