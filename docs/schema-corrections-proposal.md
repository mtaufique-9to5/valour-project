# VALOUR — Consolidated Schema Correction Proposal

**2026-10-21: all corrections approved by the owner and written into `Ordered_Ecommerce_CMS_Schema.md` (revision 2).
This file is kept as the record of the reasoning.** Database migration still requires separate approval.

Original status: **PROPOSAL — not applied.** `Ordered_Ecommerce_CMS_Schema.md`, `prisma/schema.prisma` and the
`valour_v2` database are unchanged. Every item marked *needs approval* waits for an explicit decision.

Baseline: `Ordered_Ecommerce_CMS_Schema.md` (24 tables). Target: MariaDB 10.4.32, Prisma 7.10.1
(`prisma-client-js`, `@prisma/adapter-mariadb`), Next.js 16.2.6, InnoDB, `utf8mb4_unicode_ci`,
strict SQL mode and UTC set per connection (`src/server/db-config.js`).

---

## 1. Decision status

Revision 2 (2026-10-21) — records the owner's decisions of 2026-10-21 and the final definitions requested.
Revision 3 (2026-10-21) — SC-7, SC-8, U2 (bank transfer; COD optional), U3 (levels 1–2 only) and U5 decided;
SC-4 `stock_restored_at` replaced by `released_quantity`; U4 rewritten with independent fulfilment and payment states.

| ID | Subject | Status |
|---|---|---|
| D1 | Keep Better Auth, MFA, admin sessions/accounts, RBAC, SUPER_ADMIN protection, audit logs | **Approved** |
| SC-1 | Rename admin RBAC tables to `admin_roles`, `admin_permissions`, `admin_role_permissions`; create approved `roles` | **Approved for planning** — rename needs separate migration approval (§3.1) |
| SC-2 | `TIMESTAMP` → `DATETIME(3)` UTC with explicit defaults | **Approved** |
| SC-3 | Custom watch in `products.type`, `cart_items.options/options_hash`, `order_items.options` | **Approved for documentation** (§3.2) |
| SC-4 | Tracked / untracked stock | **Approved in principle** — final rules §3.3 *awaiting final approval* |
| SC-5 | 24-table specification (+ `customizer_options` from SC-8) | **Pending** — final specification §5 *awaiting approval* |
| SC-6 | Checkout idempotency, coupon snapshot/usage, payment uniqueness | **Approved in principle** — final rules §3.4 *awaiting final approval* |
| SC-7 | Option B — passwordless guest customer records | **Approved** (business decision) — exact columns §3.5 in the final schema approval |
| SC-8 | Database-managed customizer options | **Approved** (business decision) — exact table §3.6 in the final schema approval |
| SC-9 | Newsletter consent | **Approved** |
| SC-10 | Order currency — must be configurable, not fixed USD | **Approved** — definition revised §3.7 |
| SC-11 | CMS page status | **Approved** |
| SC-12 | Public/private settings, enforced on the server | **Approved** — enforcement §3.7 |
| SC-13 | Blog author = admin user | **Approved subject to verification** — verified §3.7 |
| SC-14 | Unique CMS section fields | **Approved** |
| SC-15 | Rating range | **Approved** |
| SC-16 | Review per purchase | **Approved in principle** — final rules §3.8 *awaiting final approval* |
| U2 | Initial payment approach | **Decided:** bank transfer; cash on delivery optional; no live gateway |
| U3 | Concurrency testing | **Decided:** levels 1–2 only; no live-data tests, no test database |
| U4 | Refunds and order states | Final rules §3.4 — *awaiting confirmation* |
| U5 | Website roles separate from admin RBAC | **Approved direction** — §5.1 |
| Interpretations 1–8 | | **Confirmed** |

---

## 2. Global conventions (apply to every table unless stated)

| Item | Rule |
|---|---|
| Primary key | `id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` |
| Timestamps (SC-2) | `created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)`; `updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` (Prisma `@updatedAt` sets it on every write); other dates `DATETIME(3) NULL`; all values UTC |
| Soft delete | `deleted_at DATETIME(3) NULL` where the approved schema has it. Every query filters `deleted_at IS NULL` explicitly (Prisma does not). |
| Unique keys on soft-deleted rows | A soft-deleted row **keeps its unique value reserved** (slug, SKU, email, code). Re-using it means restoring the row, never inserting a duplicate. This avoids conflicting keys and keeps old URLs/SKUs pointing at the same record. *Alternative:* a stored generated column `IF(deleted_at IS NULL, slug, NULL)` with a UNIQUE index — MariaDB supports it but Prisma cannot model it, so it would show as permanent drift. Not recommended. |
| Foreign keys | `ON UPDATE RESTRICT` everywhere (ids never change). `ON DELETE` per table (§5). History tables never cascade. |
| Visibility / publishing flags | Default to **not visible** (`FALSE`, `'draft'`, `'pending'`). Content is published only by an explicit admin action. |
| Money | `DECIMAL(12,2)`; computed on the server with exact decimal arithmetic; serialised as strings. |
| IDs in JSON / client props | `BIGINT` serialised as strings (interpretation 5). |
| CHECK constraints | MariaDB 10.4 enforces them. Prisma cannot declare them, so they are added by hand in the migration SQL (Prisma does not report them as drift). |
| JSON | MariaDB `JSON` = `LONGTEXT` + automatic `JSON_VALID` check. |

---

## 3. Corrections — final definitions

### 3.1 SC-1 — admin RBAC rename (planning)

Verified dependencies (live, 2026-10-20): FKs `role_permissions_role_id_fkey`, `role_permissions_permission_id_fkey`,
`admin_user_roles_role_id_fkey` → `roles`. Rows: 5 roles, 17 permissions, 51 links, 1 assignment (SUPER_ADMIN).

```sql
-- One atomic statement; InnoDB rewrites FK references automatically. No rows touched.
RENAME TABLE roles            TO admin_roles,
             permissions      TO admin_permissions,
             role_permissions TO admin_role_permissions;
-- Then the approved website `roles` table is created (§5.1).
-- Rollback (before `roles` is created): the reverse RENAME TABLE.
```

- MariaDB 10.4 cannot rename indexes/constraints (`RENAME INDEX` arrives in 10.5.2). The existing names
  (`roles_key_key`, `role_permissions_role_id_fkey`, …) are kept and pinned in Prisma with `map:` so no
  drift appears.
- Prisma models renamed `AdminRole`, `AdminPermission`, `AdminRolePermission` (the approved website
  `roles` becomes model `Role`). Code to update: `src/server/rbac/check.js`, `scripts/db/seed-rbac.mjs`,
  `scripts/create-first-admin.mjs`, `src/server/admin/context.js`, `src/app/admin/(panel)/roles|users/page.jsx`.
- Verification after rename: 5/17/51/1 rows, 3 FKs present, SUPER_ADMIN still resolves all 17
  permissions, admin login + MFA + permission-denied page tested, audit entry written.

### 3.2 SC-3 — follow-up: customizer option identity

Final definitions (approved for documentation):
```sql
products.type        ENUM('watch','strap','custom') NOT NULL          -- no default: type is always chosen
cart_items.options       JSON     NULL
cart_items.options_hash  CHAR(64) NOT NULL DEFAULT ''
UNIQUE KEY cart_items_cart_product_options_key (cart_id, product_id, options_hash)
order_items.options      JSON     NULL
```

How option IDs stay valid if the hard-coded options (`src/data/catalog.js`, `customizerOptions`) change:
1. **Orders are safe:** `order_items.options` stores ids **and names** at order time; later changes never alter history.
2. **Rule for the code list:** an option id is never re-used for a different option. Removing an option
   deletes its entry; renaming changes only its name.
3. **Carts:** at every cart read and at checkout the server re-validates options against the current list.
   A line with a removed id is dropped with a notice (the existing `normalizeLine` behaviour); it is never priced.
4. **Admin management:** not possible while options live in code. If you want admins to edit options,
   see optional **SC-8**.

### 3.3 SC-4 — inventory: final rules and SQL (*needs approval*)

```sql
-- products
stock        INT UNSIGNED NOT NULL DEFAULT 0
track_stock  BOOLEAN      NOT NULL DEFAULT FALSE
CONSTRAINT products_stock_max_chk CHECK (stock <= 1000000)      -- business cap, far below INT UNSIGNED max
-- order_items  (revision 3: `stock_restored_at` replaced by a persistent unit counter)
stock_deducted     BOOLEAN      NOT NULL DEFAULT FALSE   -- TRUE if this line reduced stock at checkout
released_quantity  INT UNSIGNED NOT NULL DEFAULT 0       -- units given back so far (cancelled or returned), never decreases
CONSTRAINT order_items_released_qty_chk CHECK (released_quantity <= quantity)
-- order_items.product_id FK: ON DELETE RESTRICT (a product referenced by any order line cannot be hard-deleted)
```
Why the change: a single "restored at" timestamp can record only one restoration per line, so returning
1 of 3 units and later another unit could not be tracked. `released_quantity` is stored on the line, so the
database itself guarantees the total given back never exceeds the units sold.

**Lock order (every transaction that touches these rows):**
`orders (existing row, FOR UPDATE)` → `coupons` → `products` (ascending id) → `order_items` → `payments`.
Checkout never locks an existing order, so no cycle with cancellation/restoration.

**Deduction (inside the checkout transaction, §3.4):**
```sql
SELECT id, status, track_stock, stock, base_price, sale_price
  FROM products WHERE id IN (:ids) AND deleted_at IS NULL ORDER BY id FOR UPDATE;
-- every product must be status='active'; otherwise rollback

-- tracked lines only:
UPDATE products SET stock = stock - :qty
 WHERE id = :pid AND track_stock = TRUE AND stock >= :qty;
-- affected rows must be 1, else ROLLBACK ("insufficient stock")
-- insert order_item with stock_deducted = TRUE
-- untracked lines: no UPDATE of products at all; insert order_item with stock_deducted = FALSE
```

**Releasing units (cancellation, or a full or partial return) — one mechanism for both:**
```sql
SELECT id, status FROM orders WHERE id = :orderId FOR UPDATE;                         -- 1. order
SELECT id, track_stock FROM products WHERE id IN (:ids) ORDER BY id FOR UPDATE;      -- 2. products
-- 3. per line: claim :q units, guarded by the value the admin saw (:expected) and the line quantity
UPDATE order_items
   SET released_quantity = released_quantity + :q
 WHERE id = :lineId
   AND released_quantity = :expected
   AND released_quantity + :q <= quantity;
-- affected rows must be 1, else ROLLBACK ("already updated — reload") — a double click, retry or second
-- admin sends the same :expected, which no longer matches, so nothing is applied twice
-- 4. only if this release puts goods back on the shelf (rules below):
UPDATE products SET stock = stock + :q
 WHERE id = :pid AND track_stock = TRUE AND stock <= 1000000 - :q;
-- 0 rows: product untracked → no stock change (allowed); cap exceeded → ROLLBACK
-- 5. audit entry: order number, line, :q, kind (cancel/return), restock yes/no, stock before/after
```
`:q` for a cancellation = `quantity − released_quantity` (all remaining units). For a return the admin
enters `:q` (1 … remaining) and chooses **restock** (resellable) or **no restock** (damaged).

**When stock is added back (step 4):**
| Release kind | Add `:q` to stock when |
|---|---|
| Cancellation before shipment (goods never left) | the line has `stock_deducted = TRUE` **and** the product is tracked now |
| Return after shipment (goods physically come back) | the admin chose **restock** **and** the product is tracked now |

**Business rules:**
| Case | Behaviour |
|---|---|
| Customer returns 1 of 3, later 1 more | `released_quantity` 0 → 1 → 2; each step adds 1 to stock (if restocked and tracked); a third return of 2 is rejected because 2 + 2 > 3 |
| Duplicate request (retry, double click, two admins) | the `:expected` guard matches only once; the second request changes nothing |
| Tracking turned **off** after the order | units are still counted in `released_quantity`; stock is not changed |
| Tracking turned **on** after the order | the admin enters a fresh physical count when enabling tracking. Cancelled unshipped goods with `stock_deducted = FALSE` were on the shelf at that count, so they are not added again; returned goods were not, so they are added if restocked |
| Partial cancellation | cancel selected lines (or remaining units of a line) through the same mechanism; the order is `cancelled` only when every line is fully released before shipment |
| Turning tracking **on** (`track_stock` FALSE → TRUE) | Allowed only together with an explicit counted quantity entered by the admin in the same action (audit-logged). The previous `stock` value is never reused. |
| Turning tracking **off** (TRUE → FALSE) | `stock` is left as it was but ignored everywhere (never shown as availability, never deducted or restored). |
| Manual stock correction | Admin action with reason; sets or adjusts `stock` with `CHECK`/cap validation; audit entry with before/after. |
| Refund | Money only (§3.4). Stock returns only when goods come back (row above). |
| Overflow | `stock` capped at 1,000,000 by CHECK and validation; restore checks the cap before adding. Line quantity is capped at 10 (existing cart limit) by CHECK on `cart_items`/`order_items`. |
| Product deletion | Hard delete blocked by `order_items` RESTRICT; products are set `inactive` (interpretation 1). |

**Prisma + MariaDB verification plan:** interactive `db.$transaction(fn, { isolationLevel: 'RepeatableRead', timeout: 10000, maxWait: 5000 })`;
`tx.$queryRaw` for `SELECT … FOR UPDATE`; `tx.$executeRaw` returns the affected-row count used for every
conditional check; deadlock (error 1213) retried up to 3 times with jitter.
*Open:* proving "no oversell" needs a real concurrency test that commits rows. With a single database this
would write to `valour_v2`. See unresolved issue U3.

### 3.4 SC-6 — checkout, payments, coupons (*needs approval*)

```sql
-- orders (additions)
checkout_token      VARCHAR(64)  NULL UNIQUE      -- client-generated UUID per checkout attempt; NULL for admin-created orders
coupon_code         VARCHAR(100) NULL             -- snapshot of the code applied
coupon_released_at  DATETIME(3)  NULL             -- set once when an unpaid cancelled order gives its coupon use back
-- coupons (addition)
used_count          INT UNSIGNED NOT NULL DEFAULT 0
-- payments (constraint)
UNIQUE KEY payments_method_transaction_key (payment_method, transaction_id)   -- NULL transaction_id allowed many times
```

**Checkout transaction (one `$transaction`, lock order from §3.3):**
1. Validate the token format, cart lines, options (§3.2), addresses and coupon input with zod.
2. If an order with this `checkout_token` exists → return that order (no second order).
3. Coupon, if given — atomic eligibility + consumption:
   ```sql
   UPDATE coupons SET used_count = used_count + 1
    WHERE code = :code AND status = TRUE
      AND (starts_at  IS NULL OR starts_at  <= UTC_TIMESTAMP(3))
      AND (expires_at IS NULL OR expires_at >  UTC_TIMESTAMP(3))
      AND (usage_limit IS NULL OR used_count < usage_limit);
   -- affected rows must be 1; then minimum order amount and discount cap are checked against the
   -- server-computed subtotal (failure → ROLLBACK, so the use is not consumed)
   ```
4. Lock and price products, deduct stock (§3.3).
5. `INSERT orders` with `order_number = CONCAT('TMP-', :checkout_token)`, then in the same transaction
   `UPDATE orders SET order_number = CONCAT('VAL-', LPAD(id, 6, '0'))` (interpretation 7; the temporary
   value is never visible outside the transaction; UNIQUE guarantees no collision).
6. Insert `order_items` (snapshots, options, totals) and a `payments` row (`pending`).
7. Commit. If two identical requests race, the second blocks on the `checkout_token` unique index, gets a
   duplicate-key error after the first commits, and step 2 returns the first order.
   A failed transaction rolls back everything, including the coupon use.

**Payment callbacks:** verify the provider signature first; in one transaction insert/update the
`payments` row keyed by `(payment_method, transaction_id)` (duplicate callback = no-op) and set
`orders.payment_status` from it (interpretation 4).

**Cancellation and refunds:**
| Event | Coupon | Stock | Payment |
|---|---|---|---|
| Cancel **before** payment | released once: `UPDATE coupons SET used_count = used_count - 1 WHERE code = :c AND used_count > 0` guarded by `UPDATE orders SET coupon_released_at = … WHERE id = :o AND coupon_released_at IS NULL` (affected = 1) | restored (§3.3) | `payment_status` stays `pending`/`failed` |
| Cancel **after** payment | not released | restored if not shipped | refund recorded |
| Refund (full) | not released | only for returned goods | new `payments` row `status='refunded'`, `amount` = refunded amount; `orders.payment_status = 'refunded'` |
| Refund (partial) | not released | only for returned goods | new `payments` row `status='refunded'` with the partial amount; `orders.payment_status` stays `paid` (U4) |

**Verification of SC-6 guarantees:**
| Guarantee | Mechanism |
|---|---|
| Repeated checkout returns the same order | `orders.checkout_token` UNIQUE; lookup before insert; duplicate-key on race → return the committed order |
| No duplicate payment transaction | `UNIQUE(payment_method, transaction_id)`; gateway callbacks (future) are upserts keyed on it |
| Manual bank-transfer confirmation cannot be duplicated | the admin must enter the bank reference; in one transaction: lock the order → `UPDATE payments SET status='paid', transaction_id=:ref, paid_at=UTC_TIMESTAMP(3) WHERE id=:paymentId AND order_id=:o AND status='pending'` (affected = 1) → `UPDATE orders SET payment_status='paid' WHERE id=:o AND payment_status='pending'` (affected = 1). A second click matches 0 rows; the same bank reference on another payment fails the UNIQUE key |
| Cash on delivery (optional) | checkout creates the `payments` row with `payment_method='cash_on_delivery'`, `status='pending'`; the admin confirms it at delivery through the same guarded update (reference optional, so duplicates are blocked by the status guard) |
| Coupon limit atomic | single conditional `UPDATE … used_count < usage_limit` inside the order transaction |
| Failed checkout does not consume a coupon | the increment is in the same transaction; rollback reverts it |
| Coupon released at most once | lock order row → `UPDATE orders SET coupon_released_at = … WHERE id = :o AND coupon_released_at IS NULL AND status = 'cancelled' AND payment_status IN ('pending','failed')` (affected = 1) → then decrement coupon `WHERE used_count > 0` |
| Eligibility/expiry on the server | status, start/end dates, minimum amount, cap and percentage limit checked in the transaction; client values ignored |

**U2 — recommended initial payment approach (no live gateway):** offline **bank transfer** (and, if you
want it, cash on delivery), confirmed by an admin:
1. Checkout creates the order (`status = pending`, `payment_status = pending`) and a `payments` row
   (`status = pending`, `payment_method = 'bank_transfer'`, `amount = total`).
2. The customer sees the order number and bank details from public settings.
3. An admin with `payment.update` records the payment with the bank reference (guarded update above).
   This changes **payment status only**; confirming the order is a separate fulfilment action.
4. Unpaid orders can be cancelled by an admin (units released, coupon released once).
A card gateway is added later as a new `payment_method` with a verified callback route; no schema change.

**U4 — final state rules: fulfilment (`orders.status`) and payment (`orders.payment_status`) are independent.**
Neither changes the other automatically; the guards below only *block* invalid combinations.

Fulfilment transitions (admin action, `order.update`):
| From | To | Guard |
|---|---|---|
| pending | confirmed | — |
| pending, confirmed, processing | cancelled | goods not shipped; every line's remaining units are released (§3.3) |
| confirmed | processing | — |
| processing | shipped | `payment_status = 'paid'`, or the payment method is `cash_on_delivery` |
| shipped | delivered | — |
| shipped, delivered, cancelled | anything else | not allowed (returns are recorded on lines, not by changing order status) |

Payment transitions (`payment.update`, or a verified gateway callback later):
| From | To | Rule |
|---|---|---|
| pending | paid | guarded confirmation above |
| pending | failed | admin marks the transfer as not received |
| failed | pending | customer pays again (a new pending `payments` row) |
| paid | refunded | only when refunded total = paid total |
| refunded | — | final |

Refunds: each refund is a new `payments` row (`status='refunded'`, positive `amount`), created in a
transaction that locks the order and rejects any refund that would make refunded total > paid total.
A partial refund leaves `payment_status = 'paid'`. A full refund sets `refunded` and **does not** cancel the
order; a cancelled-and-paid order shows "refund due" until refunded. The order view shows paid, refunded and
net amounts from `payments`.
The order view shows paid, refunded and net amounts computed from the `payments` rows.

### 3.5 SC-7 — `users` for guest checkout (*decision needed; no change made*)

| | Option A — guests are not users | Option B — guests become passwordless users (recommended) |
|---|---|---|
| Schema change | none | `password VARCHAR(255) NULL`; `remember_token` removed |
| Guest order | `orders.user_id = NULL`, details only in billing/shipping JSON | upsert `users` by email (role `Customer`, `password = NULL`), `orders.user_id` set |
| Admin "Customers" module | derived from order JSON (no table records, harder to search) | real table records, addresses, order history |
| Repeat customers | not linked | linked by email |
| Later customer login | new accounts separate from past orders | account claimed by verifying the email; history attached |
| Wishlists / reviews (`user_id` NOT NULL) | unusable until login exists | still need login: a passwordless user cannot prove identity, so these stay disabled on the storefront; admin screens read-only |
| Server carts (`carts.session_id`) | guest cart by session cookie | same |

Security for B: a `users` row with `password = NULL` can never sign in; email ownership is proven before
any account is claimed. No fake passwords in either option.

**Final definition — Option B (direction approved):**
```sql
users.password        VARCHAR(255) NOT NULL  →  VARCHAR(255) NULL
users.remember_token  removed
-- unchanged: role_id NOT NULL (guest records get the website role 'Customer'), email UNIQUE,
--            email_verified_at NULL (stays NULL for guests)
```
Rules:
1. **Guests cannot authenticate:** there is no customer sign-in endpoint in this phase. The admin Better
   Auth instance reads only `admin_*` tables, so a `users` row can never sign in to the admin panel.
2. **Checkout:** in the order transaction, find `users` by normalised email (lower-case, trimmed); create it
   if missing (`role = Customer`, `password = NULL`, names/phone from the billing form). An existing record's
   profile is **not** overwritten by a guest checkout (prevents someone changing another person's details by
   typing their email); the order keeps its own billing/shipping snapshot.
3. **Future account claiming (separate approval, separate tables):** a customer Better Auth instance with its
   own tables, secret and cookie prefix, linked to `users.id`. Claiming requires an emailed one-time token
   (proves ownership) → sets `email_verified_at`; only then can a password/passkey be added.
4. **Known limitation:** before claiming, orders placed by anyone using that email attach to the same record;
   after claiming, the order history shown to the customer is limited to orders whose billing email matches
   the verified email.

### 3.6 SC-8 — database-managed customizer options (approved in principle)

```sql
CREATE TABLE customizer_options (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  part        ENUM('case','dial','strap') NOT NULL,
  option_key  VARCHAR(50)  NOT NULL,      -- value stored in cart/order options; immutable after creation
  name        VARCHAR(100) NOT NULL,
  image       VARCHAR(255) NOT NULL,      -- transparent layer image
  sort_order  INT          NOT NULL DEFAULT 0,
  status      ENUM('draft','active','inactive') NOT NULL DEFAULT 'draft',
  is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY customizer_options_part_option_key_key (part, option_key),
  KEY customizer_options_part_status_sort_idx (part, status, sort_order),
  CONSTRAINT customizer_options_key_format_chk CHECK (option_key REGEXP '^[a-z0-9-]{1,50}$')
);
```
Preserving the existing customizer:
- **Seed:** the 26 entries of `customizerOptions` in `src/data/catalog.js` are imported with
  `option_key` = their current `id`, same names and image paths (existing files under `public/images`
  are kept), same order, `status = 'active'`, and the current defaults as `is_default`. Existing carts
  (which store these ids) keep working.
- **Rules:** `option_key` cannot be edited; options are never hard-deleted (retire with `inactive`);
  exactly one `active` default per part (set in a transaction); an option can be made `inactive` only if
  its part keeps at least one active option.
- **Storefront:** the customizer receives active options from the server; cart and checkout validate
  `{caseId, dialId, strapId}` against active options; order lines snapshot key + name.
- **Admin:** list per part, create (layer image upload: PNG/WebP with transparency, same security checks
  as product images), edit name/image/order, activate/retire, choose default. Permission `product.update`.
- No price column (no invented surcharges).

### 3.7 SC-10, SC-12, SC-13 — final definitions

**SC-10 (configurable currency):**
```sql
orders.currency CHAR(3) NOT NULL          -- no database default; written by the server on every order
```
The store currency is the setting `store_currency` in `general_settings` (`type = 'currency'`,
`is_public = TRUE`, value validated as an ISO 4217 code, seeded `USD`). Product prices and coupon fixed
values are in the store currency. Changing `store_currency` is allowed only with a confirmation that
existing prices are already expressed in the new currency (audit-logged); past orders keep their own
currency. Admin and storefront format amounts with the order's/store's currency.

**SC-12 (server-side visibility):** the storefront reads settings only through a server function that
selects `WHERE is_public = TRUE`; no public API returns the table directly; admin screens require
`settings.view` / `settings.update`. Private values never reach client components.

**SC-13 (verified):** `admin_users.id` is `VARCHAR(64)`, `utf8mb4_unicode_ci`, 32-character Better Auth ids
(live, 2026-10-20). An FK needs the same type and collation, so:
```sql
blogs.author_admin_id VARCHAR(64) NULL,     -- replaces author_id
CONSTRAINT blogs_author_admin_id_fkey FOREIGN KEY (author_admin_id)
  REFERENCES admin_users(id) ON DELETE SET NULL ON UPDATE RESTRICT
```
Better Auth never changes ids, and admin users are normally disabled rather than deleted; if one is
deleted, posts remain with no author. Better Auth's own tables and behaviour are unchanged.

### 3.8 SC-16 — final review rules

```sql
product_reviews.order_id BIGINT UNSIGNED NOT NULL       -- was NULL
CONSTRAINT product_reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT ON UPDATE RESTRICT
UNIQUE KEY product_reviews_user_product_order_key (user_id, product_id, order_id)
```
Server checks in the create transaction (requires a signed-in customer, so the feature stays disabled until
customer login exists): the order belongs to the user (`orders.user_id = user`), the order is `delivered`,
the order contains the product (`order_items.product_id = product`), and the pair is not reviewed yet.
Multiple purchases on different orders allow one review each.

---

## 4. New issues found while specifying SC-5 (*each needs approval*)

| ID | Table.column | Problem | Proposed correction |
|---|---|---|---|
| SC-8 *(optional)* | — | Customizer options cannot be managed in the admin while they live in code | New table `customizer_options` (`id`, `part ENUM('case','dial','strap')`, `option_key VARCHAR(50)`, `name`, `image`, `sort_order`, `status`, timestamps; `UNIQUE(part, option_key)`). Not required for this phase. |
| SC-9 | `newsletters` | No record of consent; your requirement says subscription needs valid consent | Add `consent_at DATETIME(3) NOT NULL`, `consent_source VARCHAR(50) NOT NULL` (e.g. `footer_form`), `unsubscribed_at DATETIME(3) NULL`; `is_subscribed` default `FALSE` |
| SC-10 | `orders` | No currency recorded; a later currency change would make old totals ambiguous | Add `currency CHAR(3) NOT NULL` (no default; from the `store_currency` setting — §3.7) |
| SC-11 | `cms_pages` | No status, so a page is live the moment it is created; your rule requires explicit publishing | Add `status ENUM('draft','published') NOT NULL DEFAULT 'draft'`, `published_at DATETIME(3) NULL` |
| SC-12 | `general_settings` | No way to separate public settings from private ones; a storefront API could leak private values | Add `is_public BOOLEAN NOT NULL DEFAULT FALSE` |
| SC-13 | `blogs.author_id` → `users.id` | Blog authors are admins, who live in Better Auth's `admin_users` (string ids, D1), not in `users` | Replace with `author_admin_id VARCHAR(64) NULL` (FK → `admin_users.id`, ON DELETE SET NULL) **or** keep `author_id` and add an author name snapshot. Recommend the FK. |
| SC-14 | `cms_page_section_fields.field_group` | NULL group allows duplicate field names in one section | `field_group VARCHAR(100) NOT NULL DEFAULT ''` + `UNIQUE(cms_page_section_id, field_group, field_name)` |
| SC-15 | `testimonials.rating`, `product_reviews.rating` | `TINYINT` signed in testimonials; range 1–5 not enforced | Both `TINYINT UNSIGNED` + `CHECK (rating BETWEEN 1 AND 5)` |
| SC-16 | `product_reviews` | Same user can review the same purchase many times | `order_id` NOT NULL + `UNIQUE(user_id, product_id, order_id)` (§3.8) |

---

## 5. SC-5 — table-by-table specification (*needs approval*)

Legend: **NN** = NOT NULL · **—** = no default · `[SC-n]` = depends on that correction · every FK is `ON UPDATE RESTRICT`.
Timestamps follow §2 and are listed as "timestamps".

### 5.1 `roles` (website roles; admin roles are `admin_roles`, D1/SC-1)
| Column | Type | Null | Default |
|---|---|---|---|
| id | BIGINT UNSIGNED | NN | AUTO_INCREMENT |
| name | VARCHAR(100) | NN | — |
| timestamps, deleted_at | DATETIME(3) | | |

PK `id` · UNIQUE `name` · Soft delete: blocked while any `users` row references it.
**U5:** website roles are completely separate from admin RBAC (`admin_roles`, D1/SC-1). No code path reads
`roles` for admin authorisation; a website `Admin` or `Editor` role grants **no** admin-panel access.
Seed: `Customer` only; `Admin`/`Editor` are created only if you later approve a website feature that uses them.

### 5.2 `brands`
| Column | Type | Null | Default |
|---|---|---|---|
| name | VARCHAR(150) | NN | — |
| slug | VARCHAR(180) | NN | — |
| description | TEXT | NULL | NULL |
| logo | VARCHAR(255) | NULL | NULL |
| status | BOOLEAN | NN | **FALSE** (activate explicitly) |
| timestamps, deleted_at | | | |

UNIQUE `name`, `slug` · INDEX `status` · Soft delete blocked while active products reference it.

### 5.3 `cms_pages`
| Column | Type | Null | Default |
|---|---|---|---|
| page_title | VARCHAR(255) | NN | — |
| page_slug | VARCHAR(255) | NN | — |
| page_meta_title | VARCHAR(255) | NULL | NULL |
| page_meta_description | TEXT | NULL | NULL |
| status, published_at `[SC-11]` | ENUM('draft','published'), DATETIME(3) | NN, NULL | 'draft', NULL |
| timestamps | | | |

UNIQUE `page_slug` · No soft delete (approved). Hard delete allowed only for `draft` pages; cascades to sections/fields; testimonials keep `cms_page_id = NULL`.

### 5.4 `general_settings`
| Column | Type | Null | Default |
|---|---|---|---|
| key | VARCHAR(150) | NN | — |
| type | VARCHAR(50) | NN | — |
| value | LONGTEXT | NULL | NULL |
| field_options | JSON | NULL | NULL |
| is_public `[SC-12]` | BOOLEAN | NN | FALSE |
| timestamps | | | |

UNIQUE `key` (reserved word — quoted by Prisma via `@map("key")`) · No soft delete.

### 5.5 `newsletters`
| Column | Type | Null | Default |
|---|---|---|---|
| email | VARCHAR(255) | NN | — |
| is_subscribed | BOOLEAN | NN | **FALSE** `[SC-9]` |
| subscribed_at | DATETIME(3) | NULL | NULL |
| consent_at, consent_source, unsubscribed_at `[SC-9]` | | NN, NN, NULL | — |
| timestamps, deleted_at | | | |

UNIQUE `email` (notes line 416; case-insensitive collation) · INDEX `(is_subscribed, created_at)` · Unsubscribe = `is_subscribed = FALSE` + `unsubscribed_at`; `deleted_at` used only for erasure requests (email replaced by a hash so the address is removed).

### 5.6 `contact_inquiries`
| Column | Type | Null | Default |
|---|---|---|---|
| name | VARCHAR(150) | NN | — |
| email | VARCHAR(255) | NN | — |
| phone | VARCHAR(30) | NULL | NULL |
| subject | VARCHAR(255) | NULL | NULL |
| message | TEXT | NN | — |
| type | VARCHAR(50) | NN | 'contact' |
| extra_data | JSON | NULL | NULL |
| is_read | BOOLEAN | NN | FALSE |
| is_replied | BOOLEAN | NN | FALSE |
| reply_message | TEXT | NULL | NULL |
| replied_at | DATETIME(3) | NULL | NULL |
| timestamps, deleted_at | | | |

INDEX `(is_read, created_at)`, `(type, created_at)`, `email` · Soft delete only.

### 5.7 `tags`
`name VARCHAR(100) NN` UNIQUE · `slug VARCHAR(120) NN` UNIQUE · timestamps, deleted_at · Soft delete keeps `blog_tag` rows; hard delete cascades `blog_tag` only.

### 5.8 `coupons`
| Column | Type | Null | Default |
|---|---|---|---|
| code | VARCHAR(100) | NN | — |
| type | ENUM('fixed','percentage') | NN | — |
| value | DECIMAL(12,2) | NN | — |
| min_order_amount | DECIMAL(12,2) | NN | 0.00 |
| max_discount | DECIMAL(12,2) | NULL | NULL |
| usage_limit | INT UNSIGNED | NULL | NULL |
| used_count `[SC-6]` | INT UNSIGNED | NN | 0 |
| starts_at, expires_at | DATETIME(3) | NULL | NULL |
| status | BOOLEAN | NN | **FALSE** |
| timestamps | | | |

UNIQUE `code` (stored upper-case) · INDEX `(status, expires_at)` · CHECK `value > 0`, `type <> 'percentage' OR value <= 100`, `min_order_amount >= 0`, `max_discount IS NULL OR max_discount > 0`, `expires_at IS NULL OR starts_at IS NULL OR expires_at > starts_at`, `usage_limit IS NULL OR used_count <= usage_limit` · No soft delete (approved): disable via `status`; never deleted once used.

### 5.9 `categories`
| Column | Type | Null | Default |
|---|---|---|---|
| parent_id | BIGINT UNSIGNED | NULL | NULL |
| name | VARCHAR(150) | NN | — |
| slug | VARCHAR(180) | NN | — |
| description | TEXT | NULL | NULL |
| type | ENUM('blog','product') | NN | — (always chosen) |
| image | VARCHAR(255) | NULL | NULL |
| status | BOOLEAN | NN | **FALSE** |
| sort_order | INT | NN | 0 |
| timestamps, deleted_at | | | |

UNIQUE `slug` · FK `parent_id → categories.id` **ON DELETE RESTRICT** · INDEX `parent_id`, `(type, status, sort_order)` · A database CHECK cannot detect loops (and a self-parent check on the AUTO_INCREMENT `id` is not reliable at insert time), so self-parent and loops are blocked by the application:
in one transaction, lock the category, walk ancestors of the new parent with
`WITH RECURSIVE` (supported since MariaDB 10.2), reject if the category appears, reject if parent `type` differs, max depth 3.
Soft delete blocked while it has non-deleted children, products or blogs.

### 5.10 `users`
| Column | Type | Null | Default |
|---|---|---|---|
| role_id | BIGINT UNSIGNED | NN | — |
| first_name | VARCHAR(100) | NN | — |
| last_name, name, phone | VARCHAR | NULL | NULL |
| email | VARCHAR(255) | NN | — |
| email_verified_at | DATETIME(3) | NULL | NULL |
| password | VARCHAR(255) | NULL `[SC-7 B]` | NULL (guests have none) |
| address, country, city, state, zip, image | VARCHAR | NULL | NULL |
| status | BOOLEAN | NN | TRUE — account state (an inactive customer cannot check out), not published content |
| ~~remember_token~~ | — | — | removed (SC-7 option B) |
| timestamps, deleted_at | | | |

UNIQUE `email` · FK `role_id → roles.id` ON DELETE RESTRICT · INDEX `role_id`, `(status, created_at)` · Soft delete only; a user with orders can never be hard-deleted (orders RESTRICT). Erasure requests anonymise personal columns instead of deleting.

### 5.11 `products`
| Column | Type | Null | Default |
|---|---|---|---|
| category_id, brand_id | BIGINT UNSIGNED | NULL | NULL |
| name | VARCHAR(255) | NN | — |
| slug | VARCHAR(255) | NN | — |
| sku | VARCHAR(100) | NN | — |
| short_description | TEXT | NULL | NULL |
| long_description | LONGTEXT | NULL | NULL |
| additional_info | JSON | NULL | NULL |
| type `[SC-3]` | ENUM('watch','strap','custom') | NN | — |
| stock, track_stock `[SC-4]` | INT UNSIGNED, BOOLEAN | NN | 0, FALSE |
| base_price | DECIMAL(12,2) | NN | — |
| sale_price | DECIMAL(12,2) | NULL | NULL |
| main_image | VARCHAR(255) | NULL | NULL |
| images | JSON | NULL | NULL |
| meta_title | VARCHAR(255) | NULL | NULL |
| meta_description | TEXT | NULL | NULL |
| status | ENUM('draft','active','inactive') | NN | 'draft' |
| is_featured | BOOLEAN | NN | FALSE |
| timestamps, deleted_at | | | |

UNIQUE `slug`, `sku` · FK `category_id → categories.id`, `brand_id → brands.id` ON DELETE RESTRICT · INDEX `(status, type)`, `category_id`, `brand_id`, `(is_featured, status)` · CHECK `base_price > 0`, `sale_price IS NULL OR (sale_price > 0 AND sale_price <= base_price)`, `stock <= 1000000` · App rule: `active` requires `main_image`, a valid price and (for `custom`) a confirmed price — the Custom Watch row is created only when its price is confirmed (interpretation 2) · Soft delete / `inactive` only once referenced by any order.

### 5.12 `cms_page_sections`
`cms_page_id BIGINT UNSIGNED NN` FK → `cms_pages.id` **ON DELETE CASCADE** (approved note) · `section_name VARCHAR(150) NN` · `section_type VARCHAR(100) NN` (allowed values fixed in code, one per storefront section component) · `section_sort_order INT UNSIGNED NN DEFAULT 0` · timestamps · INDEX `(cms_page_id, section_sort_order)` · No soft delete.

### 5.13 `testimonials`
| Column | Type | Null | Default |
|---|---|---|---|
| cms_page_id | BIGINT UNSIGNED | NULL | NULL |
| name | VARCHAR(150) | NN | — |
| designation, company | VARCHAR(150) | NULL | NULL |
| message | TEXT | NN | — |
| image | VARCHAR(255) | NULL | NULL |
| rating `[SC-15]` | TINYINT UNSIGNED | NULL | NULL |
| status | ENUM('pending','approved','rejected') | NN | 'pending' |
| sort_order | INT | NN | 0 |
| timestamps, deleted_at | | | |

FK `cms_page_id → cms_pages.id` ON DELETE SET NULL (approved) · INDEX `(status, sort_order)`, `cms_page_id`.

### 5.14 `user_addresses`
`user_id BIGINT UNSIGNED NN` FK → `users.id` ON DELETE CASCADE (users are never hard-deleted while they have orders; order addresses are independent JSON snapshots) · `name VARCHAR(150) NN`, `phone VARCHAR(30) NN`, `address_line_1 VARCHAR(255) NN`, `address_line_2 VARCHAR(255) NULL`, `city VARCHAR(100) NN`, `state VARCHAR(100) NULL`, `country VARCHAR(100) NN`, `zip VARCHAR(20) NULL`, `is_default BOOLEAN NN DEFAULT FALSE`, timestamps · INDEX `(user_id, is_default)` · One default per user enforced in a transaction (no partial unique index in MariaDB).

### 5.15 `carts`
`user_id BIGINT UNSIGNED NULL` FK → `users.id` ON DELETE SET NULL · `session_id VARCHAR(255) NULL` (stores the SHA-256 hex of an HttpOnly cookie token, never the raw token) · `status ENUM('active','converted','abandoned') NN DEFAULT 'active'` · `expires_at DATETIME(3) NULL` · timestamps · INDEX `session_id`, `(user_id, status)`, `(status, expires_at)` · CHECK `user_id IS NOT NULL OR session_id IS NOT NULL` · Expired carts are marked `abandoned`; hard delete of abandoned carts after 30 days cascades `cart_items` (no history value).

### 5.16 `orders`
| Column | Type | Null | Default |
|---|---|---|---|
| user_id | BIGINT UNSIGNED | NULL | NULL |
| order_number | VARCHAR(50) | NN | — |
| billing_details, shipping_details | JSON | NN | — |
| shipping_method | VARCHAR(100) | NULL | NULL |
| shipping_amount, discount, tax_amount | DECIMAL(12,2) | NN | 0.00 |
| subtotal, total | DECIMAL(12,2) | NN | — (always computed) |
| status | ENUM('pending','confirmed','processing','shipped','delivered','cancelled') | NN | 'pending' |
| payment_status | ENUM('pending','paid','failed','refunded') | NN | 'pending' |
| payment_method | VARCHAR(100) | NULL | NULL |
| payment_reference | VARCHAR(255) | NULL | NULL |
| notes | TEXT | NULL | NULL |
| placed_at | DATETIME(3) | NULL | NULL (set at checkout commit) |
| checkout_token, coupon_code, coupon_released_at `[SC-6]` | | NULL | NULL |
| currency `[SC-10]` | CHAR(3) | NN | — (from setting `store_currency`) |
| timestamps, deleted_at | | | |

UNIQUE `order_number`, `checkout_token` · FK `user_id → users.id` **ON DELETE RESTRICT** · INDEX `(status, created_at)`, `(payment_status, created_at)`, `user_id`, `placed_at` · CHECK all amounts `>= 0`, `discount <= subtotal`, `total = subtotal - discount + shipping_amount + tax_amount` · `deleted_at` is kept as approved but **never set by the application** (orders are cancelled, never deleted). Status transitions enforced in code: pending→confirmed|cancelled, confirmed→processing|cancelled, processing→shipped|cancelled, shipped→delivered.

### 5.17 `blogs`
| Column | Type | Null | Default |
|---|---|---|---|
| category_id | BIGINT UNSIGNED | NULL | NULL |
| title | VARCHAR(255) | NN | — |
| slug | VARCHAR(255) | NN | — |
| description | LONGTEXT | NN | — (sanitised HTML) |
| status | ENUM('draft','published','archived') | NN | 'draft' |
| featured_image | VARCHAR(255) | NULL | NULL |
| images | JSON | NULL | NULL |
| meta_title, meta_description, meta_keywords | | NULL | NULL |
| published_at | DATETIME(3) | NULL | NULL (set when published) |
| author_admin_id `[SC-13]` | VARCHAR(64) | NULL | NULL (FK → `admin_users.id` ON DELETE SET NULL) |
| timestamps, deleted_at | | | |

UNIQUE `slug` · FK `category_id → categories.id` ON DELETE RESTRICT (category must be `type='blog'`, checked in app) · INDEX `(status, published_at)`, `category_id` · Soft delete.

### 5.18 `cms_page_section_fields`
`cms_page_section_id BIGINT UNSIGNED NN` FK → `cms_page_sections.id` ON DELETE CASCADE · `field_group VARCHAR(100)` `[SC-14]` · `field_name VARCHAR(150) NN` · `field_type VARCHAR(50) NN` (text, textarea, image, select, repeater — validated in code) · `field_value LONGTEXT NULL` (validated against `field_type`; HTML sanitised) · `field_options JSON NULL` · timestamps · UNIQUE `(cms_page_section_id, field_group, field_name)` `[SC-14]`.

### 5.19 `blog_tag`
`blog_id` FK → `blogs.id` ON DELETE CASCADE · `tag_id` FK → `tags.id` ON DELETE CASCADE (approved note: cascade only on permanent delete) · timestamps · UNIQUE `(blog_id, tag_id)` · INDEX `tag_id`.

### 5.20 `cart_items`
`cart_id` FK → `carts.id` ON DELETE CASCADE · `product_id` FK → `products.id` ON DELETE RESTRICT · `quantity INT UNSIGNED NN DEFAULT 1` CHECK `quantity BETWEEN 1 AND 10` · `options JSON NULL`, `options_hash CHAR(64) NN DEFAULT ''` `[SC-3]` · timestamps · UNIQUE `(cart_id, product_id, options_hash)` · INDEX `product_id`. Price is never stored in the cart; it is read from `products` at checkout.

### 5.21 `order_items`
| Column | Type | Null | Default |
|---|---|---|---|
| order_id | BIGINT UNSIGNED | NN | — |
| product_id | BIGINT UNSIGNED | NULL | NULL |
| product_name | VARCHAR(255) | NN | — |
| sku | VARCHAR(100) | NULL | NULL |
| product_image | VARCHAR(255) | NULL | NULL |
| price | DECIMAL(12,2) | NN | — |
| quantity | INT UNSIGNED | NN | — |
| subtotal | DECIMAL(12,2) | NN | — |
| discount | DECIMAL(12,2) | NN | 0.00 |
| total | DECIMAL(12,2) | NN | — |
| options `[SC-3]` | JSON | NULL | NULL |
| stock_deducted, released_quantity `[SC-4]` | BOOLEAN, INT UNSIGNED | NN, NN | FALSE, 0 |
| timestamps | | | |

FK `order_id → orders.id` ON DELETE RESTRICT · FK `product_id → products.id` **ON DELETE RESTRICT** · INDEX `order_id`, `product_id` · CHECK `quantity BETWEEN 1 AND 10`, `price >= 0`, `subtotal = price * quantity`, `discount BETWEEN 0 AND subtotal`, `total = subtotal - discount`, `released_quantity <= quantity` · Snapshot columns are never updated after insert (enforced in code; the only later write is the guarded `released_quantity` increment).

### 5.22 `payments`
`order_id BIGINT UNSIGNED NN` FK → `orders.id` ON DELETE RESTRICT · `transaction_id VARCHAR(255) NULL` · `payment_method VARCHAR(100) NN` · `amount DECIMAL(12,2) NN` CHECK `amount > 0` · `status ENUM('pending','paid','failed','refunded') NN DEFAULT 'pending'` · `paid_at DATETIME(3) NULL` · timestamps · UNIQUE `(payment_method, transaction_id)` `[SC-6]` · INDEX `order_id`, `(status, created_at)` · Never deleted or edited after `paid`/`refunded`; refunds are new rows.

### 5.23 `wishlists`
`user_id` FK → `users.id` ON DELETE CASCADE · `product_id` FK → `products.id` ON DELETE CASCADE · `created_at DATETIME(3) NN DEFAULT CURRENT_TIMESTAMP(3)` · UNIQUE `(user_id, product_id)` · INDEX `product_id`. (No history value; requires customer login — SC-7.)

### 5.24 `product_reviews`
`user_id` FK → `users.id` ON DELETE RESTRICT · `product_id` FK → `products.id` ON DELETE RESTRICT · `order_id BIGINT UNSIGNED NOT NULL` `[SC-16]` FK → `orders.id` ON DELETE RESTRICT · `rating TINYINT UNSIGNED NN` CHECK 1–5 · `review TEXT NULL` · `status ENUM('pending','approved','rejected') NN DEFAULT 'pending'` · timestamps · UNIQUE `(user_id, product_id, order_id)` `[SC-16]` · INDEX `(product_id, status)` · Moderated; never auto-published.

### 5.25 `customizer_options` `[SC-8]`
Definition in §3.6. Dependencies: none (insert anywhere before use). Not referenced by FK: carts and orders
store `option_key` inside JSON, so rows are retired (`inactive`), never deleted.

### 5.26 Admin-panel permission keys (code, not schema)
New keys added to the admin permission seed (in `admin_permissions`, D1): `category.*`, `brand.*`,
`customer.update`, `order.update`, `payment.update`, `coupon.view/manage`, `cart.view`, `review.moderate`,
`cms.view/update/publish`, `blog.view/update/publish`, `testimonial.moderate`, `newsletter.view/export`,
`inquiry.view/update`. Mapping to the 5 admin roles is presented with the RBAC seed for approval.

---

## 6. Unresolved issues

| ID | Issue | Needed from you |
|---|---|---|
| U1 | SC-7 | resolved: option B (final definition awaiting approval) |
| U2 | Initial payment approach | recommendation §3.4: offline bank transfer (± cash on delivery), admin-confirmed — decision |
| U3 | Concurrency testing | procedure below — decision |
| U4 | Partial refunds | final behaviour §3.4 — confirm |
| U5 | Website roles | resolved: separate from admin RBAC; seed `Customer` only (§5.1) |
| U6 | SC-8 | resolved: approved in principle |

### U3 — testing procedure (no test database created; no live business data touched)

| Level | What it proves | Where | Permission needed |
|---|---|---|---|
| 1. Unit tests | SQL conditions, lock order, branch on affected-row counts, deadlock retry, coupon/stock/refund rules, idempotency logic | Node only, mocked transaction client | none |
| 2. Structure checks | every CHECK, UNIQUE, FK and delete rule exists exactly as specified | read-only queries on `information_schema` of `valour_v2` after each migration | none (read-only) |
| 3. Locking tests, always rolled back | two connections: A locks a product and deducts without committing; B's conditional update waits, then sees A's value; same for the coupon update. Both **roll back**. | `valour_v2`, only on the **seeded catalog rows**, before the site takes orders | **separate approval** — side effects: rows locked for seconds; no row changes persist; an INSERT into `orders` is avoided so no AUTO_INCREMENT gap |
| 4. Commit-path tests | duplicate checkout returning the first order, restore-once across requests, duplicate payment callback | needs committed rows → a separate database | **separate approval to create `valour_v2_test`** (you create it in phpMyAdmin with privileges on that database only, as for the earlier test database); it would be dropped after use |

Without level 4, those three behaviours are verified by levels 1–3 plus a manual end-to-end test on the
real site before launch (one order placed, paid, cancelled and refunded by you, then cleaned up only with your approval).

---

## 7. Data-integrity and security summary

- History is never cascade-deleted: `orders`, `order_items`, `payments` use RESTRICT; customers and products referenced by orders cannot be hard-deleted.
- Order lines keep name, SKU, image, price, options and currency snapshots; totals are checked by CHECK constraints and recomputed on the server.
- Stock: atomic conditional updates, a consistent lock order, idempotent restoration, cap checks.
- Checkout: idempotency token, coupon consumption in the same transaction, unique payment transactions.
- Publishing: products, brands, categories, coupons, CMS pages, blogs, testimonials and reviews all start hidden/pending.
- Privacy: consent recorded for newsletters; erasure anonymises instead of deleting order history; settings exposed publicly only when `is_public`.
- Security (D1) unchanged: Better Auth, MFA, admin RBAC (renamed per SC-1), SUPER_ADMIN protection and audit logging cover every new admin module; new permission keys are added to the admin permission seed for each module.

---

## 8. Implementation dependencies (after approval)

1. Final approvals: SC-4, SC-5, SC-6, SC-7, SC-8, SC-16 definitions; U2, U3, U4.
2. Update `Ordered_Ecommerce_CMS_Schema.md` with every approved change (one consistent edit).
3. MariaDB running; live re-verification (structures, row counts).
4. Verified backup (dump + SHA-256 + row counts).
5. Migration 1 (non-destructive): SC-1 rename — separate approval.
6. Migration 2 (non-destructive): create the non-clashing approved tables in dependency order.
7. Migration 3 (destructive, empty tables only): drop the old e-commerce tables and create `products`, `orders`, `order_items`, `cart_items`, `payments`, `wishlists`, `product_reviews` — separate approval with the exact table list and row counts.
8. `prisma generate`; seeds (website roles, admin permissions for new modules, categories, products from `catalog.js` with confirmed prices only, CMS content from the current pages).
9. Module-by-module code with tests; storefront switch-over; removal of obsolete code.
