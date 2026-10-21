// Create the first SUPER_ADMIN account. Refuses if one already exists.
// MFA (TOTP) enrollment is forced at first sign-in by the admin guards.
//
// Run (after the auth tables exist, `prisma generate`, and seed-rbac):
//   node --conditions=react-server --env-file=.env.local scripts/create-first-admin.mjs
import { randomBytes } from 'node:crypto'
import readline from 'node:readline'
import { z } from 'zod'

import { db } from '../src/server/db.js'
import { hashPassword } from '../src/server/auth/password.js'
import { recordAudit } from '../src/server/audit/audit.js'
import { adminRoleModel } from '../src/server/rbac/models.js'

const inputSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email().max(255)),
    name: z.string().trim().min(1).max(100),
    password: z.string().min(14, 'Password must be at least 14 characters').max(128),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'Passwords do not match', path: ['confirm'] })

// Better Auth ids are 32-character strings.
const newId = () => randomBytes(16).toString('hex')

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.startsWith(question)) rl.output.write(question)
        else if (s.includes('\n') || s.includes('\r')) rl.output.write('\n')
      }
    }
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

async function superAdminExists() {
  const count = await db.adminUserRole.count({ where: { role: { key: 'SUPER_ADMIN' } } })
  return count > 0
}

async function main() {
  if (await superAdminExists()) {
    console.error('A SUPER_ADMIN already exists. Refusing to create another.')
    process.exitCode = 1
    return
  }
  const role = await adminRoleModel(db).findUnique({ where: { key: 'SUPER_ADMIN' }, select: { id: true } })
  if (!role) {
    console.error('Role SUPER_ADMIN not found. Run scripts/db/seed-rbac.mjs first.')
    process.exitCode = 1
    return
  }

  const raw = {
    email: await ask('Email: '),
    name: await ask('Name: '),
    password: await ask('Password (min 14 chars): ', { hidden: true }),
    confirm: await ask('Confirm password: ', { hidden: true }),
  }
  const parsed = inputSchema.safeParse(raw)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) console.error(`- ${issue.path.join('.')}: ${issue.message}`)
    process.exitCode = 1
    return
  }
  const { email, name, password } = parsed.data
  const passwordHash = await hashPassword(password)
  const userId = newId()

  await db.$transaction(async (tx) => {
    // Re-check inside the transaction to avoid a race between two runs.
    const existing = await tx.adminUserRole.count({ where: { roleId: role.id } })
    if (existing > 0) throw new Error('A SUPER_ADMIN already exists')
    await tx.adminUser.create({
      data: { id: userId, email, name, emailVerified: true, status: 'ACTIVE', twoFactorEnabled: false },
    })
    await tx.adminAccount.create({
      data: { id: newId(), accountId: userId, providerId: 'credential', userId, password: passwordHash },
    })
    await tx.adminUserRole.create({ data: { userId, roleId: role.id, assignedBy: null } })
    await recordAudit(tx, {
      actorType: 'CLI',
      actorLabel: 'create-first-admin',
      action: 'admin_user.create',
      targetType: 'admin_user',
      targetId: userId,
      after: { id: userId, email, name, status: 'ACTIVE', roles: ['SUPER_ADMIN'] },
    })
  })
  console.log(`Created SUPER_ADMIN ${email}. Sign in at /admin/login; MFA setup is required on first sign-in.`)
}

main()
  .catch((err) => {
    console.error('Failed:', err?.message ?? 'unknown error')
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
