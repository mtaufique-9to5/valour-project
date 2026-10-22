'use client'

import { useState } from 'react'
import RolesManagerView from '@/admin/views/RolesManagerView'
import {
  createRoleAction, renameRoleAction, setRoleAdminAccessAction, deactivateRoleAction, reactivateRoleAction,
} from '@/app/admin/(panel)/access-actions'

export default function RolesClient({ roles, ownRoleId }) {
  const [feedback, setFeedback] = useState({})
  const wrap = (fn, success) => async (...args) => {
    const result = await fn(...args)
    setFeedback(result.ok ? { message: success } : { error: result.error })
    return result
  }
  return (
    <RolesManagerView
      roles={roles}
      ownRoleId={ownRoleId}
      message={feedback.message}
      error={feedback.error}
      onCreate={wrap(createRoleAction, 'Role created without admin access.')}
      onRename={wrap(renameRoleAction, 'Role renamed.')}
      onSetAdminAccess={(id, on) => wrap(setRoleAdminAccessAction, on ? 'Admin access granted.' : 'Admin access removed.')(id, on)}
      onDeactivate={wrap(deactivateRoleAction, 'Role deactivated.')}
      onReactivate={wrap(reactivateRoleAction, 'Role reactivated (without admin access).')}
    />
  )
}
