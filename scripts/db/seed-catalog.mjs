// Idempotent catalog import from src/data/catalog.js (plan: SEED-PLAN.md).
// Creates (never overwrites admin edits) products, STATIC images (only when the
// product has none), USD prices (from CONFIRMED_PRICES only; a product without a
// confirmed price is imported as DRAFT with amount NULL) and inventory rows
// (NOT_TRACKED, quantity NULL - no stock is invented); upserts collections,
// content and customizer options. ONE transaction, one CLI audit entry, then a
// parity check against catalog.js (exit code 1 on mismatch).
//
// Run ONLY after the catalog migration is approved and applied, and
// `prisma generate` has run:
//   node --conditions=react-server --env-file=.env.local scripts/db/seed-catalog.mjs
// Preview counts without touching the database (imports nothing DB-related):
//   node scripts/db/seed-catalog.mjs --dry-run
import * as catalog from '../../src/data/catalog.js'
import { buildCatalogPlan, checkParity } from '../../src/server/catalog/seed-plan.js'

const plan = buildCatalogPlan(catalog)

if (process.argv.includes('--dry-run')) {
  console.log('Catalog seed dry run (no database connection).')
  console.table(plan.counts)
  process.exit(0)
}

const { db } = await import('../../src/server/db.js')
const { recordAudit } = await import('../../src/server/audit/audit.js')

const json = (v) => JSON.stringify(v)

async function seed() {
  await db.$transaction(
    async (tx) => {
      const collectionIds = new Map()
      for (const col of plan.collections) {
        const row = await tx.collection.upsert({
          where: { slug: col.slug },
          create: col,
          update: { name: col.name, position: col.position },
          select: { id: true },
        })
        collectionIds.set(col.slug, row.id)
      }

      for (const item of plan.products) {
        const data = { ...item.data, collectionId: item.collectionSlug ? collectionIds.get(item.collectionSlug) : null }
        const product = await tx.product.upsert({
          where: { slug: data.slug },
          create: data,
          update: {}, // existing products belong to the admin now
          select: { id: true },
        })
        const productId = product.id

        await tx.productContent.upsert({
          where: { productId },
          create: { productId, data: json(item.content) },
          update: { data: json(item.content) },
        })

        // Images: create only when the product has none (admin changes are kept).
        const imageCount = await tx.productImage.count({ where: { productId } })
        if (imageCount === 0) {
          for (const img of item.images) await tx.productImage.create({ data: { productId, ...img } })
        }

        // Price: create only; an existing price is left to the admin (history in price_changes).
        const existingPrice = await tx.price.findUnique({
          where: { productId_currency: { productId, currency: item.price.currency } },
          select: { id: true },
        })
        if (!existingPrice) {
          await tx.price.create({ data: { productId, ...item.price } })
          await tx.priceChange.create({
            data: {
              productId, currency: item.price.currency,
              oldAmountMinor: null, newAmountMinor: item.price.amountMinor,
              oldConfirmed: null, newConfirmed: item.price.confirmed,
              reason: 'initial import',
            },
          })
        }

        // Inventory: create untracked row only if missing; never invent or overwrite stock.
        await tx.inventory.upsert({
          where: { productId },
          create: { productId, ...item.inventory },
          update: {},
        })
      }

      for (const opt of plan.customizerOptions) {
        await tx.customizerOption.upsert({
          where: { part_optionId: { part: opt.part, optionId: opt.optionId } },
          create: opt,
          update: { name: opt.name, imageUrl: opt.imageUrl, position: opt.position, isDefault: opt.isDefault },
        })
      }

      await recordAudit(tx, {
        actorType: 'CLI',
        actorLabel: 'seed-catalog',
        action: 'catalog.seed',
        targetType: 'catalog',
        after: plan.counts,
      })
    },
    { timeout: 60_000 },
  )
}

async function parity() {
  const [products, customizerOptions] = await Promise.all([
    db.product.findMany({
      select: {
        type: true, legacyId: true, slug: true, ref: true, name: true, status: true,
        prices: { select: { currency: true, amountMinor: true, confirmed: true } },
        inventory: { select: { trackingMode: true, quantityOnHand: true } },
      },
    }),
    db.customizerOption.findMany({ select: { part: true, optionId: true } }),
  ])
  return checkParity(catalog, { products, customizerOptions })
}

try {
  await seed()
  const errors = await parity()
  if (errors.length > 0) {
    console.error(`Catalog parity check FAILED (${errors.length}):`)
    for (const e of errors) console.error(`  - ${e}`)
    process.exitCode = 1
  } else {
    console.log('Catalog seed complete; parity check passed.')
    console.table(plan.counts)
  }
} catch (err) {
  console.error('Catalog seed failed:', err?.message ?? 'unknown error')
  process.exitCode = 1
} finally {
  await db.$disconnect()
}
