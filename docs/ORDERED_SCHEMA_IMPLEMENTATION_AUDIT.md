# VALOUR — Ordered Schema Implementation Audit

**Date:** 2026-10-21 (local; database times are UTC). **Branch:** `migration/pre-cutover-v2`.
**Reference:** `Ordered_Ecommerce_CMS_Schema.md` (revision 2). **Scope:** read-only audit. Only this file was created.

> **Reference caveat.** The file currently in the repository is **revision 2**. It is the original schema rewritten with the 16 corrections you approved (SC-1 to SC-16, U2–U5), and its change log lists each one. The revision-1 text was never committed to git: the file was untracked until commit `a4973e3`. The original wording therefore survives only in that change log and in `docs/schema-corrections-proposal.md`. This audit measures against revision 2.

---

## A. Executive Summary

The **database layer** matches the reference closely and has been verified:
- All 25 approved tables exist in `valour_v2`.
- Every column name, type and NULL rule, and every foreign-key delete rule, matches revision 2 (comparison scripts, see H).
- The 24 CHECK constraints are present.
- Prisma's drift check between the live database and `prisma/schema.prisma` reports **no differences**.
- The admin security tables (Better Auth, MFA, RBAC, audit) were preserved, with their data intact.

The **application layer** is only partly built:
- Business rules and transactional services exist for **products, categories, brands, stock, coupons, checkout, orders and payments**, and they are covered by unit tests against a mocked transaction.
- They are **not wired** to any admin screen, API endpoint or storefront page, and they have **never run against the real database**.
- No admin CRUD screen exists for any of the 25 business tables.
- Admin pages for Watches, Straps and Pricing show **read-only** data from `src/data/catalog.js`. Orders, Inventory and Customers show **empty placeholders**.
- The storefront still runs entirely on `catalog.js` and a browser-stored cart. Checkout cannot place orders by design ("online payment coming soon").
- No seed data has been loaded: every business table is empty.

**In short:** the schema was implemented correctly. The e-commerce/CMS functionality the schema exists to support is mostly still to be built.

## B. Overall Completion Assessment

**Method:** each of the 25 tables is scored on 4 layers, worth 1 point each:
1. **Schema:** in the database, matches revision 2, verified.
2. **Domain logic:** server rules/services exist and are unit-tested.
3. **Admin:** admin UI/API wired to the database.
4. **Storefront:** storefront reads or writes it, where the table is customer-facing; otherwise this layer counts as N/A and is excluded from that table's total.

Partial = 0.5.

| Layer | Score | Notes |
|---|---|---|
| Schema | 25 / 25 | Verified (H-5, H-6, H-7) |
| Domain logic | 9 / 25 | Full: products, categories, brands, coupons, orders, order_items, payments. Partial (0.5 each): users (guest records only), customizer_options (validation only), carts/cart_items (option hashing only, no cart service) |
| Admin wiring | 0 / 25 | No admin screen or API reads or writes any of the 25 tables. The image route is wired, but there are no products to attach images to |
| Storefront wiring | 0 / 17 | Customer-facing tables (17): products, categories, brands, customizer_options, users, user_addresses, carts, cart_items, orders, order_items, payments, coupons, wishlists, product_reviews, newsletters, contact_inquiries, cms_pages. Not counted for storefront (8): roles, general_settings, tags, testimonials, blogs, blog_tag, cms_page_sections, cms_page_section_fields; these are surfaced through CMS pages |
| **Total** | **34 / 92 ≈ 37%** | |

Treat ~37% as an order of magnitude, not a precise figure: the layers aren't equal in effort, and admin/storefront work is the larger part. Separately, the **pre-existing work** is complete and verified, and it lies outside the 25 business tables:
- admin authentication with MFA
- role-based access control (RBAC)
- audit logging

## C. Requirement-by-Requirement Compliance Matrix

Status keys:
- **IV** = Implemented and verified
- **IN** = Implemented but not fully verified
- **PI** = Partially implemented
- **NI** = Not implemented
- **BL** = Blocked
- **NA** = Not applicable

### C.1 Global rules (`## Global rules`)

| Requirement | Current implementation | Files | Status | Evidence | Gaps |
|---|---|---|---|---|---|
| BIGINT UNSIGNED PKs | All 25 tables | `prisma/schema.prisma`, migration `20261022000000_approved_schema_v2` | IV | Column comparison doc vs SQL; drift check = 0 | — |
| DATETIME(3) UTC; created/updated defaults | Columns `DATETIME(3)`; `time_zone '+00:00'` per connection | `src/server/db-config.js` | IV (schema) / IN (runtime) | Column comparison; db-config unit tests | `updated_at` is set by Prisma `@updatedAt` and by the raw SQL in services; the raw SQL has not run on the real DB |
| FKs `ON UPDATE RESTRICT`; history never cascades | 24 FKs, all RESTRICT on update; delete rules per table | migration SQL | IV | Verifier "new foreign keys are ON UPDATE RESTRICT"; delete rules 24/24 match the doc | Better Auth tables keep `ON UPDATE CASCADE` (pre-existing, D1) |
| Soft delete keeps unique values reserved | `deleted_at` columns; services soft-delete products, categories and brands | `src/server/catalog-v2/services/*` | PI | Schema verified; service logic unit-tested | No admin UI; queries elsewhere don't filter `deleted_at` yet (none exist) |
| Publishing defaults hidden/draft/pending | Defaults in schema; seed creates drafts | schema, `seed-plan.js` | IV (schema) | Column defaults match | Publishing actions not built |
| Money DECIMAL(12,2), exact arithmetic | DECIMAL columns; integer-cent helpers | `src/server/commerce/money.js` | IV (schema) / IN (logic) | Unit tests (`tests/commerce/rules.test.mjs`) | Not exercised against real DB values |
| CHECK constraints in SQL | 24 named CHECKs, plus 10 automatic MariaDB `json_valid` checks | migration SQL | IV | Verifier "24 CHECK constraints present" | Not runtime-tested (no test database permitted) |

### C.2 Tables

| # | Table (doc section) | Current implementation | Relevant files | Status | Evidence | Missing work |
|---|---|---|---|---|---|---|
| 1 | `roles` (§1) website roles (U5) | Table + model `Role`, separate from `AdminRole` | schema | IV (schema) | Drift 0; RBAC check: `db.role` count 0 vs `db.adminRole` 5 | Seed `Customer` (seed-v2, not run) |
| 2 | `brands` (§2) | Table; create/update/status/soft-delete service | `catalog-v2/services/taxonomy.js` | PI | Schema verified; service not unit-tested against fake tx | Admin UI, service tests, storefront use |
| 3 | `cms_pages` (§3) | Table only | schema | PI | Schema verified | All CMS logic + admin + storefront |
| 4 | `general_settings` (§4) | Table only | schema | PI | Schema verified | Settings editor; `store_currency` seed; checkout reads currency from it |
| 5 | `newsletters` (§5) | Table only | schema | PI | Schema verified | Signup endpoint, consent capture, admin list |
| 6 | `contact_inquiries` (§6) | Table only | schema | PI | Schema verified | Contact form endpoint, admin inbox |
| 7 | `tags` (§7) | Table only | schema | PI | Schema verified | Blog tag management |
| 8 | `coupons` (§8) | Table; validation, discount, atomic consume/release | `commerce/coupon-rules.js`, `commerce/services/coupons.js` | PI | Unit tests (rules + mocked SQL guards) | Admin CRUD; checkout UI; real-DB test |
| 9 | `customizer_options` (§9, SC-8) | Table; option validation + hashing; seed plan (26 options) | `commerce/custom-options.js`, `catalog-v2/seed-plan.js` | PI | Unit tests; seed preview | Admin management; storefront customizer still reads `catalog.js`; seed not run |
| 10 | `categories` (§10) | Table; parent/loop/type/depth rules; CRUD service | `catalog-v2/category-rules.js`, `services/taxonomy.js` | PI | Rule unit tests | Admin tree UI; service tests; storefront filters |
| 11 | `users` (§11, SC-7) | Table; guest find-or-create (passwordless, never overwrites) | `commerce/services/checkout.js` | PI | Unit tests (fake tx) | Admin customer list/detail; no customer login (by decision) |
| 12 | `products` (§12) | Table; rules, create/update/price/status/stock/soft-delete services; seed plan (12 drafts) | `catalog-v2/product-rules.js`, `services/products.js`, `seed-plan.js` | PI | Rule + seed-plan unit tests | Admin CRUD UI; services untested against fake tx or real DB; storefront still on `catalog.js`; seed not run |
| 13 | `cms_page_sections` (§13) | Table only | schema | PI | Schema verified | CMS section editor |
| 14 | `testimonials` (§14) | Table only | schema | PI | Schema verified | Admin CRUD/publish; storefront display |
| 15 | `user_addresses` (§15) | Table only | schema | PI | Schema verified | Address book (requires customer login, out of phase) |
| 16 | `carts` (§16) | Table only | schema | PI | Schema verified | Server cart; storefront cart is browser-storage only |
| 17 | `orders` (§17) | Table; checkout transaction, status transitions, cancellation | `commerce/services/checkout.js`, `orders.js`, `order-state.js` | PI | Unit tests (rules + mocked transaction) | Checkout API + UI; admin orders (page is an empty placeholder); real-DB test |
| 18 | `blogs` (§18, SC-13) | Table only | schema | PI | Schema verified | Blog admin; storefront `/blog` is static |
| 19 | `cms_page_section_fields` (§19, SC-14) | Table only | schema | PI | Schema verified | CMS field editor |
| 20 | `blog_tag` (§20) | Table only | schema | PI | Schema verified | Tagging UI |
| 21 | `cart_items` (§21, SC-3) | Table; options hash logic | `commerce/custom-options.js` | PI | Unit tests | Server cart service |
| 22 | `order_items` (§22, SC-4) | Table; snapshot + guarded release logic | `commerce/services/stock.js`, `checkout.js` | PI | Unit tests (SQL guards asserted) | Real-DB test; admin returns UI |
| 23 | `payments` (§23, SC-6) | Table; manual confirmation, failed/pending, refunds | `commerce/services/payments.js` | PI | Unit tests | Admin payment actions; bank-transfer instructions (decision pending) |
| 24 | `wishlists` (§24) | Table only | schema | PI | Schema verified | Requires customer login (out of phase per doc) |
| 25 | `product_reviews` (§25, SC-15/16) | Table only | schema | PI | Schema verified | Moderation UI; requires customer login to submit |

### C.3 Business rules (doc "Transition rules" and "Naming and implementation notes")

| Requirement | Implementation | Status | Evidence | Gaps |
|---|---|---|---|---|
| Fulfilment transitions; ship only if paid or COD | `order-state.js` | IN | Unit tests | Not wired |
| Payment transitions; refunded only when fully refunded; independent states (U4) | `order-state.js`, `services/payments.js` | IN | Unit tests | Not wired |
| Stock deduct with guarded UPDATE; untracked never touched (SC-4) | `services/stock.js` | IN | Unit tests assert SQL text and parameters | Never executed on MariaDB |
| Partial release via `released_quantity` guard | `services/stock.js` | IN | Unit tests | Same |
| Lock order: order → coupon → products → items → payments | `services/orders.js`, `checkout.js` | IN | Unit test asserts call order | Same |
| Idempotent checkout token (SC-6) | `checkout-token.js`, `checkout.js` | IN | Unit tests (replay + race) | Same |
| Totals satisfy CHECKs | `order-totals.js` | IN | Unit tests | Same |
| Category loop/type/depth rules | `category-rules.js` | IN | Unit tests | Service query path untested |
| Products referenced by orders not hard-deleted | FK `ON DELETE RESTRICT` + soft delete | IV (FK) / IN (service) | Delete rules match doc | — |
| Images: secure uploads, validated type/size/dimensions, orphan clean-up | Existing validation pipeline + v2 gallery rules + v2 route | PI | Image-rule and gallery unit tests; route built | Upload not exercised end to end (no products exist); orphan script still on old model and fails safely |
| Custom watch combinations validated vs active options | `custom-options.js` | IN | Unit tests | Storefront not switched |
| No "Price on request" | Seed only includes confirmed prices; activation requires price | IN | Seed-plan tests | Storefront `catalog.js` still contains "Price on request" wording for the unpriced custom watch |

## D. Database Schema Comparison

- **Matching models (25/25):** every table in revision 2 has a model with the documented `@@map`. Column names, types, NULL rules and FK delete rules all match (scripted comparison; one parser false-positive, `INTEGER UNSIGNED` = `INT UNSIGNED`, was resolved by reading the SQL).
- **Missing models:** none relative to revision 2.
- **Additional models (11, approved as D1):** `admin_users`, `admin_sessions`, `admin_accounts`, `admin_verifications`, `admin_two_factors`, `admin_rate_limits`, `admin_roles`, `admin_permissions`, `admin_role_permissions`, `admin_user_roles`, `audit_logs`. Plus `_prisma_migrations`.
- **Renamed (SC-1, approved):** `roles` → `admin_roles`, `permissions` → `admin_permissions`, `role_permissions` → `admin_role_permissions`. Their constraint names are kept via `map:`. `admin_user_roles` was unchanged.
- **Mappings:** verified correct in both the active schema and the generated client (`AdminRole` → `admin_roles`, `AdminPermission` → `admin_permissions`, `AdminRolePermission` → `admin_role_permissions`, `AdminUserRole` → `admin_user_roles`, website `Role` → `roles`).
- **Intentional differences from revision 1:** the 16 approved corrections in the change log, e.g. `released_quantity` instead of `stock_restored_at`, nullable `users.password`, the `customizer_options` table, consent columns, `orders.currency`.
- **Not in the schema (requested in the audit prompt, absent by design):** variants (doc: "out of scope"), media library table (images stored as paths), navigation table. These are **NA** relative to revision 2.

## E. Implemented Features (with evidence)

| Feature | Evidence |
|---|---|
| V2 database structure | Verifier 13/13 PASS; drift 0; `migrate status` up to date (this audit) |
| Admin login (Better Auth, email + password, argon2id, lockout 5/15 min) | `src/server/auth/*`; auth unit tests pass; historical `auth.login.success` audit entries |
| MFA/TOTP enforced on admin pages | `guards.js:44,57` redirects to MFA setup when not enabled; `auth.js:189` twoFactor with encrypted backup codes; SUPER_ADMIN has MFA enabled (DB) |
| RBAC (5 roles, 17 permissions) | `getUserPermissions()` returned 17/17 for SUPER_ADMIN against the live DB (previous session, standalone); per-role counts match the matrix |
| Admin route protection | Signed-out `GET /admin/` → 307 `/admin/login` (this audit) |
| Audit logging | `audit.js` sanitiser/allowlist unit-tested; audit rows exist |
| Admin users list (read-only), roles view, audit log view | Pages query DB through permission guard |
| Storefront pages, cart (browser storage), customizer | HTTP 200 on `/`, `/our-shop/`, `/cart/`, `/customizer/` (this audit); storefront unit tests pass |
| Verified backups | `D:\backups\valour\valour_v2_20261021_1653_pre_cutover_final.sql`, SHA-256 `4BDD5FD9…C7E7` |

## F. Partially Implemented and Missing Features

| Feature | State |
|---|---|
| Product & strap CRUD | **Not implemented in the admin.** Services exist; `/admin/watches`, `/admin/straps` and `/admin/pricing` are **read-only views of `catalog.js`**; `/admin/products` is a redirect |
| Inventory | Placeholder: `/admin/inventory` renders an empty list |
| Orders / payments | Placeholder: `/admin/orders` renders an empty list; services unwired |
| Customers | Placeholder: `/admin/customers` |
| Dashboard | Shows "No orders yet" (`stats={null}`); no real metrics |
| Product images | V2 upload route wired; no product exists to attach to; no gallery UI on new tables |
| Categories, brands, coupons, customizer options, settings | Services/rules partly exist; no UI |
| CMS pages/sections/fields, blogs, tags, testimonials, reviews, newsletter, contact | Tables only; storefront `/blog` etc. are static pages |
| Storefront on DB | Not started: catalog, product pages, cart and customizer use `catalog.js`/browser storage |
| Checkout | Deliberately disabled (no order can be placed) |
| Customer accounts, wishlists, reviews submission | Out of phase per the doc (no customer login) |
| Seed data | Prepared and previewed, **not run**; all business tables empty |
| Admin RBAC for new modules | New permission keys proposed in `docs/admin-panel-plan.md`, not approved/seeded |

## G. Security and Authentication Assessment

**Verified**
- Authentication and session: Better Auth with an 8-hour session and hourly refresh (`auth.js:156-159`). Rate limiting is configured.
- MFA is required for every admin page through the guards. The SUPER_ADMIN account is active with MFA enabled, and its two-factor record is intact.
- RBAC: the mappings are fixed; `getUserPermissions` returns the correct set; only SUPER_ADMIN may manage SUPER_ADMIN; the last active SUPER_ADMIN is protected (unit-tested policy).
- Input validation: zod schemas for checkout, products, categories and brands (unit-tested). Uploads use magic-byte sniffing, size and dimension limits, a same-origin check, a permission check and private storage.
- Integrity: FK delete rules and CHECKs are present. The security data was preserved through the migration: 5/17/51, 1 admin, 1 two-factor record.

**Unresolved or unverified**
1. **The admin dashboard after the RBAC fix has not been seen working in a signed-in browser.** The server was restarted at 17:46 local, after client generation, and its log has 0 `role_permissions` errors. But the last admin sign-in (00:15Z) and newest session (00:19Z) both predate that restart. **Needs a manual sign-in test.**
2. The new services' raw SQL (`FOR UPDATE`, guarded UPDATEs) has only been tested against a mocked transaction. Integration tests are skipped because no test database is permitted.
3. Retired modules (`src/server/catalog/{actions,repository,image-actions,image-service}.js`, `scripts/db/seed-catalog.mjs`, `scripts/storage/cleanup-orphans.mjs`) still reference dropped models. Nothing that is served imports them. The orphan script throws before deleting anything.
4. The audit sanitiser drops any key ending in `code` or `token`, which over-redacts coupon codes.
5. The Better Auth user foreign keys keep `ON UPDATE CASCADE` (pre-existing; ids never change in practice).
6. A session row that expired on 2026-10-21 08:02Z is still stored. It's harmless, but there's no clean-up job.

## H. Automated Test and Build Results

| # | Command | Result | Label |
|---|---|---|---|
| H-1 | `npx prisma validate` | valid | Passed during this audit |
| H-2 | `npx prisma format --check` | formatted | Passed during this audit |
| H-3 | `npx prisma migrate status` | 4 migrations, up to date | Passed during this audit |
| H-4 | `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` | exit 0 (no difference) | Passed during this audit |
| H-5 | `node --conditions=react-server --env-file=.env.local scripts/db/verify-v2-schema.mjs 4` | 13/13 PASS | Passed during this audit |
| H-6 | Active schema vs approved draft (body diff); migration file vs draft SQL (`cmp`) | identical / identical | Passed during this audit |
| H-7 | Doc-vs-SQL column, type, NULL and FK-rule comparison scripts | 25/25 tables; 24/24 FK rules | Previously reported as passed, not rerun (inputs unchanged per H-6) |
| H-8 | `node --test tests/catalog.test.mjs tests/cart.test.mjs tests/checkout.test.mjs tests/admin/*.test.mjs` | 125/125 | Passed during this audit |
| H-9 | `node --conditions=react-server --test tests/db-config.test.mjs tests/auth/*.test.mjs tests/catalog-admin/*.test.mjs tests/integration/*.test.mjs tests/commerce/*.test.mjs tests/catalog-v2/*.test.mjs` | 138/138; integration suite **skipped** (`TEST_DATABASE_URL` not set) | Passed during this audit |
| H-10 | `npx eslint src/server src/app/admin src/app/api src/app/media src/admin scripts tests` | 0 problems | Passed during this audit |
| H-11 | `npx eslint src scripts tests` | 59 errors, 55 warnings, all in pre-existing storefront pages/components (mostly `react/no-unescaped-entities`) | Failed during this audit (pre-existing, out of scope) |
| H-12 | HTTP GET `/`, `/admin/login/`, `/our-shop/`, `/cart/`, `/customizer/` → 200; `/admin/` → 307 login | as listed | Passed during this audit (signed out only) |
| H-13 | `npm run build` | succeeded | Previously reported as passed, not rerun. **Caveat:** that build ran while the dev server was running, because a broken port check reported port 3000 free. Not rerun now, to avoid interfering with the running server |
| H-14 | TypeScript / type checking | n/a: project is JavaScript | Not run |
| H-15 | Signed-in admin browser test (login + TOTP + dashboard) | — | Not run (requires your credentials) |

## I. Data and Migration Safety

- **Applied migrations:** `foundation_rbac_audit`, `admin_auth`, `catalog_orders`, `approved_schema_v2`, all finished and none rolled back.
- **Data changes:** the 14 legacy tables dropped by the migration held **0 rows** (verified immediately before, and in the final backup's manifest).
- **Security data after the migration:** 1 admin, 1 two-factor record, 5/17/51 RBAC rows, 1 SUPER_ADMIN assignment (verified).
- **Later row changes come from normal use, not from the migration:** sessions 1 → 2 and audit entries 3 → 4, from your sign-in at 00:15Z (`auth.login.success`).
- **This audit:** made no writes. Only SELECT/information_schema queries and Prisma's read-only diff/status ran.
- **Backups:** `…_1541_pre_replacement`, `…_1643_pre_cutover_readiness` and `…_1653_pre_cutover_final` (each with `.sha256` + manifest). Restore has never been test-run (no second database).
- **Git:**
  - Commits `a4973e3` (pre-cutover checkpoint) and `ce0440d` (docs), not pushed.
  - **Uncommitted:** `prisma/schema.prisma` (modified), `src/app/api/admin/products/[id]/images/route.js` (modified), and the untracked `prisma/migrations/20261022000000_approved_schema_v2/` folder, which is applied to the database but not committed. Plus this report.
- **Line endings:** `.gitattributes` pins migration SQL to LF so Prisma checksums stay valid.

## J. Prioritized Remaining Work

**P0 — correctness / safety**
1. Sign in through the browser (password + TOTP) and confirm the dashboard, Admin users and Audit pages load on the restarted server.
2. Commit the applied migration folder, the active schema and the route switch. An applied migration that exists only in an untracked folder is a history risk.
3. Real-database verification of the commerce SQL: either approve a separate `valour_v2_test` database for the integration suite, or approve a rolled-back transaction test on the main database.

**P1 — core functionality**
4. Approve and run `seed-v2.mjs`: Customer role, `store_currency`, 26 customizer options, 12 draft products.
5. Approve the new permission keys (`docs/admin-panel-plan.md`).
6. Admin product and strap CRUD, images, pricing and inventory (plan phases 1–3); replace the read-only `catalog.js` admin views.
7. Categories and brands; customizer options admin.
8. Orders, payments and customers admin; bank-transfer instructions and the COD decision.

**P2 — remaining required functionality**
9. Storefront on the database (catalog, product pages, cart pricing, customizer options) with unchanged markup and URLs; then enable checkout (bank transfer).
10. Settings editor; coupons admin.
11. CMS pages/sections/fields, blog and tags, testimonials, review moderation, newsletter and contact inbox.

**P3 — improvements**
12. Remove the retired catalog modules and scripts; switch orphan clean-up to `referencedStorageKeys()`.
13. Fix the 59 storefront lint errors; narrow the audit sanitiser so coupon codes are kept.
14. Session clean-up job; restore drill on a disposable database if one is ever permitted.

**Order and dependencies:** 1 → 2 → 3 → 4/5 → 6 → 7 → 8 → 9 (storefront requires seeded products and the order services) → 10 → 11 → 12–14.

## K. Final Verdict

- **Was the original schema implemented correctly?** Yes, at the database level. Revision 2 (the original plus your approved corrections) is in place and verified with no drift. The admin RBAC tables are correctly separate from website roles.
- **Fully satisfied:**
  - all 25 table definitions, keys, indexes, delete rules and CHECKs
  - preservation of admin authentication, MFA, RBAC and audit
  - the global schema rules
- **Partially satisfied:** every business table's *functionality*.
  - Products, categories, brands, coupons, orders, order items, payments, stock and checkout have tested server logic but no UI and no real-database execution.
  - Images have a wired route but nothing to attach to.
- **Still missing:**
  - all admin CRUD for the 25 tables
  - CMS, blog, testimonials, reviews, newsletter, contact, settings and server cart
  - the storefront connection
  - order placement
  - seed data
- **Production-ready?** **No.** No product can be managed or ordered through the database. The post-fix admin session is unverified in a browser. The commerce SQL has never run against MariaDB.
- **What next:** complete P0 (browser sign-in check, commit, real-DB test approval), then seed (with approval), then build the admin modules in the planned order before connecting the storefront.
