-- ============================================================
-- Restaurant Management System — Seed Data
-- Run this file AFTER schema.sql.
-- All user passwords are: password123
-- ============================================================


-- ------------------------------------------------------------
-- SETTINGS
-- ------------------------------------------------------------
INSERT INTO settings (key, value) VALUES
  ('restaurant_name',  'My Restaurant'),
  ('address',          '123 Main Street, City'),
  ('phone',            '+1 234 567 890'),
  ('currency_symbol',  '$'),
  ('receipt_footer',   'Thank you for your order!'),
  ('currency',         'USD'),
  ('tax_rate',         '0.00'),
  ('tax_label',        'Tax')
ON CONFLICT (key) DO NOTHING;


-- ------------------------------------------------------------
-- USERS
-- Password for all: password123
-- bcrypt hash (cost 10): $2b$10$EjSzLslE1GFxRlaXhDSJDOz6oPK4XeJwBzH/R7wiUF1XbzpB5QYS6
-- ------------------------------------------------------------
INSERT INTO users (name, username, password, role) VALUES
  ('Super Admin',   'admin',   '$2b$10$EjSzLslE1GFxRlaXhDSJDOz6oPK4XeJwBzH/R7wiUF1XbzpB5QYS6', 'admin'),
  ('Manager One',   'manager', '$2b$10$EjSzLslE1GFxRlaXhDSJDOz6oPK4XeJwBzH/R7wiUF1XbzpB5QYS6', 'manager'),
  ('Cashier One',   'cashier', '$2b$10$EjSzLslE1GFxRlaXhDSJDOz6oPK4XeJwBzH/R7wiUF1XbzpB5QYS6', 'cashier'),
  ('Kitchen Staff', 'kitchen', '$2b$10$EjSzLslE1GFxRlaXhDSJDOz6oPK4XeJwBzH/R7wiUF1XbzpB5QYS6', 'kitchen')
ON CONFLICT (username) DO NOTHING;


-- ------------------------------------------------------------
-- CATEGORIES
-- ------------------------------------------------------------
INSERT INTO categories (name, sort_order) VALUES
  ('Burgers', 1),
  ('Sides',   2),
  ('Drinks',  3),
  ('Combos',  4)
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------
-- PRODUCTS — Simple
-- ------------------------------------------------------------
INSERT INTO products (category_id, name, type, base_price, is_available, sort_order)
SELECT c.id, p.name, p.type, p.base_price, TRUE, p.sort_order
FROM (VALUES
  ('Burgers', 'Classic Burger', 'simple', 5.99, 1),
  ('Burgers', 'Cheese Burger',  'simple', 6.99, 2),
  ('Sides',   'French Fries',   'simple', 2.49, 1),
  ('Sides',   'Onion Rings',    'simple', 2.99, 2),
  ('Drinks',  'Cola',           'simple', 1.49, 1),
  ('Drinks',  'Orange Juice',   'simple', 1.99, 2)
) AS p(cat_name, name, type, base_price, sort_order)
JOIN categories c ON c.name = p.cat_name
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------
-- PRODUCTS — Variant-based (Milkshake)
-- ------------------------------------------------------------
INSERT INTO products (category_id, name, type, is_available, sort_order)
SELECT id, 'Milkshake', 'variant', TRUE, 3
FROM categories WHERE name = 'Drinks'
ON CONFLICT DO NOTHING;

-- Variants for Milkshake
INSERT INTO product_variants (product_id, name, price, sort_order)
SELECT p.id, v.name, v.price, v.sort_order
FROM products p
CROSS JOIN (VALUES
  ('Small',  2.99, 1),
  ('Medium', 3.99, 2),
  ('Large',  4.99, 3)
) AS v(name, price, sort_order)
WHERE p.name = 'Milkshake'
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------
-- PRODUCTS — Combo
-- ------------------------------------------------------------
INSERT INTO products (category_id, name, type, base_price, is_available, sort_order)
SELECT id, 'Burger Meal Deal', 'combo', 9.99, TRUE, 1
FROM categories WHERE name = 'Combos'
ON CONFLICT DO NOTHING;

-- Combo contents: Classic Burger + French Fries + Cola
INSERT INTO combo_items (combo_id, product_id, quantity)
SELECT combo.id, item.id, 1
FROM   products combo
JOIN   products item ON item.name IN ('Classic Burger', 'French Fries', 'Cola')
WHERE  combo.name = 'Burger Meal Deal'
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------
-- ADDON GROUPS
-- Two reusable groups:
--   "Extras"  — toppings (optional, pick up to 3)
--   "Sauces"  — dipping sauces (optional, pick 1)
-- ------------------------------------------------------------
INSERT INTO addon_groups (name, min_select, max_select) VALUES
  ('Extras', 0, 3),
  ('Sauces', 0, 1)
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------
-- ADDON ITEMS
-- ------------------------------------------------------------
INSERT INTO addon_items (addon_group_id, name, price, sort_order)
SELECT g.id, i.name, i.price, i.sort_order
FROM addon_groups g
CROSS JOIN (VALUES
  ('Extras', 'Extra Cheese', 0.50, 1),
  ('Extras', 'Bacon',        1.00, 2),
  ('Extras', 'Jalapeños',    0.40, 3),
  ('Sauces', 'Ketchup',      0.00, 1),
  ('Sauces', 'BBQ Sauce',    0.30, 2),
  ('Sauces', 'Mayo',         0.00, 3)
) AS i(group_name, name, price, sort_order)
WHERE g.name = i.group_name
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------
-- PRODUCT → ADDON GROUP MAPPING
-- Both burger types get the "Extras" and "Sauces" groups.
-- Sides (fries, onion rings) get only "Sauces".
-- ------------------------------------------------------------
INSERT INTO product_addon_groups (product_id, addon_group_id)
SELECT p.id, g.id
FROM   products p
JOIN   addon_groups g ON g.name = 'Extras'
WHERE  p.name IN ('Classic Burger', 'Cheese Burger')
ON CONFLICT DO NOTHING;

INSERT INTO product_addon_groups (product_id, addon_group_id)
SELECT p.id, g.id
FROM   products p
JOIN   addon_groups g ON g.name = 'Sauces'
WHERE  p.name IN ('Classic Burger', 'Cheese Burger', 'French Fries', 'Onion Rings')
ON CONFLICT DO NOTHING;
