# E-commerce and CMS Database Schema

**Revision 2 — 2026-10-21.** Approved corrections SC-2 to SC-16 applied (see the change log at the end and
`docs/schema-corrections-proposal.md` for the reasoning). Target: MariaDB 10.4 (InnoDB, `utf8mb4_unicode_ci`,
strict SQL mode, UTC), Prisma 7.10.1.

The existing admin security tables (Better Auth `admin_users`, `admin_accounts`, `admin_sessions`,
`admin_two_factors`, `admin_verifications`, `admin_rate_limits`, `admin_user_roles`, admin RBAC and
`audit_logs`) are **retained outside this schema** (decision D1). Admin RBAC tables are to be renamed
`admin_roles`, `admin_permissions`, `admin_role_permissions` (SC-1, planning only — separate migration approval).
Website `roles` below are **separate from admin RBAC** and never grant admin-panel access (U5).

## Table order

Independent parent tables appear first, followed by dependent tables. Every external foreign-key target appears before its referencing table. All tables retain their primary keys; a table can contain both primary and foreign keys.

`categories.parent_id` is a self-reference. It does not depend on a separate table; insert parent category rows before child category rows.

**Notation:** PK = Primary Key; FK = Foreign Key; UNIQUE = unique constraint; NULL = optional; NOT NULL = required; DEFAULT = database default (— means none). Matching PK and FK columns must use the same data type. Create tables in the order below; drop them in reverse order. Changed or added items are marked with their correction id, e.g. *(SC-4)*.

| # | Table | Depends on |
| --- | --- | --- |
| 1 | `roles` | None |
| 2 | `brands` | None |
| 3 | `cms_pages` | None |
| 4 | `general_settings` | None |
| 5 | `newsletters` | None |
| 6 | `contact_inquiries` | None |
| 7 | `tags` | None |
| 8 | `coupons` | None |
| 9 | `customizer_options` *(SC-8)* | None |
| 10 | `categories` | Self-reference only |
| 11 | `users` | `roles` |
| 12 | `products` | `categories`, `brands` |
| 13 | `cms_page_sections` | `cms_pages` |
| 14 | `testimonials` | `cms_pages` |
| 15 | `user_addresses` | `users` |
| 16 | `carts` | `users` |
| 17 | `orders` | `users` |
| 18 | `blogs` | `categories`, `admin_users` (existing, D1) *(SC-13)* |
| 19 | `cms_page_section_fields` | `cms_page_sections` |
| 20 | `blog_tag` | `blogs`, `tags` |
| 21 | `cart_items` | `carts`, `products` |
| 22 | `order_items` | `orders`, `products` |
| 23 | `payments` | `orders` |
| 24 | `wishlists` | `users`, `products` |
| 25 | `product_reviews` | `users`, `products`, `orders` |

## Global rules

- **Primary keys:** `id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT`.
- **Dates *(SC-2)*:** `DATETIME(3)`, always UTC. `created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)`; `updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` (set on every write by the application); other dates `DATETIME(3) NULL`.
- **Foreign keys:** `ON UPDATE RESTRICT` everywhere; `ON DELETE` as stated per table. Historical records (orders, order items, payments) never cascade.
- **Soft delete:** `deleted_at DATETIME(3) NULL` where listed. Queries filter `deleted_at IS NULL`. A soft-deleted row keeps its unique values reserved (slug, SKU, email, code); reuse means restoring the row.
- **Publishing:** visibility and moderation fields default to hidden / draft / pending; content is published only by an explicit admin action.
- **Money:** `DECIMAL(12,2)`, exact arithmetic on the server, serialised as strings. `BIGINT` ids are serialised as strings.
- **CHECK constraints** listed below are created in the migration SQL (Prisma cannot declare them).

## 1. `roles`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | Primary key; AUTO_INCREMENT |
| `name` | `VARCHAR(100), NOT NULL, UNIQUE` | Website roles only (U5). Seed: `Customer`. `Admin`/`Editor` are not created unless a website feature is approved; they never grant admin-panel access. |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record created |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Last update |
| `deleted_at` | `DATETIME(3), NULL` | Soft delete; blocked while users reference the role |

## 2. `brands`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | Primary key; AUTO_INCREMENT |
| `name` | `VARCHAR(150), NOT NULL, UNIQUE` | Brand name |
| `slug` | `VARCHAR(180), NOT NULL, UNIQUE` | Brand URL |
| `description` | `TEXT, NULL` | Brand details |
| `logo` | `VARCHAR(255), NULL` | Brand logo |
| `status` | `BOOLEAN, NOT NULL, DEFAULT FALSE` | Active/inactive; activated explicitly *(SC-5)* |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record created |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Last update |
| `deleted_at` | `DATETIME(3), NULL` | Soft delete; blocked while active products reference the brand |

Index: `status`.

## 3. `cms_pages`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | AUTO_INCREMENT |
| `page_title` | `VARCHAR(255), NOT NULL` | Page title |
| `page_slug` | `VARCHAR(255), NOT NULL, UNIQUE` | Page URL slug |
| `page_meta_title` | `VARCHAR(255), NULL` | SEO title |
| `page_meta_description` | `TEXT, NULL` | SEO description |
| `status` | `ENUM('draft','published'), NOT NULL, DEFAULT 'draft'` | *(SC-11)* Only published pages appear on the storefront |
| `published_at` | `DATETIME(3), NULL` | *(SC-11)* Set when published |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record create hone ka waqt |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Aakhri update ka waqt |

Hard delete allowed only for draft pages (cascades to sections and fields; testimonials keep `cms_page_id = NULL`).

## 4. `general_settings`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | AUTO_INCREMENT |
| `key` | `VARCHAR(150), NOT NULL, UNIQUE` | Setting identifier; SQL mein quote karein |
| `type` | `VARCHAR(50), NOT NULL` | text, image, boolean, select, currency waghera |
| `value` | `LONGTEXT, NULL` | Setting value; type ke mutabiq validate karein |
| `field_options` | `JSON, NULL` | Field choices/configuration |
| `is_public` | `BOOLEAN, NOT NULL, DEFAULT FALSE` | *(SC-12)* Only public settings are ever read for the storefront, on the server |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record create hone ka waqt |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Aakhri update ka waqt |

Seeded setting *(SC-10)*: `store_currency` (`type = 'currency'`, ISO 4217 code, `is_public = TRUE`, value `USD`).

## 5. `newsletters`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | Primary key; AUTO_INCREMENT |
| `email` | `VARCHAR(255), NOT NULL, UNIQUE` | Email address (stored lower-case) |
| `is_subscribed` | `BOOLEAN, NOT NULL, DEFAULT FALSE` | *(SC-9)* Set TRUE only with recorded consent |
| `subscribed_at` | `DATETIME(3), NULL` | Subscription date |
| `consent_at` | `DATETIME(3), NOT NULL` | *(SC-9)* When consent was given |
| `consent_source` | `VARCHAR(50), NOT NULL` | *(SC-9)* Where consent was given, e.g. `footer_form` |
| `unsubscribed_at` | `DATETIME(3), NULL` | *(SC-9)* Set on unsubscribe (`is_subscribed = FALSE`) |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record created |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Last update |
| `deleted_at` | `DATETIME(3), NULL` | Erasure requests only (address replaced by a hash) |

Index: `(is_subscribed, created_at)`.

## 6. `contact_inquiries`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | Primary key; AUTO_INCREMENT |
| `name` | `VARCHAR(150), NOT NULL` | Customer name |
| `email` | `VARCHAR(255), NOT NULL` | Customer email |
| `phone` | `VARCHAR(30), NULL` | Phone number |
| `subject` | `VARCHAR(255), NULL` | Inquiry subject |
| `message` | `TEXT, NOT NULL` | Customer message |
| `type` | `VARCHAR(50), NOT NULL, DEFAULT 'contact'` | Contact, support, appointment, etc. |
| `extra_data` | `JSON, NULL` | Additional form data |
| `is_read` | `BOOLEAN, NOT NULL, DEFAULT FALSE` | Default FALSE |
| `is_replied` | `BOOLEAN, NOT NULL, DEFAULT FALSE` | Default FALSE |
| `reply_message` | `TEXT, NULL` | Admin reply |
| `replied_at` | `DATETIME(3), NULL` | Reply date |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record created |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Last update |
| `deleted_at` | `DATETIME(3), NULL` | Soft delete |

Indexes: `(is_read, created_at)`, `(type, created_at)`, `email`.

## 7. `tags`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | Primary key; AUTO_INCREMENT |
| `name` | `VARCHAR(100), NOT NULL, UNIQUE` | Tag name |
| `slug` | `VARCHAR(120), NOT NULL, UNIQUE` | Tag URL |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record created |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Last update |
| `deleted_at` | `DATETIME(3), NULL` | Soft delete |

## 8. `coupons`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | AUTO_INCREMENT |
| `code` | `VARCHAR(100), NOT NULL, UNIQUE` | Coupon code (stored upper-case) |
| `type` | `ENUM('fixed','percentage'), NOT NULL` | Discount type (no default; always chosen) |
| `value` | `DECIMAL(12,2), NOT NULL` | Discount value |
| `min_order_amount` | `DECIMAL(12,2), NOT NULL, DEFAULT 0.00` | DEFAULT 0 |
| `max_discount` | `DECIMAL(12,2), NULL` | Discount cap |
| `usage_limit` | `INT UNSIGNED, NULL` | Maximum redemptions |
| `used_count` | `INT UNSIGNED, NOT NULL, DEFAULT 0` | *(SC-6)* Consumed atomically in the checkout transaction |
| `starts_at` | `DATETIME(3), NULL` | Start time |
| `expires_at` | `DATETIME(3), NULL` | Expiry time |
| `status` | `BOOLEAN, NOT NULL, DEFAULT FALSE` | Activated explicitly *(SC-5)* |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record create hone ka waqt |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Aakhri update ka waqt |

Index: `(status, expires_at)`. CHECK: `value > 0`; `type <> 'percentage' OR value <= 100`; `min_order_amount >= 0`; `max_discount IS NULL OR max_discount > 0`; `starts_at IS NULL OR expires_at IS NULL OR expires_at > starts_at`; `usage_limit IS NULL OR used_count <= usage_limit`. Never deleted once used; disable via `status`.

## 9. `customizer_options` *(SC-8)*

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | AUTO_INCREMENT |
| `part` | `ENUM('case','dial','strap'), NOT NULL` | Watch component |
| `option_key` | `VARCHAR(50), NOT NULL` | Value stored in cart/order options; immutable after creation; lower-case letters, digits, hyphen |
| `name` | `VARCHAR(100), NOT NULL` | Display name |
| `image` | `VARCHAR(255), NOT NULL` | Transparent layer image path |
| `sort_order` | `INT, NOT NULL, DEFAULT 0` | Display order |
| `status` | `ENUM('draft','active','inactive'), NOT NULL, DEFAULT 'draft'` | Only active options are offered; never hard-deleted |
| `is_default` | `BOOLEAN, NOT NULL, DEFAULT FALSE` | Exactly one active default per part (enforced in a transaction) |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record created |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Last update |

UNIQUE: `(part, option_key)`. Index: `(part, status, sort_order)`. CHECK: `option_key REGEXP '^[a-z0-9-]{1,50}$'`. Seeded from the existing customizer options with their current ids, names, images, order and defaults. No price column (no option surcharges).

## 10. `categories`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | Primary key; AUTO_INCREMENT |
| `parent_id` | `BIGINT UNSIGNED, NULL, FK` | Parent category, subcategories ke liye; FK → `categories.id` ON DELETE RESTRICT |
| `name` | `VARCHAR(150), NOT NULL` | Category name |
| `slug` | `VARCHAR(180), NOT NULL, UNIQUE` | URL-friendly name |
| `description` | `TEXT, NULL` | Category description |
| `type` | `ENUM('blog', 'product'), NOT NULL` | blog, product (no default; always chosen) |
| `image` | `VARCHAR(255), NULL` | Category image |
| `status` | `BOOLEAN, NOT NULL, DEFAULT FALSE` | Active/inactive; activated explicitly *(SC-5)* |
| `sort_order` | `INT, NOT NULL, DEFAULT 0` | Display order |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record created |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Last update |
| `deleted_at` | `DATETIME(3), NULL` | Soft delete; blocked while it has children, products or blogs |

Indexes: `parent_id`, `(type, status, sort_order)`. The application rejects self-parenting and loops (recursive ancestor check in a transaction), requires the parent's `type` to match, and limits depth to 3.

## 11. `users`

Website customer records. Guest checkouts create passwordless records *(SC-7)*; these cannot sign in. No customer login in this phase.

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | Primary key; AUTO_INCREMENT |
| `role_id` | `BIGINT UNSIGNED, NOT NULL, FK` | References `roles.id`; ON DELETE RESTRICT. Guests get `Customer` |
| `first_name` | `VARCHAR(100), NOT NULL` | First name |
| `last_name` | `VARCHAR(100), NULL` | Last name |
| `name` | `VARCHAR(200), NULL` | Optional full name; duplicate ho sakta hai |
| `phone` | `VARCHAR(30), NULL` | Phone number |
| `email` | `VARCHAR(255), NOT NULL, UNIQUE` | Customer email (stored lower-case) |
| `email_verified_at` | `DATETIME(3), NULL` | Email verification (required before any future account claim) |
| `password` | `VARCHAR(255), NULL` | *(SC-7)* Hashed password only; NULL for guest records |
| `address` | `VARCHAR(255), NULL` | Default address |
| `country` | `VARCHAR(100), NULL` | Country |
| `city` | `VARCHAR(100), NULL` | City |
| `state` | `VARCHAR(100), NULL` | State/province |
| `zip` | `VARCHAR(20), NULL` | Postal code |
| `image` | `VARCHAR(255), NULL` | Profile image |
| `status` | `BOOLEAN, NOT NULL, DEFAULT TRUE` | Account active/inactive (an inactive customer cannot check out) |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record created |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Last update |
| `deleted_at` | `DATETIME(3), NULL` | Soft delete only; customers with orders are never hard-deleted (erasure anonymises) |

`remember_token` removed *(SC-7)*. Indexes: `role_id`, `(status, created_at)`. A guest checkout never overwrites an existing record's profile.

## 12. `products`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | Primary key; AUTO_INCREMENT |
| `category_id` | `BIGINT UNSIGNED, NULL, FK` | References `categories.id` (type product); ON DELETE RESTRICT |
| `brand_id` | `BIGINT UNSIGNED, NULL, FK` | References `brands.id`; ON DELETE RESTRICT |
| `name` | `VARCHAR(255), NOT NULL` | Product name |
| `slug` | `VARCHAR(255), NOT NULL, UNIQUE` | Product URL |
| `sku` | `VARCHAR(100), NOT NULL, UNIQUE` | Stock keeping unit |
| `short_description` | `TEXT, NULL` | Short product details |
| `long_description` | `LONGTEXT, NULL` | Full description |
| `additional_info` | `JSON, NULL` | Material, movement, edition, specifications, etc. |
| `type` | `ENUM('watch','strap','custom'), NOT NULL` | *(SC-3)* watch, strap, custom (no default) |
| `stock` | `INT UNSIGNED, NOT NULL, DEFAULT 0` | *(SC-4)* Available quantity; used only when `track_stock = TRUE` |
| `track_stock` | `BOOLEAN, NOT NULL, DEFAULT FALSE` | *(SC-4)* FALSE = not tracked, never deducted or restored |
| `base_price` | `DECIMAL(12,2), NOT NULL` | Original/base price (no default; no "price on request") |
| `sale_price` | `DECIMAL(12,2), NULL` | Discounted price |
| `main_image` | `VARCHAR(255), NULL` | Primary image (secure upload path) |
| `images` | `JSON, NULL` | Gallery image paths |
| `meta_title` | `VARCHAR(255), NULL` | SEO title |
| `meta_description` | `TEXT, NULL` | SEO description |
| `status` | `ENUM('draft', 'active', 'inactive'), NOT NULL, DEFAULT 'draft'` | draft, active, inactive (inactive = archived) |
| `is_featured` | `BOOLEAN, NOT NULL, DEFAULT FALSE` | Featured product |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record created |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Last update |
| `deleted_at` | `DATETIME(3), NULL` | Soft delete |

Indexes: `(status, type)`, `category_id`, `brand_id`, `(is_featured, status)`. CHECK: `base_price > 0`; `sale_price IS NULL OR (sale_price > 0 AND sale_price <= base_price)`; `stock <= 1000000`. `active` requires a main image and a valid price. A product referenced by any order line cannot be hard-deleted. The custom watch row is created only once its price is confirmed.

## 13. `cms_page_sections`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | AUTO_INCREMENT |
| `cms_page_id` | `BIGINT UNSIGNED, NOT NULL, FK` | `cms_pages.id`; ON DELETE CASCADE |
| `section_name` | `VARCHAR(150), NOT NULL` | Section name |
| `section_type` | `VARCHAR(100), NOT NULL` | hero, text, gallery waghera; allowed values application validate kare (one per storefront section component) |
| `section_sort_order` | `INT UNSIGNED, NOT NULL, DEFAULT 0` | Display order |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record create hone ka waqt |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Aakhri update ka waqt |

Index: `(cms_page_id, section_sort_order)`.

## 14. `testimonials`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | Primary key; AUTO_INCREMENT |
| `cms_page_id` | `BIGINT UNSIGNED, NULL, FK` | FK → `cms_pages.id`; ON DELETE SET NULL; optional page reference |
| `name` | `VARCHAR(150), NOT NULL` | Customer name |
| `designation` | `VARCHAR(150), NULL` | Job title |
| `company` | `VARCHAR(150), NULL` | Company name |
| `message` | `TEXT, NOT NULL` | Testimonial content |
| `image` | `VARCHAR(255), NULL` | Image path |
| `rating` | `TINYINT UNSIGNED, NULL` | *(SC-15)* Rating 1–5 |
| `status` | `ENUM('pending', 'approved', 'rejected'), NOT NULL, DEFAULT 'pending'` | pending, approved, rejected |
| `sort_order` | `INT, NOT NULL, DEFAULT 0` | Display order |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record created |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Last update |
| `deleted_at` | `DATETIME(3), NULL` | Optional soft delete |

Indexes: `(status, sort_order)`, `cms_page_id`. CHECK: `rating IS NULL OR rating BETWEEN 1 AND 5`.

## 15. `user_addresses`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | AUTO_INCREMENT |
| `user_id` | `BIGINT UNSIGNED, NOT NULL, FK` | `users.id`; ON DELETE CASCADE |
| `name` | `VARCHAR(150), NOT NULL` | Recipient name |
| `phone` | `VARCHAR(30), NOT NULL` | Phone number |
| `address_line_1` | `VARCHAR(255), NOT NULL` | Address |
| `address_line_2` | `VARCHAR(255), NULL` | Additional address |
| `city` | `VARCHAR(100), NOT NULL` | City |
| `state` | `VARCHAR(100), NULL` | State/province |
| `country` | `VARCHAR(100), NOT NULL` | Country |
| `zip` | `VARCHAR(20), NULL` | Postal code |
| `is_default` | `BOOLEAN, NOT NULL, DEFAULT FALSE` | One default per user (enforced in a transaction) |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record create hone ka waqt |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Aakhri update ka waqt |

Index: `(user_id, is_default)`. Order addresses are independent snapshots in `orders`.

## 16. `carts`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | Primary key; AUTO_INCREMENT |
| `user_id` | `BIGINT UNSIGNED, NULL, FK` | References `users.id`; ON DELETE SET NULL |
| `session_id` | `VARCHAR(255), NULL` | Guest cart session (SHA-256 of an HttpOnly cookie token, never the raw token) |
| `status` | `ENUM('active', 'converted', 'abandoned'), NOT NULL, DEFAULT 'active'` | active, converted, abandoned |
| `expires_at` | `DATETIME(3), NULL` | Cart expiry |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record created |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Last update |

Indexes: `session_id`, `(user_id, status)`, `(status, expires_at)`. CHECK: `user_id IS NOT NULL OR session_id IS NOT NULL`.

## 17. `orders`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | Primary key; AUTO_INCREMENT |
| `user_id` | `BIGINT UNSIGNED, NULL, FK` | References `users.id`; ON DELETE RESTRICT |
| `order_number` | `VARCHAR(50), NOT NULL, UNIQUE` | Public order number `VAL-` + zero-padded id, set in the checkout transaction |
| `billing_details` | `JSON, NOT NULL` | Billing address snapshot |
| `shipping_details` | `JSON, NOT NULL` | Shipping address snapshot |
| `shipping_method` | `VARCHAR(100), NULL` | Delivery method |
| `shipping_amount` | `DECIMAL(12,2), NOT NULL, DEFAULT 0.00` | Shipping charges |
| `discount` | `DECIMAL(12,2), NOT NULL, DEFAULT 0.00` | Total order-level discount |
| `subtotal` | `DECIMAL(12,2), NOT NULL` | Items subtotal (computed on the server) |
| `tax_amount` | `DECIMAL(12,2), NOT NULL, DEFAULT 0.00` | Tax, if applicable |
| `total` | `DECIMAL(12,2), NOT NULL` | Final payable amount (computed on the server) |
| `currency` | `CHAR(3), NOT NULL` | *(SC-10)* Order currency from setting `store_currency` (no database default) |
| `status` | `ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'), NOT NULL, DEFAULT 'pending'` | Fulfilment status (independent of payment) |
| `payment_status` | `ENUM('pending', 'paid', 'failed', 'refunded'), NOT NULL, DEFAULT 'pending'` | Payment status (independent of fulfilment) |
| `payment_method` | `VARCHAR(100), NULL` | bank_transfer, cash_on_delivery, etc. |
| `payment_reference` | `VARCHAR(255), NULL` | Transaction reference |
| `notes` | `TEXT, NULL` | Internal/customer notes |
| `checkout_token` | `VARCHAR(64), NULL, UNIQUE` | *(SC-6)* One order per checkout attempt |
| `coupon_code` | `VARCHAR(100), NULL` | *(SC-6)* Snapshot of the applied coupon code |
| `coupon_released_at` | `DATETIME(3), NULL` | *(SC-6)* Set once when an unpaid cancelled order gives its coupon use back |
| `placed_at` | `DATETIME(3), NULL` | Order placement date |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record created |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Last update |
| `deleted_at` | `DATETIME(3), NULL` | Kept; never set by the application (orders are cancelled, not deleted) |

Indexes: `(status, created_at)`, `(payment_status, created_at)`, `user_id`, `placed_at`. CHECK: all amounts `>= 0`; `discount <= subtotal`; `total = subtotal - discount + shipping_amount + tax_amount`.

**Fulfilment transitions:** pending → confirmed → processing → shipped → delivered; pending/confirmed/processing → cancelled (before shipment, releasing remaining units); shipping requires `payment_status = 'paid'` or payment method `cash_on_delivery`. **Payment transitions:** pending → paid | failed; failed → pending; paid → refunded only when refunded total = paid total. Payment changes never change fulfilment status, and the reverse.

## 18. `blogs`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | Primary key; AUTO_INCREMENT |
| `category_id` | `BIGINT UNSIGNED, NULL, FK` | Category reference (type blog); ON DELETE RESTRICT |
| `title` | `VARCHAR(255), NOT NULL` | Blog title |
| `slug` | `VARCHAR(255), NOT NULL, UNIQUE` | SEO-friendly URL |
| `description` | `LONGTEXT, NOT NULL` | Blog content (sanitised HTML) |
| `status` | `ENUM('draft', 'published', 'archived'), NOT NULL, DEFAULT 'draft'` | draft, published, archived |
| `featured_image` | `VARCHAR(255), NULL` | Main blog image |
| `images` | `JSON, NULL` | Additional images |
| `meta_title` | `VARCHAR(255), NULL` | SEO title |
| `meta_description` | `TEXT, NULL` | SEO description |
| `meta_keywords` | `TEXT, NULL` | SEO keywords |
| `published_at` | `DATETIME(3), NULL` | Publish date |
| `author_admin_id` | `VARCHAR(64), NULL, FK` | *(SC-13)* Replaces `author_id`; FK → `admin_users.id` (existing Better Auth admin, D1); ON DELETE SET NULL |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record created |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Last update |
| `deleted_at` | `DATETIME(3), NULL` | Soft delete |

Indexes: `(status, published_at)`, `category_id`, `author_admin_id`.

## 19. `cms_page_section_fields`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | AUTO_INCREMENT |
| `cms_page_section_id` | `BIGINT UNSIGNED, NOT NULL, FK` | `cms_page_sections.id`; ON DELETE CASCADE |
| `field_group` | `VARCHAR(100), NOT NULL, DEFAULT ''` | *(SC-14)* Related fields ka group ('' = no group) |
| `field_name` | `VARCHAR(150), NOT NULL` | Field identifier |
| `field_type` | `VARCHAR(50), NOT NULL` | text, textarea, image, select, repeater waghera |
| `field_value` | `LONGTEXT, NULL` | Text, image path ya serialized JSON; field_type ke mutabiq validate karein |
| `field_options` | `JSON, NULL` | Select choices aur field configuration |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record create hone ka waqt |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Aakhri update ka waqt |

UNIQUE: `(cms_page_section_id, field_group, field_name)` *(SC-14)*.

## 20. `blog_tag`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | Primary key; AUTO_INCREMENT |
| `blog_id` | `BIGINT UNSIGNED, NOT NULL, FK` | References `blogs.id`; ON DELETE CASCADE |
| `tag_id` | `BIGINT UNSIGNED, NOT NULL, FK` | References `tags.id`; ON DELETE CASCADE |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record created |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Last update |

UNIQUE: `(blog_id, tag_id)`. Index: `tag_id`.

## 21. `cart_items`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | Primary key; AUTO_INCREMENT |
| `cart_id` | `BIGINT UNSIGNED, NOT NULL, FK` | References `carts.id`; ON DELETE CASCADE |
| `product_id` | `BIGINT UNSIGNED, NOT NULL, FK` | References `products.id`; ON DELETE RESTRICT |
| `quantity` | `INT UNSIGNED, NOT NULL, DEFAULT 1` | Quantity (1–10) |
| `options` | `JSON, NULL` | *(SC-3)* Normalised custom options `{caseId, dialId, strapId}`; NULL for watches/straps |
| `options_hash` | `CHAR(64), NOT NULL, DEFAULT ''` | *(SC-3)* SHA-256 of the normalised options; '' when none |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record created |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Last update |

UNIQUE: `(cart_id, product_id, options_hash)` *(SC-3)*. Index: `product_id`. CHECK: `quantity BETWEEN 1 AND 10`. Prices are never stored in the cart.

## 22. `order_items`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | Primary key; AUTO_INCREMENT |
| `order_id` | `BIGINT UNSIGNED, NOT NULL, FK` | References `orders.id`; ON DELETE RESTRICT |
| `product_id` | `BIGINT UNSIGNED, NULL, FK` | References `products.id`; ON DELETE RESTRICT |
| `product_name` | `VARCHAR(255), NOT NULL` | Order-time name snapshot |
| `sku` | `VARCHAR(100), NULL` | Order-time SKU snapshot |
| `product_image` | `VARCHAR(255), NULL` | Order-time image snapshot |
| `price` | `DECIMAL(12,2), NOT NULL` | Price per unit at purchase |
| `quantity` | `INT UNSIGNED, NOT NULL` | Ordered quantity (1–10) |
| `subtotal` | `DECIMAL(12,2), NOT NULL` | Price × quantity |
| `discount` | `DECIMAL(12,2), NOT NULL, DEFAULT 0.00` | Item discount |
| `total` | `DECIMAL(12,2), NOT NULL` | Final item total |
| `options` | `JSON, NULL` | *(SC-3)* Customization snapshot with keys and names |
| `stock_deducted` | `BOOLEAN, NOT NULL, DEFAULT FALSE` | *(SC-4)* TRUE if this line reduced stock at checkout |
| `released_quantity` | `INT UNSIGNED, NOT NULL, DEFAULT 0` | *(SC-4)* Units cancelled or returned so far; never decreases |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record created |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Last update |

Indexes: `order_id`, `product_id`. CHECK: `quantity BETWEEN 1 AND 10`; `price >= 0`; `subtotal = price * quantity`; `discount BETWEEN 0 AND subtotal`; `total = subtotal - discount`; `released_quantity <= quantity`. Snapshot columns are never updated; the only later write is the guarded `released_quantity` increment.

## 23. `payments`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | AUTO_INCREMENT |
| `order_id` | `BIGINT UNSIGNED, NOT NULL, FK` | `orders.id`; ON DELETE RESTRICT |
| `transaction_id` | `VARCHAR(255), NULL` | Provider/bank transaction reference |
| `payment_method` | `VARCHAR(100), NOT NULL` | bank_transfer, cash_on_delivery, etc. |
| `amount` | `DECIMAL(12,2), NOT NULL` | Payment or refund amount (always positive) |
| `status` | `ENUM('pending','paid','failed','refunded'), NOT NULL, DEFAULT 'pending'` | A refund is a new row with status `refunded` |
| `paid_at` | `DATETIME(3), NULL` | Payment completion time |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record create hone ka waqt |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Aakhri update ka waqt |

UNIQUE: `(payment_method, transaction_id)` *(SC-6)*. Indexes: `order_id`, `(status, created_at)`. CHECK: `amount > 0`. Never deleted; refunded total may not exceed paid total.

## 24. `wishlists`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | AUTO_INCREMENT |
| `user_id` | `BIGINT UNSIGNED, NOT NULL, FK` | `users.id`; ON DELETE CASCADE |
| `product_id` | `BIGINT UNSIGNED, NOT NULL, FK` | `products.id`; ON DELETE CASCADE |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record creation time |

UNIQUE: `(user_id, product_id)`. Index: `product_id`. Requires customer login (not in this phase).

## 25. `product_reviews`

| Column | Data Type | Notes / Constraints |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED, PK` | AUTO_INCREMENT |
| `user_id` | `BIGINT UNSIGNED, NOT NULL, FK` | `users.id`; ON DELETE RESTRICT |
| `product_id` | `BIGINT UNSIGNED, NOT NULL, FK` | `products.id`; ON DELETE RESTRICT |
| `order_id` | `BIGINT UNSIGNED, NOT NULL, FK` | *(SC-16)* `orders.id`; ON DELETE RESTRICT |
| `rating` | `TINYINT UNSIGNED, NOT NULL` | 1 se 5 *(SC-15)* |
| `review` | `TEXT, NULL` | Review text |
| `status` | `ENUM('pending','approved','rejected'), NOT NULL, DEFAULT 'pending'` | Moderated; never auto-published |
| `created_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Record create hone ka waqt |
| `updated_at` | `DATETIME(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP(3)` | Aakhri update ka waqt |

UNIQUE: `(user_id, product_id, order_id)` *(SC-16)*. Index: `(product_id, status)`. CHECK: `rating BETWEEN 1 AND 5`. The server requires the order to belong to the reviewer, be `delivered` and contain the product. Requires customer login (not in this phase).

## Naming and implementation notes
- `create_at`, `delete_at`, `deleted-at` ko `created_at`, `deleted_at` kiya gaya hai. `cms_page_section` ko `cms_page_sections`, `field_option` ko `field_options`, aur `general setting` ko `general_settings` kiya gaya hai.

- `blog_tag(blog_id, tag_id)`, `cart_items(cart_id, product_id, options_hash)` aur `wishlists(user_id, product_id)` par combined UNIQUE constraint rakhein.

- `newsletters.email` UNIQUE rakhein. `cms_page_sections(cms_page_id, section_sort_order)` par index rakhein. Foreign keys aur frequently filtered columns par zaroorat ke mutabiq indexes banayein.

- Product category ka type product aur blog category ka type blog application mein validate karein; category parent ka type bhi match hona chahiye.

- Money values non-negative; quantity positive; stock non-negative; ratings 1–5; percentage coupon 0–100 validate karein. Sale price base price se zyada na ho.

- `order_items.subtotal = price × quantity`; `order_items.total = subtotal − discount`; `orders.subtotal = SUM(order_items.total)`; `orders.total = subtotal − discount + shipping_amount + tax_amount`. Order-level discount item discounts se alag ho taake double deduction na ho.

- Product name, SKU, image, price aur options order-time snapshots hain. Price aur stock checkout par server se verify karein; inventory transaction ke andar update karein.

- **Stock (SC-4):** tracked products are deducted with `UPDATE products SET stock = stock - :q WHERE id = :p AND track_stock = TRUE AND stock >= :q` (must affect one row); untracked products are never updated. Cancellations and returns increment `order_items.released_quantity` with a guard on the expected current value and `released_quantity + :q <= quantity`; stock is added back only for tracked products (cancellation: if the line was deducted; return: if restocked). Lock order everywhere: order → coupon → products (ascending id) → order items → payments.

- **Checkout (SC-6):** one transaction per checkout; a repeated `checkout_token` returns the existing order; the coupon use is consumed with a conditional `UPDATE` in the same transaction; manual payment confirmations are guarded by `status = 'pending'` and the unique `(payment_method, transaction_id)`.

- Product delete hone par historical order item ko preserve karein: products referenced by orders cannot be hard-deleted (ON DELETE RESTRICT); use `inactive` or soft delete. Orders ko cancel karein, delete nahi.

- CMS page delete par section/fields cascade sirf permanent delete ke liye; testimonials.cms_page_id reference ON DELETE SET NULL. Other FK rules are stated per table.

- Images ke paths/URLs store karein (secure uploads, validated type/size/dimensions, orphan clean-up). Password hashed ho (customer passwords are NULL in this phase). `name` optional duplicate field hai; first_name/last_name se derive karna behtar hai.

- Custom watch combinations: `products.type = 'custom'`, options validated against active `customizer_options` and stored in `cart_items.options` / `order_items.options`. Independently priced/stocked size/color variants are still out of scope.

- `testimonials.cms_page_id` references `cms_pages.id`. Create `cms_pages` before `testimonials`.

- `categories.parent_id` same table ko reference karta hai; parent row ko child row se pehle insert karein aur category cycles reject karein.

## Change log

| Revision | Date | Change |
| --- | --- | --- |
| 1 | — | Original approved schema (24 tables) |
| 2 | 2026-10-21 | SC-2 `DATETIME(3)`; SC-3 custom watch options; SC-4 stock tracking and released quantities; SC-5 nullability, defaults, keys, indexes, CHECKs and delete rules; SC-6 checkout token, coupon snapshot/usage, payment uniqueness; SC-7 passwordless guest customers, `remember_token` removed; SC-8 `customizer_options` table; SC-9 newsletter consent; SC-10 order currency; SC-11 CMS page status; SC-12 public settings; SC-13 blog author → `admin_users`; SC-14 unique section fields; SC-15 rating range; SC-16 review per purchase; U4 independent fulfilment/payment states; U5 website roles separate from admin RBAC |
