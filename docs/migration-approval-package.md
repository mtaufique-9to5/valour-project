# Replacement migration — approval package

Prepared 2026-10-21. Target: `valour_v2` on MariaDB 10.4.32 (XAMPP), user `valour_v2_app`.
Schema source: `Ordered_Ecommerce_CMS_Schema.md` revision 2. **Nothing below has been executed.**

## 1. Current database status (read-only check, 2026-10-21)

- Connection: OK. 26 tables, no views, triggers or routines.
- Migrations applied: `foundation_rbac_audit`, `admin_auth`, `catalog_orders` (all finished, none rolled back).
- Security data: 1 admin (active, MFA on), 1 SUPER_ADMIN assignment, 5 roles / 17 permissions / 51 links, 1 two-factor record, 1 account, 1 session, 3 rate-limit rows, 3 audit entries.
- Privileges of `valour_v2_app`: SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, REFERENCES, INDEX, ALTER on `valour_v2` only. Enough for the migration; restore needs root.
- No foreign key from a kept table points into a table being dropped. Rename targets `admin_*` are free. No name conflicts for the 25 new tables after rename + drop.

## 2. Admin RBAC table renames (SC-1) — rows untouched

```sql
RENAME TABLE roles TO admin_roles, permissions TO admin_permissions, role_permissions TO admin_role_permissions;
```
Existing constraint and index names are kept (pinned with `map:` in the Prisma schema).

## 3. Tables dropped — verified live row counts

| Table | Rows | | Table | Rows |
|---|---|---|---|---|
| order_items | 0 | | orders | 0 |
| inventory_adjustments | 0 | | customers | 0 |
| inventory | 0 | | products | 0 |
| price_changes | 0 | | collections | 0 |
| prices | 0 | | order_sequences | 0 |
| product_images | 0 | | customizer_options | 0 |
| product_contents | 0 | | admin_settings | 0 |

All 14 are from the `catalog_orders` migration and hold no data. Re-verify counts immediately before running.

## 4. Tables created (25, in dependency order)

roles, brands, cms_pages, general_settings, newsletters, contact_inquiries, tags, coupons, customizer_options, categories, users, products, cms_page_sections, testimonials, user_addresses, carts, orders, blogs, cms_page_section_fields, blog_tag, cart_items, order_items, payments, wishlists, product_reviews.

## 5. Execution / dependency order inside the SQL

1. RENAME (3 RBAC tables).
2. DROP the 14 empty tables, children first (order_items → inventory_adjustments → inventory → price_changes → prices → product_images → product_contents → orders → customers → products → collections → order_sequences → customizer_options → admin_settings).
3. CREATE the 25 tables (no foreign keys yet).
4. ADD the 24 foreign keys (all `ON UPDATE RESTRICT`).
5. ADD the 24 CHECK constraints.

## 6. Backup

| | |
|---|---|
| File | `D:\backups\valour\valour_v2_20261021_1541_pre_replacement.sql` (41,289 bytes) |
| SHA-256 | `7651ED80C7CC967D0D46477D1AC6E15D57DE193D52C7B33031E19CF3C7BE1D70` (also in `.sql.sha256`; confirmed again with `certutil`) |
| Manifest | `…_pre_replacement.manifest.json` (26 tables + row counts) |
| Checks | dump completed ✓ · CREATE for all 26 tables ✓ · INSERT rows = live counts for every table ✓ · counts unchanged during dump ✓ · checksum reproducible ✓ |

Sessions, rate-limit rows and audit entries change with normal use, so **take a fresh backup right before the migration**:
`node scripts/db/backup-verified.mjs pre_replacement_final`

Restore was not test-run: that would need a second database, which is not permitted.

## 7. SQL validation (static, `prisma/drafts/replacement-migration.sql`)

PASS: no DELETE/UPDATE/INSERT/TRUNCATE · rename is the first statement and covers exactly the 3 RBAC tables · exactly the 14 listed drops (no security table; `admin_settings` is the old empty settings table) · all drops before any CREATE · 25 CREATEs · CREATEs → FKs → CHECKs order · every FK `ON UPDATE RESTRICT` · utf8mb4_unicode_ci on every table. Engine is the server default (InnoDB, confirmed), as in the 3 existing migrations.
Draft Prisma schema: `prisma validate` and `prisma format --check` clean. Every model, table and column used by the new code exists in the draft.

## 8. Application cutover plan

Blast radius today: the storefront does not use the database (it reads `src/data/catalog.js`); the admin Watches, Straps and Pricing pages read the same static file. The **only live route using a dropped table** is `POST /api/admin/products/[id]/images` (`product_images`).

Run together, in one maintenance window (you stop and start the server):

1. Stop the Next.js server.
2. Fresh backup (section 6).
3. Copy `prisma/drafts/replacement-migration.sql` to `prisma/migrations/<timestamp>_approved_schema_v2/migration.sql`.
4. `npx prisma migrate deploy`.
5. Replace `prisma/schema.prisma` with `prisma/drafts/approved-schema.prisma`, then `npx prisma generate`.
6. Switch `src/app/api/admin/products/[id]/images/route.js` to the staged handler:
   ```js
   export const runtime = 'nodejs'
   export const dynamic = 'force-dynamic'
   export { POST } from '@/server/catalog-v2/routes/product-images'
   ```
7. Verify: `node --conditions=react-server --env-file=.env.local scripts/db/verify-v2-schema.mjs <audit count>` (read-only, must print "All checks passed"), then `npx prisma migrate status`.
8. Start the server; sign in (password + TOTP) and open Dashboard, Admin users, Audit log.
9. Separate approval: `node --conditions=react-server --env-file=.env.local scripts/db/seed-v2.mjs` (Customer role, `store_currency`, 26 customizer options, 12 confirmed-price products as **draft**).

Already compatible with both schemas (no change at cutover): permission checks, admin context, users page, `seed-rbac.mjs`, `create-first-admin.mjs` (via `src/server/rbac/models.js`).
Retired after verification (not deleted yet): `src/server/catalog/{repository,actions,image-actions,image-service}.js`, `scripts/db/seed-catalog.mjs`, `src/admin/pending-pages/*`. `scripts/storage/cleanup-orphans.mjs` must not be run until it is switched to `referencedStorageKeys()`.

## 9. Rollback

**Database** (needs root; stop the server first):
1. `certutil -hashfile <backup>.sql SHA256` must match the `.sha256` file.
2. As root: `DROP DATABASE valour_v2; CREATE DATABASE valour_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
   (the dump only recreates its own 26 tables, so the database must be empty first; the database-level grant for `valour_v2_app` is kept by MariaDB).
3. `C:\xampp\mysql\bin\mysql.exe -u root valour_v2 < <backup>.sql`
4. Check: 26 tables, 3 rows in `_prisma_migrations`, RBAC 5/17/51, admin sign-in with TOTP.

A failure part-way through the migration (MariaDB DDL is not transactional) is handled the same way: restore, then fix and retry.

**Code**: revert `prisma/schema.prisma` and the image route, run `npx prisma generate`, restart. The working copy is currently **uncommitted**; a commit (or tag) of the pre-cutover state, with your approval, makes this a single `git checkout`.

## 10. Remaining risks and blockers

- **Approvals needed**: (a) the migration itself (rename + 14 drops + creates); (b) a pre-cutover commit for code rollback; (c) stopping/starting the server; (d) running `seed-v2.mjs` afterwards.
- Admin product editing stays unavailable until the new admin catalog screens are built (no loss today: those screens are read-only from `catalog.js`).
- Restore is documented and the dump verified, but not test-restored (no second database allowed).
- Better Auth tables keep `ON UPDATE CASCADE` on their user foreign keys (existing, preserved under D1); the RESTRICT rule applies to the 25 approved tables.
- The audit sanitiser drops keys ending in `code`/`token`; coupon codes are therefore audited under other key names.
- Open design decision for the storefront phase: where presentation fields (accent colour, secondary images, specs, description fragments) live. The seed keeps them in `products.additional_info`.
