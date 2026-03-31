-- ============================================================
-- Restaurant Management System — Database Schema
-- Engine: PostgreSQL
-- Run this file once to set up all tables.
-- ============================================================


-- ------------------------------------------------------------
-- USERS
-- Roles: admin | manager | cashier | kitchen
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL       PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  username    VARCHAR(50)  NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,            -- bcrypt hash
  role        VARCHAR(20)  NOT NULL CHECK (role IN ('admin', 'manager', 'cashier', 'kitchen', 'waiter')),
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- TABLES
-- Physical dining tables in the restaurant
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tables (
  id        SERIAL      PRIMARY KEY,
  name      VARCHAR(50) NOT NULL,
  capacity  INTEGER     NOT NULL DEFAULT 4,
  status    VARCHAR(20) NOT NULL DEFAULT 'available'
            CHECK (status IN ('available', 'occupied', 'reserved')),
  is_active BOOLEAN     NOT NULL DEFAULT TRUE
);


-- ------------------------------------------------------------
-- CATEGORIES
-- Groups products into sections e.g. Burgers, Drinks, Sides
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL       PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE
);


-- ------------------------------------------------------------
-- NOTE: If you already ran schema.sql before the slug column was added, run:
--   ALTER TABLE products ADD COLUMN IF NOT EXISTS slug VARCHAR(150) UNIQUE;
-- ------------------------------------------------------------


-- ------------------------------------------------------------
-- PRODUCTS
-- type:
--   simple  — single price, no variants
--   variant — price lives on product_variants, base_price is NULL
--   combo   — fixed price, made up of other products via combo_items
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id           SERIAL        PRIMARY KEY,
  category_id  INTEGER       REFERENCES categories(id) ON DELETE SET NULL,
  name         VARCHAR(150)  NOT NULL,
  description  TEXT,
  type         VARCHAR(20)   NOT NULL CHECK (type IN ('simple', 'variant', 'combo')),
  base_price   NUMERIC(10,2),                  -- NULL for variant type
  image_url    VARCHAR(255) NOT NULL,
  slug         VARCHAR(150)  UNIQUE,
  is_available    BOOLEAN       NOT NULL DEFAULT TRUE,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  is_kitchen_item BOOLEAN       NOT NULL DEFAULT TRUE,  -- FALSE = no kitchen prep needed (e.g. bottled drinks)
  sort_order      INTEGER       NOT NULL DEFAULT 0,
  created_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- PRODUCT VARIANTS
-- Used when product type = 'variant'
-- e.g. Milkshake → Small / Medium / Large, each with its own price
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
  id           SERIAL        PRIMARY KEY,
  product_id   INTEGER       NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name         VARCHAR(100)  NOT NULL,         -- e.g. "Large"
  price        NUMERIC(10,2) NOT NULL,
  is_available BOOLEAN       NOT NULL DEFAULT TRUE,
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
  sort_order   INTEGER       NOT NULL DEFAULT 0
);


-- ------------------------------------------------------------
-- ADDON GROUPS
-- A named group of add-on choices, e.g. "Extras", "Sauces"
-- Can be reused across multiple products.
-- min_select / max_select control how many items the customer must/can pick.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS addon_groups (
  id          SERIAL       PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,           -- e.g. "Extras"
  min_select  INTEGER      NOT NULL DEFAULT 0, -- 0 = optional
  max_select  INTEGER      NOT NULL DEFAULT 1, -- 1 = pick one, 0 = unlimited
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE
);


-- ------------------------------------------------------------
-- ADDON ITEMS
-- Individual choices inside an addon group
-- e.g. Group "Extras" → items: Extra Cheese, Bacon, Jalapeños
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS addon_items (
  id             SERIAL        PRIMARY KEY,
  addon_group_id INTEGER       NOT NULL REFERENCES addon_groups(id) ON DELETE CASCADE,
  name           VARCHAR(100)  NOT NULL,
  price          NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  is_available   BOOLEAN       NOT NULL DEFAULT TRUE,
  sort_order     INTEGER       NOT NULL DEFAULT 0
);


-- ------------------------------------------------------------
-- PRODUCT → ADDON GROUP MAPPING
-- Which addon groups are available for which products.
-- A group can be linked to many products (reusable).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_addon_groups (
  product_id     INTEGER NOT NULL REFERENCES products(id)     ON DELETE CASCADE,
  addon_group_id INTEGER NOT NULL REFERENCES addon_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, addon_group_id)
);


-- ------------------------------------------------------------
-- COMBO-ONLY ITEMS
-- Internal items that exist only inside combos/deals.
-- They are NOT products and do NOT appear on the POS menu.
-- Examples: "8 Piece Chicken", "4 Naan", "2 Raita"
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS combo_only_items (
  id         SERIAL       PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  sort_order INTEGER      NOT NULL DEFAULT 0
);


-- ------------------------------------------------------------
-- COMBO ITEMS
-- Defines what is included in a combo/deal product.
-- Each row is either a menu product/variant OR a combo-only item.
-- Only used when product type = 'combo'.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS combo_items (
  id                 SERIAL  PRIMARY KEY,
  combo_id           INTEGER NOT NULL REFERENCES products(id)         ON DELETE CASCADE,
  product_id         INTEGER          REFERENCES products(id)         ON DELETE CASCADE,  -- set when adding a menu product
  variant_id         INTEGER          REFERENCES product_variants(id) ON DELETE SET NULL, -- set when the product is variant-type
  combo_only_item_id INTEGER          REFERENCES combo_only_items(id) ON DELETE CASCADE,  -- set when adding a combo-only item
  quantity           INTEGER NOT NULL DEFAULT 1
  -- exactly one of (product_id, combo_only_item_id) must be non-null
);


-- ------------------------------------------------------------
-- ORDERS
-- type:   dine-in | takeaway
-- status: pending → preparing → ready → completed | cancelled
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id           SERIAL        PRIMARY KEY,
  order_number VARCHAR(20)   NOT NULL UNIQUE,  -- e.g. ORD-0001
  type         VARCHAR(20)   NOT NULL CHECK (type IN ('dine-in', 'takeaway', 'delivery')),
  status       VARCHAR(20)   NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  table_number VARCHAR(20),                    -- dine-in only
  customer_name VARCHAR(100),                  -- optional, useful for takeaway
  notes        TEXT,
  subtotal     NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  discount     NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  tax          NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total        NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  table_id      INTEGER       REFERENCES tables(id) ON DELETE SET NULL,
  waiter_id     INTEGER       REFERENCES users(id)  ON DELETE SET NULL,
  customer_phone   VARCHAR(20),
  customer_address TEXT,
  created_by   INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP     NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- ORDER ITEMS
-- One row per product line in an order.
-- Stores a name/price snapshot so the record stays accurate
-- even if the menu is edited later.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id                 SERIAL        PRIMARY KEY,
  order_id           INTEGER       NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id         INTEGER       REFERENCES products(id)         ON DELETE SET NULL,
  product_variant_id INTEGER       REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name       VARCHAR(150)  NOT NULL,   -- snapshot
  variant_name       VARCHAR(100),             -- snapshot, NULL for simple products
  unit_price         NUMERIC(10,2) NOT NULL,
  quantity           INTEGER       NOT NULL DEFAULT 1,
  line_total         NUMERIC(10,2) NOT NULL,   -- unit_price * quantity (before addons)
  is_kitchen_item    BOOLEAN       NOT NULL DEFAULT TRUE,  -- snapshot from product at time of order
  notes              TEXT
);


-- ------------------------------------------------------------
-- ORDER ITEM ADDONS
-- Add-on choices selected for a specific order item line.
-- Stores a name/price snapshot for the same reason as above.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_item_addons (
  id             SERIAL        PRIMARY KEY,
  order_item_id  INTEGER       NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  addon_item_id  INTEGER       REFERENCES addon_items(id) ON DELETE SET NULL,
  addon_name     VARCHAR(100)  NOT NULL,        -- snapshot
  price          NUMERIC(10,2) NOT NULL
);


-- ------------------------------------------------------------
-- PAYMENTS
-- method: cash | card
-- status: paid | refunded
-- One order can only have one payment record.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id         SERIAL        PRIMARY KEY,
  order_id   INTEGER       NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  method     VARCHAR(20)   NOT NULL CHECK (method IN ('cash', 'card')),
  amount     NUMERIC(10,2) NOT NULL,
  change_due NUMERIC(10,2) NOT NULL DEFAULT 0.00,  -- for cash payments
  status     VARCHAR(20)   NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'refunded')),
  reference  VARCHAR(100),                         -- card terminal reference / receipt no.
  paid_by    INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  paid_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- SETTINGS
-- Simple key-value store for restaurant-wide config.
-- e.g. restaurant_name, currency, tax_rate
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT         NOT NULL,
  updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);
