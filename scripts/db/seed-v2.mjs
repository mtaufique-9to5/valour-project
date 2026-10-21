// Idempotent seed for the approved schema (rev. 2), run ONLY after the
// replacement migration and `prisma generate` on the new schema:
//   node --conditions=react-server --env-file=.env.local scripts/db/seed-v2.mjs
// Writes: website role Customer, setting store_currency, the 26 customizer
// options and the products with a confirmed price (as draft, untracked stock).
// Existing rows are never overwritten: rows already present are skipped and
// reported, so admin edits made after a first run are kept.
import * as catalog from '../../src/data/catalog.js'
import { db } from '../../src/server/db.js'
import { recordAudit } from '../../src/server/audit/audit.js'
import { buildSeedPlanV2 } from '../../src/server/catalog-v2/seed-plan.js'

async function assertTargetSchema() {
  const rows = await db.$queryRaw`
    SELECT TABLE_NAME AS t FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('admin_roles', 'customizer_options', 'general_settings', 'products')`
  const cols = await db.$queryRaw`
    SELECT COUNT(*) AS n FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME IN ('base_price', 'track_stock')`
  if (rows.length !== 4 || Number(cols[0].n) !== 2) {
    throw new Error('The approved schema is not in place (replacement migration not applied). Nothing was written.')
  }
}

async function main() {
  await assertTargetSchema()
  const plan = buildSeedPlanV2(catalog)
  const created = { roles: 0, settings: 0, customizerOptions: 0, products: 0 }
  const kept = { roles: 0, settings: 0, customizerOptions: 0, products: 0 }

  await db.$transaction(async (tx) => {
    for (const name of plan.roles) {
      if (await tx.role.findUnique({ where: { name } })) kept.roles++
      else { await tx.role.create({ data: { name } }); created.roles++ }
    }
    for (const s of plan.settings) {
      if (await tx.generalSetting.findUnique({ where: { key: s.key } })) kept.settings++
      else { await tx.generalSetting.create({ data: s }); created.settings++ }
    }
    for (const o of plan.customizerOptions) {
      const where = { part_optionKey: { part: o.part, optionKey: o.optionKey } }
      if (await tx.customizerOption.findUnique({ where })) kept.customizerOptions++
      else { await tx.customizerOption.create({ data: o }); created.customizerOptions++ }
    }
    for (const { legacyKey, ...p } of plan.products) {
      const existing = await tx.product.findFirst({ where: { OR: [{ sku: p.sku }, { slug: p.slug }] }, select: { sku: true, slug: true } })
      if (existing) {
        if (existing.sku !== p.sku || existing.slug !== p.slug) throw new Error(`SKU/slug clash for ${legacyKey}; resolve it in the admin first.`)
        kept.products++
      } else {
        await tx.product.create({ data: p })
        created.products++
      }
    }
    await recordAudit(tx, {
      actorType: 'CLI', actorLabel: 'seed-v2', action: 'catalog.seed',
      after: { products: created.products, customizerOptions: created.customizerOptions, roles: created.roles, settings: created.settings },
    })
  }, { timeout: 60_000 })

  console.log('Seed complete.', { created, kept, skipped: plan.skipped })
}

main()
  .catch((err) => {
    console.error('Seed failed:', err?.message ?? 'unknown error')
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
