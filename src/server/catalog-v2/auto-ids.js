// Server-generated slugs and product SKUs. Uniqueness is guaranteed by the
// existing unique indexes (products.sku / products.slug / categories.slug /
// brands.slug); this module only picks the next free candidate.
//
// Concurrency (MariaDB, REPEATABLE READ): a plain read cannot see another
// transaction's uncommitted row, and gap locks (FOR UPDATE) would only turn the
// race into deadlocks. So two parallel creates may pick the same candidate; the
// second INSERT then waits on the unique index and fails with a duplicate once
// the first commits. The service turns that into an `auto_conflict` error and
// the caller re-runs the whole transaction (withAutoRetry): nothing was written
// before the insert, and the new transaction's snapshot sees the winner's row.
import { CommerceError } from '../commerce/errors.js'

export const SKU_PREFIX = Object.freeze({ watch: 'VAL-W-', strap: 'VAL-S-' })

/** 'Home & Kitchen' -> 'home-kitchen' (max `max` chars, room left for a -N suffix). */
export function slugBase(name, max = 180, fallback = 'item') {
  const s = String(name ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, max - 6).replace(/-+$/, '')
  return s || fallback
}

/** First of base, base-2, base-3, ... not in `taken`. */
export function nextFreeSlug(base, taken) {
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`
}

/** Unique slug for `model` ('product' | 'category' | 'brand'); deleted rows keep theirs reserved. */
export async function generateSlug(tx, model, name, { max = 180, fallback = model } = {}) {
  const base = slugBase(name, max, fallback)
  const rows = await tx[model].findMany({ where: { OR: [{ slug: base }, { slug: { startsWith: `${base}-` } }] }, select: { slug: true } })
  return nextFreeSlug(base, new Set(rows.map((r) => r.slug)))
}

/** 'watch', 7 -> 'VAL-W-0007' */
export function formatSku(type, n) {
  const prefix = SKU_PREFIX[type]
  if (!prefix) throw new CommerceError('invalid_type', 'SKUs are generated for watches and straps only.')
  return `${prefix}${String(n).padStart(4, '0')}`
}

/** Next SKU of the type's own sequence (highest existing number + 1, deleted products included). */
export async function nextSku(tx, type) {
  const prefix = formatSku(type, 0).slice(0, -4)
  const [row] = await tx.$queryRaw`
    SELECT COALESCE(MAX(CAST(SUBSTRING(sku, ${prefix.length + 1}) AS UNSIGNED)), 0) AS n
    FROM products WHERE sku REGEXP ${`^${prefix}[0-9]+$`}`
  return formatSku(type, Number(row?.n ?? 0) + 1)
}

/** Which unique column a Prisma P2002 error names ('sku', 'slug', 'name') or null. */
export function duplicateField(e) {
  if (e?.code !== 'P2002') return null
  const meta = JSON.stringify(e.meta ?? {})
  return ['sku', 'slug', 'name'].find((f) => meta.includes(f)) ?? null
}

export const autoConflict = () => new CommerceError('auto_conflict', 'Another entry was saved at the same moment. Please try again.')

/**
 * Re-runs `attempt()` (one whole transaction) after an auto-id collision or
 * deadlock. Each round at least one of the colliding creates commits, so
 * `tries` parallel creates always finish; a short random pause spreads them out.
 */
export async function withAutoRetry(attempt, tries = 10) {
  for (let i = 1; ; i++) {
    try {
      return await attempt()
    } catch (e) {
      const retry = e?.code === 'auto_conflict' || e?.code === 'P2034'
      if (!retry || i >= tries) throw e
      await new Promise((resolve) => setTimeout(resolve, 5 + Math.random() * 20 * i))
    }
  }
}
