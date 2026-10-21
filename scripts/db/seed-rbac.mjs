// Idempotent RBAC seed: upserts every permission and role from
// src/server/rbac/{permissions,roles}.js and makes each role's permission set
// match the matrix exactly. Does not touch user-role assignments.
//
// Run (only after the auth tables exist and `prisma generate` has run):
//   node --conditions=react-server --env-file=.env.local scripts/db/seed-rbac.mjs
import { db } from '../../src/server/db.js'
import { ALL_PERMISSION_KEYS, PERMISSION_DESCRIPTIONS } from '../../src/server/rbac/permissions.js'
import { ROLE_DEFINITIONS } from '../../src/server/rbac/roles.js'
import { recordAudit } from '../../src/server/audit/audit.js'
import { adminRoleModel, adminPermissionModel, adminRolePermissionModel } from '../../src/server/rbac/models.js'

async function main() {
  await db.$transaction(async (tx) => {
    const permIds = new Map()
    for (const key of ALL_PERMISSION_KEYS) {
      const p = await adminPermissionModel(tx).upsert({
        where: { key },
        create: { key, description: PERMISSION_DESCRIPTIONS[key] },
        update: { description: PERMISSION_DESCRIPTIONS[key] },
        select: { id: true },
      })
      permIds.set(key, p.id)
    }

    for (const [key, def] of Object.entries(ROLE_DEFINITIONS)) {
      const role = await adminRoleModel(tx).upsert({
        where: { key },
        create: { key, name: def.name, description: def.description },
        update: { name: def.name, description: def.description },
        select: { id: true },
      })
      const wanted = def.permissions.map((k) => permIds.get(k))
      await adminRolePermissionModel(tx).deleteMany({
        where: { roleId: role.id, permissionId: { notIn: wanted } },
      })
      await adminRolePermissionModel(tx).createMany({
        data: wanted.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      })
    }

    await recordAudit(tx, {
      actorType: 'CLI',
      actorLabel: 'seed-rbac',
      action: 'rbac.seed',
      after: { roles: Object.keys(ROLE_DEFINITIONS), permissions: ALL_PERMISSION_KEYS.length },
    })
  })
  console.log('RBAC seed complete.')
}

main()
  .catch((err) => {
    console.error('RBAC seed failed:', err?.message ?? 'unknown error')
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
