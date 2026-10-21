// Run: node --test --conditions=react-server "tests/auth/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkAdminUserChange, ADMIN_USER_ACTIONS as A } from '../../src/server/admin/admin-user-policy.js'

const MANAGE = ['admin_user.view', 'admin_user.manage']
const superActor = { permissions: MANAGE, roles: ['SUPER_ADMIN'] }
const adminActor = { permissions: MANAGE, roles: ['ADMIN'] }
const superTarget = { roles: ['SUPER_ADMIN'], status: 'ACTIVE' }
const plainTarget = { roles: ['VIEWER'], status: 'ACTIVE' }

test('actor without admin_user.manage is refused', () => {
  const r = checkAdminUserChange({ actor: { permissions: ['admin_user.view'], roles: ['VIEWER'] }, target: plainTarget, action: A.SUSPEND, activeSuperAdminCount: 2 })
  assert.deepEqual(r, { ok: false, reason: 'forbidden' })
})

test('ADMIN can manage non-super accounts', () => {
  for (const action of [A.UPDATE, A.SUSPEND, A.RESET_MFA, A.DELETE]) {
    assert.equal(checkAdminUserChange({ actor: adminActor, target: plainTarget, action, activeSuperAdminCount: 1 }).ok, true)
  }
  assert.equal(checkAdminUserChange({ actor: adminActor, target: plainTarget, action: A.SET_ROLES, newRoles: ['PRODUCT_MANAGER'], activeSuperAdminCount: 1 }).ok, true)
})

test('ADMIN cannot touch a SUPER_ADMIN in any way', () => {
  for (const action of Object.values(A)) {
    const r = checkAdminUserChange({ actor: adminActor, target: superTarget, action, newRoles: ['SUPER_ADMIN'], activeSuperAdminCount: 3 })
    assert.deepEqual(r, { ok: false, reason: 'super_admin_only' }, action)
  }
})

test('ADMIN cannot grant SUPER_ADMIN', () => {
  const r = checkAdminUserChange({ actor: adminActor, target: plainTarget, action: A.SET_ROLES, newRoles: ['SUPER_ADMIN'], activeSuperAdminCount: 1 })
  assert.deepEqual(r, { ok: false, reason: 'super_admin_only' })
})

test('SUPER_ADMIN can manage another SUPER_ADMIN when not the last one', () => {
  for (const action of [A.SUSPEND, A.DELETE, A.RESET_MFA, A.UPDATE]) {
    assert.equal(checkAdminUserChange({ actor: superActor, target: superTarget, action, activeSuperAdminCount: 2 }).ok, true)
  }
  assert.equal(checkAdminUserChange({ actor: superActor, target: superTarget, action: A.SET_ROLES, newRoles: ['ADMIN'], activeSuperAdminCount: 2 }).ok, true)
})

test('last active SUPER_ADMIN cannot be suspended, deleted or demoted', () => {
  for (const [action, newRoles] of [[A.SUSPEND], [A.DELETE], [A.SET_ROLES, ['ADMIN']], [A.SET_ROLES, []]]) {
    const r = checkAdminUserChange({ actor: superActor, target: superTarget, action, newRoles, activeSuperAdminCount: 1 })
    assert.deepEqual(r, { ok: false, reason: 'last_super_admin' }, action)
  }
})

test('last SUPER_ADMIN can still be updated or have MFA reset by a SUPER_ADMIN', () => {
  assert.equal(checkAdminUserChange({ actor: superActor, target: superTarget, action: A.UPDATE, activeSuperAdminCount: 1 }).ok, true)
  assert.equal(checkAdminUserChange({ actor: superActor, target: superTarget, action: A.RESET_MFA, activeSuperAdminCount: 1 }).ok, true)
  assert.equal(checkAdminUserChange({ actor: superActor, target: superTarget, action: A.SET_ROLES, newRoles: ['SUPER_ADMIN', 'VIEWER'], activeSuperAdminCount: 1 }).ok, true)
})

test('unknown action is refused', () => {
  assert.deepEqual(checkAdminUserChange({ actor: superActor, target: plainTarget, action: 'wipe', activeSuperAdminCount: 2 }), { ok: false, reason: 'unknown_action' })
})
