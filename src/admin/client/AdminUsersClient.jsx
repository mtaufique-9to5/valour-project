'use client'

import { useState } from 'react'
import AdminUsersView from '@/admin/views/AdminUsersView'
import { Alert } from '@/admin/components/Alert'
import {
  inviteAdminAction, changeUserRoleAction, setUserActiveAction, resetUserMfaAction,
} from '@/app/admin/(panel)/access-actions'

export default function AdminUsersClient({ users, roles, selfId }) {
  const [feedback, setFeedback] = useState({})
  const show = (result, success) => setFeedback(result.ok ? { message: success } : { error: result.error })
  return (
    <>
      {feedback.message && <Alert tone="success">{feedback.message}</Alert>}
      {feedback.error && <Alert tone="danger">{feedback.error}</Alert>}
      <AdminUsersView
        users={users}
        roles={roles}
        selfId={selfId}
        onInvite={async (v) => {
          const r = await inviteAdminAction(v)
          show(r, r.emailSent ? 'Invitation created and a set-password email was sent.' : 'Invitation created, but the email could not be sent (check the SMTP settings). They can use "Forgot password?" once email works.')
        }}
        onChangeRole={async (u, roleId) => show(await changeUserRoleAction(u.id, roleId), 'Role changed.')}
        onSuspend={async (u) => show(await setUserActiveAction(u.id, false), `${u.name} was suspended and signed out.`)}
        onReactivate={async (u) => show(await setUserActiveAction(u.id, true), `${u.name} was reactivated.`)}
        onResetMfa={async (u) => show(await resetUserMfaAction(u.id), `Two-factor authentication was reset for ${u.name}.`)}
      />
    </>
  )
}
