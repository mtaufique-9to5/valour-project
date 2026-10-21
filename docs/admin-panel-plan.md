# Admin Panel & CMS — implementation plan (after cutover)

Goal: a fully database-driven Admin Panel and CMS on the approved schema (rev. 2), while the storefront keeps its design, URLs, animations, responsiveness, cart and customizer behaviour.

## Ground rules for every module

- Server-side only: page guard `requirePagePermission`, server actions / route handlers re-check the permission, validate with zod, write in one transaction with `recordAudit`.
- Reuse the existing admin shell, components (DataTable, FormField, Modal, ImageManager, Tabs, Toasts) and styles; no new dependencies without asking.
- Soft delete where the schema has `deleted_at`; history (orders, items, payments) is never deleted.
- Everything new starts hidden / draft / pending; publishing is an explicit action.
- Each module: unit tests (level 1) + a manual QA list; delivered one module at a time with your review.

## Permissions

The existing 17 keys cover products, inventory, prices, orders, customers, content, settings, roles and audit. New keys needed (a seed-rbac change, **needs your approval** before seeding):

| Key | For | Default roles |
|---|---|---|
| `category.manage` | categories, brands | SUPER_ADMIN, ADMIN, PRODUCT_MANAGER |
| `customizer.manage` | customizer options | SUPER_ADMIN, ADMIN, PRODUCT_MANAGER |
| `coupon.manage` | coupons | SUPER_ADMIN, ADMIN |
| `payment.manage` | confirm payments, refunds | SUPER_ADMIN, ADMIN |
| `blog.manage` | blogs, tags | SUPER_ADMIN, ADMIN, CONTENT_MANAGER |
| `review.moderate` | reviews, testimonials | SUPER_ADMIN, ADMIN, CONTENT_MANAGER |
| `inbox.view` | newsletter, contact inquiries | SUPER_ADMIN, ADMIN |

## Phases

| # | Module | Scope | Builds on |
|---|---|---|---|
| 1 | **Products & straps** | List (filters: type, status, featured, deleted), create, edit, SKU/slug rules, status draft/active/inactive, soft delete / restore. Watches and Straps pages switch from `catalog.js` to the DB. | `catalog-v2/services/products.js` |
| 2 | **Images & galleries** | Upload (existing secure pipeline), main image, reorder, remove; orphan clean-up switched to `referencedStorageKeys()`. | `services/images.js`, staged route |
| 3 | **Pricing & inventory** | Base/sale price editor with audit; stock tracking toggle and optimistic stock edits; low-stock view. No "price on request". | `setPrices`, `setInventory` |
| 4 | **Categories & brands** | Tree editor (max depth 3, type match, no loops), activation, soft delete rules. | `services/taxonomy.js` |
| 5 | **Customizer options** | Per part (case/dial/strap): create, rename, image, order, activate/deactivate, one default per part; `option_key` immutable. | SC-8 |
| 6 | **Orders, payments, customers** | Order list/detail, fulfilment transitions, cancel with stock + coupon release, bank-transfer confirmation, refunds; customer list/detail (guest records, no login). | `commerce/services/*` |
| 7 | **Coupons** | CRUD, activation, usage display; codes immutable once used. | `coupon-rules.js` |
| 8 | **Settings** | `general_settings` editor by type, `is_public` flag; store currency, bank-transfer details, COD on/off. | SC-10, SC-12 |
| 9 | **CMS pages & sections** | Pages (draft/published), sections and fields editor with ordering; preview. | SC-11, SC-14 |
| 10 | **Blog** | Posts (draft/published, author = admin), blog categories, tags. | SC-13 |
| 11 | **Testimonials & reviews** | Testimonial CRUD + publish; review moderation queue (pending/approved/rejected). | SC-15, SC-16 |
| 12 | **Newsletter & contact** | Subscriber list with consent/unsubscribe data, CSV export (permission-gated); contact inbox with status. | SC-9 |
| 13 | **Admin users & roles** | Invite, suspend, role assignment, MFA reset; role-permission matrix editor; SUPER_ADMIN protections kept. | existing policy |
| 14 | **Storefront connection** | Shop, product and strap pages, cart pricing, checkout (bank transfer) and customizer read from the DB with the same markup, URLs and behaviour; `catalog.js` retired last. Needs the decision on presentation fields (see below). | all above |

Phases 1–3 come first because the admin's product screens are the main loss after cutover; 6 must land before the storefront checkout (14).

## Decisions needed from you before the phases that use them

1. New permission keys and their default roles (table above).
2. Storefront presentation fields (accent colour, secondary images, specs, description fragments): keep in `products.additional_info` (current plan), or propose schema columns via the SC process.
3. Whether seeded products should be published (set `active`) once reviewed in the admin, or stay draft until the storefront phase.
4. Bank-transfer instructions text and whether cash on delivery is offered.
