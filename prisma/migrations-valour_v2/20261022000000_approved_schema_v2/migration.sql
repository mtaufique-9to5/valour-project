-- DRAFT — NOT EXECUTED. Hand-written replacement migration for Ordered_Ecommerce_CMS_Schema.md rev. 2.
-- Lives in prisma/drafts/ on purpose: `prisma migrate deploy` does not read this folder.
-- Do NOT use the auto-generated `prisma migrate diff` output: it would DROP the admin permission tables
-- (losing 17 permissions / 51 links) and ALTER the old roles/products/orders tables in place.
--
-- Preconditions (each verified and approved separately before running):
--   * MariaDB running; live structure re-verified (26 tables, 3 migrations, no drift).
--   * Every table in section 2 has exactly 0 rows (checked immediately before; abort otherwise).
--   * Verified backup of valour_v2 (dump + SHA-256 + row counts).
--   * Explicit approval of SC-1 rename (section 1) and of the destructive drop (section 2).
-- MariaDB commits DDL implicitly, so this cannot run as one transaction; rollback = restore the backup.

-- ─── 1. SC-1: rename admin RBAC tables (no rows touched; FKs follow automatically) ───
RENAME TABLE `roles` TO `admin_roles`,
             `permissions` TO `admin_permissions`,
             `role_permissions` TO `admin_role_permissions`;

-- ─── 2. Drop the obsolete, EMPTY e-commerce tables (children before parents) ───
DROP TABLE `order_items`;
DROP TABLE `inventory_adjustments`;
DROP TABLE `inventory`;
DROP TABLE `price_changes`;
DROP TABLE `prices`;
DROP TABLE `product_images`;
DROP TABLE `product_contents`;
DROP TABLE `orders`;
DROP TABLE `customers`;
DROP TABLE `products`;
DROP TABLE `collections`;
DROP TABLE `order_sequences`;
DROP TABLE `customizer_options`;
DROP TABLE `admin_settings`;

-- ─── 3. Create the approved tables in dependency order ───
-- CreateTable
CREATE TABLE `roles` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `brands` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `slug` VARCHAR(180) NOT NULL,
    `description` TEXT NULL,
    `logo` VARCHAR(255) NULL,
    `status` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `brands_name_key`(`name`),
    UNIQUE INDEX `brands_slug_key`(`slug`),
    INDEX `brands_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_pages` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `page_title` VARCHAR(255) NOT NULL,
    `page_slug` VARCHAR(255) NOT NULL,
    `page_meta_title` VARCHAR(255) NULL,
    `page_meta_description` TEXT NULL,
    `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `cms_pages_page_slug_key`(`page_slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `general_settings` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(150) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `value` LONGTEXT NULL,
    `field_options` JSON NULL,
    `is_public` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `general_settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `newsletters` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `is_subscribed` BOOLEAN NOT NULL DEFAULT false,
    `subscribed_at` DATETIME(3) NULL,
    `consent_at` DATETIME(3) NOT NULL,
    `consent_source` VARCHAR(50) NOT NULL,
    `unsubscribed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `newsletters_email_key`(`email`),
    INDEX `newsletters_is_subscribed_created_at_idx`(`is_subscribed`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contact_inquiries` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `subject` VARCHAR(255) NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(50) NOT NULL DEFAULT 'contact',
    `extra_data` JSON NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `is_replied` BOOLEAN NOT NULL DEFAULT false,
    `reply_message` TEXT NULL,
    `replied_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    INDEX `contact_inquiries_is_read_created_at_idx`(`is_read`, `created_at`),
    INDEX `contact_inquiries_type_created_at_idx`(`type`, `created_at`),
    INDEX `contact_inquiries_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tags` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `tags_name_key`(`name`),
    UNIQUE INDEX `tags_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupons` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(100) NOT NULL,
    `type` ENUM('fixed', 'percentage') NOT NULL,
    `value` DECIMAL(12, 2) NOT NULL,
    `min_order_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `max_discount` DECIMAL(12, 2) NULL,
    `usage_limit` INTEGER UNSIGNED NULL,
    `used_count` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `starts_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NULL,
    `status` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `coupons_code_key`(`code`),
    INDEX `coupons_status_expires_at_idx`(`status`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customizer_options` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `part` ENUM('case', 'dial', 'strap') NOT NULL,
    `option_key` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `image` VARCHAR(255) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('draft', 'active', 'inactive') NOT NULL DEFAULT 'draft',
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `customizer_options_part_status_sort_order_idx`(`part`, `status`, `sort_order`),
    UNIQUE INDEX `customizer_options_part_option_key_key`(`part`, `option_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `parent_id` BIGINT UNSIGNED NULL,
    `name` VARCHAR(150) NOT NULL,
    `slug` VARCHAR(180) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('blog', 'product') NOT NULL,
    `image` VARCHAR(255) NULL,
    `status` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `categories_slug_key`(`slug`),
    INDEX `categories_parent_id_idx`(`parent_id`),
    INDEX `categories_type_status_sort_order_idx`(`type`, `status`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `role_id` BIGINT UNSIGNED NOT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NULL,
    `name` VARCHAR(200) NULL,
    `phone` VARCHAR(30) NULL,
    `email` VARCHAR(255) NOT NULL,
    `email_verified_at` DATETIME(3) NULL,
    `password` VARCHAR(255) NULL,
    `address` VARCHAR(255) NULL,
    `country` VARCHAR(100) NULL,
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `zip` VARCHAR(20) NULL,
    `image` VARCHAR(255) NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_role_id_idx`(`role_id`),
    INDEX `users_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `category_id` BIGINT UNSIGNED NULL,
    `brand_id` BIGINT UNSIGNED NULL,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `sku` VARCHAR(100) NOT NULL,
    `short_description` TEXT NULL,
    `long_description` LONGTEXT NULL,
    `additional_info` JSON NULL,
    `type` ENUM('watch', 'strap', 'custom') NOT NULL,
    `stock` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `track_stock` BOOLEAN NOT NULL DEFAULT false,
    `base_price` DECIMAL(12, 2) NOT NULL,
    `sale_price` DECIMAL(12, 2) NULL,
    `main_image` VARCHAR(255) NULL,
    `images` JSON NULL,
    `meta_title` VARCHAR(255) NULL,
    `meta_description` TEXT NULL,
    `status` ENUM('draft', 'active', 'inactive') NOT NULL DEFAULT 'draft',
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `products_slug_key`(`slug`),
    UNIQUE INDEX `products_sku_key`(`sku`),
    INDEX `products_status_type_idx`(`status`, `type`),
    INDEX `products_category_id_idx`(`category_id`),
    INDEX `products_brand_id_idx`(`brand_id`),
    INDEX `products_is_featured_status_idx`(`is_featured`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_page_sections` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cms_page_id` BIGINT UNSIGNED NOT NULL,
    `section_name` VARCHAR(150) NOT NULL,
    `section_type` VARCHAR(100) NOT NULL,
    `section_sort_order` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cms_page_sections_cms_page_id_section_sort_order_idx`(`cms_page_id`, `section_sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `testimonials` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cms_page_id` BIGINT UNSIGNED NULL,
    `name` VARCHAR(150) NOT NULL,
    `designation` VARCHAR(150) NULL,
    `company` VARCHAR(150) NULL,
    `message` TEXT NOT NULL,
    `image` VARCHAR(255) NULL,
    `rating` TINYINT UNSIGNED NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    INDEX `testimonials_status_sort_order_idx`(`status`, `sort_order`),
    INDEX `testimonials_cms_page_id_idx`(`cms_page_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_addresses` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `address_line_1` VARCHAR(255) NOT NULL,
    `address_line_2` VARCHAR(255) NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NULL,
    `country` VARCHAR(100) NOT NULL,
    `zip` VARCHAR(20) NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_addresses_user_id_is_default_idx`(`user_id`, `is_default`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `carts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NULL,
    `session_id` VARCHAR(255) NULL,
    `status` ENUM('active', 'converted', 'abandoned') NOT NULL DEFAULT 'active',
    `expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `carts_session_id_idx`(`session_id`),
    INDEX `carts_user_id_status_idx`(`user_id`, `status`),
    INDEX `carts_status_expires_at_idx`(`status`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NULL,
    `order_number` VARCHAR(50) NOT NULL,
    `billing_details` JSON NOT NULL,
    `shipping_details` JSON NOT NULL,
    `shipping_method` VARCHAR(100) NULL,
    `shipping_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `tax_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(12, 2) NOT NULL,
    `currency` CHAR(3) NOT NULL,
    `status` ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
    `payment_status` ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    `payment_method` VARCHAR(100) NULL,
    `payment_reference` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `checkout_token` VARCHAR(64) NULL,
    `coupon_code` VARCHAR(100) NULL,
    `coupon_released_at` DATETIME(3) NULL,
    `placed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `orders_order_number_key`(`order_number`),
    UNIQUE INDEX `orders_checkout_token_key`(`checkout_token`),
    INDEX `orders_status_created_at_idx`(`status`, `created_at`),
    INDEX `orders_payment_status_created_at_idx`(`payment_status`, `created_at`),
    INDEX `orders_user_id_idx`(`user_id`),
    INDEX `orders_placed_at_idx`(`placed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blogs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `category_id` BIGINT UNSIGNED NULL,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NOT NULL,
    `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `featured_image` VARCHAR(255) NULL,
    `images` JSON NULL,
    `meta_title` VARCHAR(255) NULL,
    `meta_description` TEXT NULL,
    `meta_keywords` TEXT NULL,
    `published_at` DATETIME(3) NULL,
    `author_admin_id` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `blogs_slug_key`(`slug`),
    INDEX `blogs_status_published_at_idx`(`status`, `published_at`),
    INDEX `blogs_category_id_idx`(`category_id`),
    INDEX `blogs_author_admin_id_idx`(`author_admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_page_section_fields` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cms_page_section_id` BIGINT UNSIGNED NOT NULL,
    `field_group` VARCHAR(100) NOT NULL DEFAULT '',
    `field_name` VARCHAR(150) NOT NULL,
    `field_type` VARCHAR(50) NOT NULL,
    `field_value` LONGTEXT NULL,
    `field_options` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `cms_page_section_fields_cms_page_section_id_field_group_fiel_key`(`cms_page_section_id`, `field_group`, `field_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blog_tag` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `blog_id` BIGINT UNSIGNED NOT NULL,
    `tag_id` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `blog_tag_tag_id_idx`(`tag_id`),
    UNIQUE INDEX `blog_tag_blog_id_tag_id_key`(`blog_id`, `tag_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cart_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cart_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `quantity` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `options` JSON NULL,
    `options_hash` CHAR(64) NOT NULL DEFAULT '',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cart_items_product_id_idx`(`product_id`),
    UNIQUE INDEX `cart_items_cart_id_product_id_options_hash_key`(`cart_id`, `product_id`, `options_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NULL,
    `product_name` VARCHAR(255) NOT NULL,
    `sku` VARCHAR(100) NULL,
    `product_image` VARCHAR(255) NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `quantity` INTEGER UNSIGNED NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(12, 2) NOT NULL,
    `options` JSON NULL,
    `stock_deducted` BOOLEAN NOT NULL DEFAULT false,
    `released_quantity` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_items_order_id_idx`(`order_id`),
    INDEX `order_items_product_id_idx`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT UNSIGNED NOT NULL,
    `transaction_id` VARCHAR(255) NULL,
    `payment_method` VARCHAR(100) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payments_order_id_idx`(`order_id`),
    INDEX `payments_status_created_at_idx`(`status`, `created_at`),
    UNIQUE INDEX `payments_payment_method_transaction_id_key`(`payment_method`, `transaction_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wishlists` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `wishlists_product_id_idx`(`product_id`),
    UNIQUE INDEX `wishlists_user_id_product_id_key`(`user_id`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_reviews` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `order_id` BIGINT UNSIGNED NOT NULL,
    `rating` TINYINT UNSIGNED NOT NULL,
    `review` TEXT NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_reviews_product_id_status_idx`(`product_id`, `status`),
    UNIQUE INDEX `product_reviews_user_id_product_id_order_id_key`(`user_id`, `product_id`, `order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── 4. Foreign keys ───
ALTER TABLE `categories` ADD CONSTRAINT `categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `products` ADD CONSTRAINT `products_brand_id_fkey` FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cms_page_sections` ADD CONSTRAINT `cms_page_sections_cms_page_id_fkey` FOREIGN KEY (`cms_page_id`) REFERENCES `cms_pages`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `testimonials` ADD CONSTRAINT `testimonials_cms_page_id_fkey` FOREIGN KEY (`cms_page_id`) REFERENCES `cms_pages`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `user_addresses` ADD CONSTRAINT `user_addresses_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `carts` ADD CONSTRAINT `carts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `blogs` ADD CONSTRAINT `blogs_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `blogs` ADD CONSTRAINT `blogs_author_admin_id_fkey` FOREIGN KEY (`author_admin_id`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cms_page_section_fields` ADD CONSTRAINT `cms_page_section_fields_cms_page_section_id_fkey` FOREIGN KEY (`cms_page_section_id`) REFERENCES `cms_page_sections`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `blog_tag` ADD CONSTRAINT `blog_tag_blog_id_fkey` FOREIGN KEY (`blog_id`) REFERENCES `blogs`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `blog_tag` ADD CONSTRAINT `blog_tag_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_cart_id_fkey` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- ─── 5. CHECK constraints (Ordered_Ecommerce_CMS_Schema.md rev. 2; Prisma cannot declare these) ───
ALTER TABLE `coupons`
  ADD CONSTRAINT `coupons_value_chk`            CHECK (`value` > 0),
  ADD CONSTRAINT `coupons_percentage_chk`       CHECK (`type` <> 'percentage' OR `value` <= 100),
  ADD CONSTRAINT `coupons_min_order_chk`        CHECK (`min_order_amount` >= 0),
  ADD CONSTRAINT `coupons_max_discount_chk`     CHECK (`max_discount` IS NULL OR `max_discount` > 0),
  ADD CONSTRAINT `coupons_dates_chk`            CHECK (`starts_at` IS NULL OR `expires_at` IS NULL OR `expires_at` > `starts_at`),
  ADD CONSTRAINT `coupons_usage_chk`            CHECK (`usage_limit` IS NULL OR `used_count` <= `usage_limit`);

ALTER TABLE `customizer_options`
  ADD CONSTRAINT `customizer_options_key_format_chk` CHECK (`option_key` REGEXP '^[a-z0-9-]{1,50}$');

ALTER TABLE `products`
  ADD CONSTRAINT `products_base_price_chk`      CHECK (`base_price` > 0),
  ADD CONSTRAINT `products_sale_price_chk`      CHECK (`sale_price` IS NULL OR (`sale_price` > 0 AND `sale_price` <= `base_price`)),
  ADD CONSTRAINT `products_stock_max_chk`       CHECK (`stock` <= 1000000);

ALTER TABLE `testimonials`
  ADD CONSTRAINT `testimonials_rating_chk`      CHECK (`rating` IS NULL OR `rating` BETWEEN 1 AND 5);

ALTER TABLE `carts`
  ADD CONSTRAINT `carts_owner_chk`              CHECK (`user_id` IS NOT NULL OR `session_id` IS NOT NULL);

ALTER TABLE `orders`
  ADD CONSTRAINT `orders_amounts_chk`           CHECK (`shipping_amount` >= 0 AND `discount` >= 0 AND `subtotal` >= 0 AND `tax_amount` >= 0 AND `total` >= 0),
  ADD CONSTRAINT `orders_discount_chk`          CHECK (`discount` <= `subtotal`),
  ADD CONSTRAINT `orders_total_chk`             CHECK (`total` = `subtotal` - `discount` + `shipping_amount` + `tax_amount`);

ALTER TABLE `cart_items`
  ADD CONSTRAINT `cart_items_quantity_chk`      CHECK (`quantity` BETWEEN 1 AND 10);

ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_quantity_chk`     CHECK (`quantity` BETWEEN 1 AND 10),
  ADD CONSTRAINT `order_items_price_chk`        CHECK (`price` >= 0),
  ADD CONSTRAINT `order_items_subtotal_chk`     CHECK (`subtotal` = `price` * `quantity`),
  ADD CONSTRAINT `order_items_discount_chk`     CHECK (`discount` >= 0 AND `discount` <= `subtotal`),
  ADD CONSTRAINT `order_items_total_chk`        CHECK (`total` = `subtotal` - `discount`),
  ADD CONSTRAINT `order_items_released_qty_chk` CHECK (`released_quantity` <= `quantity`);

ALTER TABLE `payments`
  ADD CONSTRAINT `payments_amount_chk`          CHECK (`amount` > 0);

ALTER TABLE `product_reviews`
  ADD CONSTRAINT `product_reviews_rating_chk`   CHECK (`rating` BETWEEN 1 AND 5);
