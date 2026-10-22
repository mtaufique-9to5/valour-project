'use client'

import { useState } from 'react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Ellipsis, RotateCcw, ShieldCheck, ShieldOff, UserCog, UserPlus } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Card } from '../components/Card'
import DataTable from '../components/DataTable'
import Button from '../components/Button'
import { Badge, StatusPill } from '../components/Badge'
import { ConfirmDialog, Modal } from '../components/Modal'
import { FormField, Input, Select } from '../components/FormField'
import { Alert } from '../components/Alert'

// users = [{ id, name, email, role, status, mfa, lastLogin }]; roles = [{ id, name }]
// onInvite({ name, email, roleId }); onSuspend(user); onReactivate(user); onResetMfa(user);
// onChangeRole(user, roleId); selfId hides self-actions. Missing callbacks hide the action.
export default function AdminUsersView({ users = [], roles = [], loading = false, onInvite, onSuspend, onReactivate, onResetMfa, onChangeRole, selfId, inviteError, badge }) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invite, setInvite] = useState({ name: '', email: '', roleId: roles[0]?.id ?? '' })
  const [confirm, setConfirm] = useState(null) // { kind: 'suspend' | 'mfa', user }
  const [roleChange, setRoleChange] = useState(null) // { user, roleId }

  const runConfirm = () => {
    if (confirm?.kind === 'suspend') onSuspend?.(confirm.user)
    if (confirm?.kind === 'mfa') onResetMfa?.(confirm.user)
    setConfirm(null)
  }

  const hasMenu = onSuspend || onResetMfa || onReactivate || onChangeRole

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Admin users"
        description="Staff who can sign in to this admin panel."
        badge={badge}
        actions={onInvite && <Button variant="primary" icon={UserPlus} onClick={() => setInviteOpen(true)}>Invite user</Button>}
      />
      <Card flush>
        <DataTable
          caption="Admin users"
          rows={users}
          loading={loading}
          searchPlaceholder="Search by name or email…"
          filters={[{ key: 'status', label: 'Statuses', options: ['Active', 'Invited', 'Suspended'].map((s) => ({ value: s, label: s })) }]}
          columns={[
            { key: 'name', header: 'User', sortable: true, searchValue: (r) => `${r.name} ${r.email}`, render: (r) => <div><div className="va-cell-title">{r.name}</div><div className="va-cell-sub">{r.email}</div></div> },
            { key: 'role', header: 'Role', sortable: true, render: (r) => <Badge tone="gold">{r.role}</Badge> },
            { key: 'status', header: 'Status', sortable: true, render: (r) => <StatusPill status={r.status} /> },
            { key: 'mfa', header: '2FA', sortable: true, sortValue: (r) => (r.mfa ? 1 : 0), render: (r) => (r.mfa ? <Badge tone="success">Enabled</Badge> : <Badge tone="warning">Not set up</Badge>) },
            { key: 'lastLogin', header: 'Last sign-in', sortable: true, render: (r) => r.lastLogin ?? <span className="va-muted">Never</span> },
          ]}
          rowActions={
            hasMenu
              ? (r) => (
                  <Menu>
                    <MenuButton className="va-btn va-btn-ghost va-btn-sm va-btn-icon" aria-label={`Actions for ${r.name}`}>
                      <Ellipsis size={16} aria-hidden="true" />
                    </MenuButton>
                    <MenuItems transition anchor={{ to: 'bottom end', gap: 4 }} className="va-admin va-portal va-menu">
                      {onChangeRole && r.id !== selfId && (
                        <MenuItem>
                          <button type="button" className="va-menu-item" onClick={() => setRoleChange({ user: r, roleId: r.roleId ?? '' })}>
                            <UserCog size={16} aria-hidden="true" /> Change role
                          </button>
                        </MenuItem>
                      )}
                      {onReactivate && r.status === 'Suspended' && (
                        <MenuItem>
                          <button type="button" className="va-menu-item" onClick={() => onReactivate(r)}>
                            <RotateCcw size={16} aria-hidden="true" /> Reactivate
                          </button>
                        </MenuItem>
                      )}
                      {onResetMfa && r.id !== selfId && (
                        <MenuItem>
                          <button type="button" className="va-menu-item" onClick={() => setConfirm({ kind: 'mfa', user: r })}>
                            <ShieldCheck size={16} aria-hidden="true" /> Reset 2FA
                          </button>
                        </MenuItem>
                      )}
                      {onSuspend && r.status !== 'Suspended' && r.id !== selfId && (
                        <MenuItem>
                          <button type="button" className="va-menu-item va-danger" onClick={() => setConfirm({ kind: 'suspend', user: r })}>
                            <ShieldOff size={16} aria-hidden="true" /> Suspend
                          </button>
                        </MenuItem>
                      )}
                    </MenuItems>
                  </Menu>
                )
              : undefined
          }
        />
      </Card>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite admin user"
        description="They will receive an email to set a password and set up two-factor authentication."
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="va-invite-form" disabled={!invite.email.includes('@') || !invite.roleId}>Send invite</Button>
          </>
        }
      >
        <form
          id="va-invite-form"
          className="va-stack"
          onSubmit={(e) => {
            e.preventDefault()
            onInvite?.({ ...invite, email: invite.email.trim(), name: invite.name.trim() })
            setInviteOpen(false)
          }}
        >
          {inviteError && <Alert tone="danger">{inviteError}</Alert>}
          <FormField label="Full name">
            <Input value={invite.name} onChange={(e) => setInvite((v) => ({ ...v, name: e.target.value }))} autoComplete="off" />
          </FormField>
          <FormField label="Email" required>
            <Input type="email" value={invite.email} onChange={(e) => setInvite((v) => ({ ...v, email: e.target.value }))} autoComplete="off" />
          </FormField>
          <FormField label="Role" required>
            <Select value={invite.roleId} onChange={(e) => setInvite((v) => ({ ...v, roleId: e.target.value }))} options={roles.map((r) => ({ value: r.id, label: r.name }))} />
          </FormField>
        </form>
      </Modal>

      <Modal
        open={Boolean(roleChange)}
        onClose={() => setRoleChange(null)}
        title={roleChange ? `Change role for ${roleChange.user.name}` : ''}
        description="Choosing a role without admin access removes their access to this panel."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRoleChange(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => { onChangeRole?.(roleChange.user, roleChange.roleId); setRoleChange(null) }} disabled={!roleChange?.roleId}>Save role</Button>
          </>
        }
      >
        {roleChange && (
          <FormField label="Role" required>
            <Select value={roleChange.roleId} onChange={(e) => setRoleChange((v) => ({ ...v, roleId: e.target.value }))} options={roles.map((x) => ({ value: x.id, label: x.name }))} />
          </FormField>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        title={confirm?.kind === 'suspend' ? `Suspend ${confirm?.user.name}?` : `Reset 2FA for ${confirm?.user.name}?`}
        message={
          confirm?.kind === 'suspend'
            ? 'They will be signed out everywhere and cannot sign in until reactivated.'
            : 'Their authenticator stops working. They must set up 2FA again at next sign-in.'
        }
        confirmLabel={confirm?.kind === 'suspend' ? 'Suspend user' : 'Reset 2FA'}
      />
    </>
  )
}
