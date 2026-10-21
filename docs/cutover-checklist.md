# Cutover execution checklist — approved schema rev. 2

Use together with `docs/migration-approval-package.md`. Every step runs only after your explicit authorization of the cutover. **Stop at the first FAIL** and go to Rollback.

## Readiness (done 2026-10-21, read-only)

| Check | Result |
|---|---|
| 14 legacy tables | all 0 rows (re-counted) |
| Security data | 1 admin (active, MFA), 1 SUPER_ADMIN, roles/permissions/links 5/17/51, 1 two-factor, 1 account, 1 session, 3 audit entries |
| Migration history | 3 applied, all finished; on-disk checksums MATCH the database; new folder sorts after `20261020140000_catalog_orders` |
| SQL vs schema doc rev. 2 | 25/25 tables; every column, type and NULL rule matches; 24/24 FK delete rules match; 24 CHECKs |
| RBAC renames | 6 indexes + 3 FKs keep their names (pinned in the draft schema); InnoDB repoints `admin_user_roles_role_id_fkey` automatically |
| Scope | SQL touches only `valour_v2` (no USE, cross-database names, grants or data statements) |
| Backup | `D:\backups\valour\valour_v2_20261021_1643_pre_cutover_readiness.sql`, SHA-256 `FB04F30FA997651FFC212E34A280E688FECFED43770C6BEC018D745CE5FFA341`, 5/5 checks |
| Code checkpoint | branch `migration/pre-cutover-v2`, commit `a4973e3` (not pushed) |
| Server | Next.js dev server, port 3000, PID 6664; MariaDB port 3306, PID 7632 |
| Line endings | `.gitattributes` pins migration SQL to LF so Prisma checksums never change |

## Execution (requires your authorization)

| # | Who | Step | Pass condition |
|---|---|---|---|
| 1 | You | Stop the Next.js server (Ctrl+C in its terminal; PID 6664) | port 3000 free |
| 2 | Claude | Re-count the 14 tables and security data (read-only) | unchanged from readiness |
| 3 | Claude | `node scripts/db/backup-verified.mjs pre_cutover_final` | 5/5 checks; note the SHA-256 |
| 4 | Claude | Create `prisma/migrations/20261022000000_approved_schema_v2/migration.sql` = copy of `prisma/drafts/replacement-migration.sql` | byte-identical (sha256 compare) |
| 5 | You | `npx prisma migrate deploy` | "1 migration applied" |
| 6 | Claude | Replace `prisma/schema.prisma` with `prisma/drafts/approved-schema.prisma` (keeping the live generator/datasource blocks); `npx prisma generate` | client generated |
| 7 | Claude | Switch `src/app/api/admin/products/[id]/images/route.js` to the staged handler | file matches the package |
| 8 | Claude | `node --conditions=react-server --env-file=.env.local scripts/db/verify-v2-schema.mjs 3` | "All checks passed" |
| 9 | Claude | `npx prisma migrate status` and `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` (read-only) | up to date; no difference |
| 10 | Claude | Full unit test suite | all pass |
| 11 | You | `npm run dev` (from `D:\gitprojts\valour-project`) | server on port 3000 |
| 12 | You | Sign in to `/admin` (password + TOTP); open Dashboard, Admin users, Audit log, Watches; open the storefront home, shop, a product, cart, customizer | all load; storefront unchanged |
| 13 | Claude | Report results, commit the cutover on `migration/pre-cutover-v2` (with your approval) | — |

Seeding (`scripts/db/seed-v2.mjs`, preview in `docs/seed-v2-preview.md`) is a **separate** authorization after step 13.

## Rollback

Database (root required; server stopped):
1. `certutil -hashfile D:\backups\valour\valour_v2_<stamp>_pre_cutover_final.sql SHA256` equals the `.sha256` file.
2. `C:\xampp\mysql\bin\mysql.exe -u root -e "DROP DATABASE valour_v2; CREATE DATABASE valour_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"`
3. `C:\xampp\mysql\bin\mysql.exe -u root valour_v2 < D:\backups\valour\valour_v2_<stamp>_pre_cutover_final.sql`
4. Re-run the readiness counts: 26 tables, 3 migrations, RBAC 5/17/51.

Code: `git restore --source=a4973e3 -- prisma/schema.prisma "src/app/api/admin/products/[id]/images/route.js"`, delete the new `prisma/migrations/20261022000000_approved_schema_v2/` folder, `npx prisma generate`, then `npm run dev`. Sign in to confirm.

The database-level grant for `valour_v2_app` survives DROP/CREATE DATABASE. A failure part-way through step 5 leaves a "failed" row in `_prisma_migrations`; the full restore above removes it.
