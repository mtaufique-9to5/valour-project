// LEVEL-2 READ-ONLY structure check, run after the replacement migration.
// SELECT / information_schema only; never prints credentials or row contents.
//   node --conditions=react-server --env-file=.env.local scripts/db/verify-v2-schema.mjs [expected-audit-min]
// Expected constraint names are read from prisma/drafts/replacement-migration.sql,
// so the check always matches the SQL that was applied.
import { readFileSync } from 'node:fs'
import { createConnection } from 'mariadb'
import { parseDatabaseUrl } from '../../src/server/db-config.js'

const sql = readFileSync(new URL('../../prisma/drafts/replacement-migration.sql', import.meta.url), 'utf8')
const EXPECTED_CHECKS = [...sql.matchAll(/ADD CONSTRAINT `(\w+_chk)`/g)].map((m) => m[1]).sort()
const EXPECTED_FKS = [...sql.matchAll(/ADD CONSTRAINT `(\w+_fkey)` FOREIGN KEY/g)].map((m) => m[1])
const NEW_TABLES = ['roles', 'brands', 'cms_pages', 'general_settings', 'newsletters', 'contact_inquiries', 'tags', 'coupons', 'customizer_options', 'categories', 'users', 'products', 'cms_page_sections', 'testimonials', 'user_addresses', 'carts', 'orders', 'blogs', 'cms_page_section_fields', 'blog_tag', 'cart_items', 'order_items', 'payments', 'wishlists', 'product_reviews']
const SECURITY = ['admin_roles', 'admin_permissions', 'admin_role_permissions', 'admin_users', 'admin_user_roles', 'admin_sessions', 'admin_accounts', 'admin_verifications', 'admin_two_factors', 'admin_rate_limits', 'audit_logs', '_prisma_migrations']
const DROPPED = ['inventory_adjustments', 'inventory', 'price_changes', 'prices', 'product_images', 'product_contents', 'customers', 'collections', 'order_sequences', 'admin_settings', 'permissions', 'role_permissions']

let failures = 0
const check = (label, ok, detail = '') => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail && !ok ? `\n     ${detail}` : ''}`) }

const conn = await createConnection({ ...parseDatabaseUrl(process.env.DATABASE_URL), bigIntAsNumber: true })
try {
  const q = (s, p) => conn.query(s, p)
  const tables = (await q('SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()')).map((r) => r.t)
  const has = (t) => tables.includes(t)
  check(`37 tables (found ${tables.length})`, tables.length === NEW_TABLES.length + SECURITY.length)
  check('all 25 approved tables exist', NEW_TABLES.every(has), NEW_TABLES.filter((t) => !has(t)).join(', '))
  check('all security tables exist (renamed RBAC tables included)', SECURITY.every(has), SECURITY.filter((t) => !has(t)).join(', '))
  check('old tables are gone', !DROPPED.some(has), DROPPED.filter(has).join(', '))

  const checks = (await q("SELECT CONSTRAINT_NAME AS n FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_TYPE = 'CHECK'")).map((r) => r.n).sort()
  check(`${EXPECTED_CHECKS.length} CHECK constraints present`, EXPECTED_CHECKS.every((n) => checks.includes(n)), EXPECTED_CHECKS.filter((n) => !checks.includes(n)).join(', '))

  const fks = (await q('SELECT CONSTRAINT_NAME AS n, UPDATE_RULE AS u FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE()'))
  check(`${EXPECTED_FKS.length} new foreign keys present`, EXPECTED_FKS.every((n) => fks.some((f) => f.n === n)), EXPECTED_FKS.filter((n) => !fks.some((f) => f.n === n)).join(', '))
  // Approved tables use ON UPDATE RESTRICT; the preserved Better Auth tables keep their existing rules (D1).
  const newFks = fks.filter((f) => EXPECTED_FKS.includes(f.n))
  check('new foreign keys are ON UPDATE RESTRICT', newFks.every((f) => f.u === 'RESTRICT'), newFks.filter((f) => f.u !== 'RESTRICT').map((f) => f.n).join(', '))

  const engines = await q("SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND (ENGINE <> 'InnoDB' OR (TABLE_NAME <> '_prisma_migrations' AND TABLE_COLLATION <> 'utf8mb4_unicode_ci'))")
  check('InnoDB + utf8mb4_unicode_ci everywhere', engines.length === 0, engines.map((r) => r.t).join(', '))

  // Security data preserved (D1): counts only.
  if (!SECURITY.every(has)) throw new Error('security tables missing; stopping before data checks')
  const [rbac] = await q('SELECT (SELECT COUNT(*) FROM admin_roles) r, (SELECT COUNT(*) FROM admin_permissions) p, (SELECT COUNT(*) FROM admin_role_permissions) rp')
  check('RBAC preserved: 5 roles / 17 permissions / 51 links', rbac.r === 5 && rbac.p === 17 && rbac.rp === 51, `found ${rbac.r}/${rbac.p}/${rbac.rp}`)
  const [sa] = await q("SELECT COUNT(*) n, SUM(u.status = 'ACTIVE' AND u.two_factor_enabled = 1) mfa FROM admin_user_roles ur JOIN admin_roles r ON r.id = ur.role_id JOIN admin_users u ON u.id = ur.user_id WHERE r.`key` = 'SUPER_ADMIN'")
  check('SUPER_ADMIN still assigned, active, MFA enabled', sa.n >= 1 && Number(sa.mfa) >= 1)
  const [tf] = await q('SELECT COUNT(*) n FROM admin_two_factors')
  check('two-factor records preserved', tf.n >= 1)
  const minAudit = Number(process.argv[2] ?? 0)
  const [al] = await q('SELECT COUNT(*) n FROM audit_logs')
  check(`audit log preserved (>= ${minAudit})`, al.n >= minAudit, `found ${al.n}`)

  const empty = []
  for (const t of NEW_TABLES) { const [{ n }] = await q(`SELECT COUNT(*) n FROM \`${t}\``); if (n !== 0) empty.push(`${t}=${n}`) }
  check('new tables start empty (before seed-v2)', empty.length === 0, empty.join(', '))
} catch (e) {
  check('verification completed', false, e.message)
} finally {
  await conn.end()
}
console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed.')
process.exitCode = failures ? 1 : 0
