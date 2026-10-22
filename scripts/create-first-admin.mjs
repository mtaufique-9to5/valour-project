// Create the FIRST administrator for the watchwebsite database (Revision 3).
// Refuses to run once any admin role is configured, so it cannot be used to add
// more admins later (use the admin panel: Admin users -> Invite).
//
// In one transaction it: creates the admin role (name prompted, default
// "Administrator"), creates the `admin_role_ids` setting listing only that role,
// and creates the user with an argon2id password typed at the prompt (never
// stored elsewhere, never logged). MFA is enrolled at the first sign-in.
//
// Run (after approval):
//   node --conditions=react-server --env-file=.env.local scripts/create-first-admin.mjs
import { db } from '../src/server/db.js'
import { hashPassword, passwordProblems } from '../src/server/auth/password.js'
import { ADMIN_ROLE_SETTING, CUSTOMER_ROLE, serializeAdminRoleIds } from '../src/server/auth/admin-roles.js'
import { normalizeEmail } from '../src/server/auth/service.js'
import { ask, askNewPassword } from './admin/prompt.mjs'

async function main() {
  if (!process.stdin.isTTY) throw new Error('Run this in an interactive terminal.')
  if (await db.generalSetting.findUnique({ where: { key: ADMIN_ROLE_SETTING } })) {
    throw new Error('Admin access is already configured. Add administrators from the admin panel instead.')
  }

  const roleName = (await ask('Admin role name [Administrator]: ')).trim() || 'Administrator'
  if (roleName === CUSTOMER_ROLE) throw new Error('The Customer role cannot be an admin role.')
  const email = normalizeEmail(await ask('Admin email: '))
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email address.')
  const firstName = (await ask('First name: ')).trim()
  if (!firstName || firstName.length > 100) throw new Error('First name is required (up to 100 characters).')
  const lastName = (await ask('Last name (optional): ')).trim().slice(0, 100) || null
  const password = await askNewPassword(email, passwordProblems)
  const passwordHash = await hashPassword(password)

  await db.$transaction(async (tx) => {
    // Second check inside the transaction (the setting key is UNIQUE, so a
    // concurrent run fails on the insert below instead of creating two owners).
    if (await tx.generalSetting.findUnique({ where: { key: ADMIN_ROLE_SETTING } })) throw new Error('Admin access is already configured.')
    if (await tx.user.findUnique({ where: { email } })) throw new Error('This email already belongs to an account.')
    const role = await tx.role.findUnique({ where: { name: roleName } }) ?? await tx.role.create({ data: { name: roleName } })
    if (role.deletedAt) throw new Error('That role is deactivated.')
    await tx.generalSetting.create({ data: { key: ADMIN_ROLE_SETTING, type: 'json', value: serializeAdminRoleIds([String(role.id)]), isPublic: false } })
    await tx.user.create({ data: { email, firstName, lastName, password: passwordHash, roleId: role.id, status: true } })
  })
  console.log(`First administrator created for ${email} with role "${roleName}".`)
  console.log('Sign in at /admin/login; you will be asked to set up two-factor authentication.')
}

main()
  .catch((err) => {
    console.error('Setup failed:', err?.message ?? 'unknown error')
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
