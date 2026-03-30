-- Run this once against your existing database.
-- All statements use IF NOT EXISTS / IF EXISTS so it is safe to re-run.

-- 1. Tables management
CREATE TABLE IF NOT EXISTS tables (
  id        SERIAL      PRIMARY KEY,
  name      VARCHAR(50) NOT NULL,
  capacity  INTEGER     NOT NULL DEFAULT 4,
  status    VARCHAR(20) NOT NULL DEFAULT 'available'
            CHECK (status IN ('available', 'occupied', 'reserved')),
  is_active BOOLEAN     NOT NULL DEFAULT TRUE
);

-- 2. New columns on orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS table_id         INTEGER REFERENCES tables(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS waiter_id        INTEGER REFERENCES users(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_phone   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- 3. Allow 'delivery' as an order type
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_type_check
  CHECK (type IN ('dine-in', 'takeaway', 'delivery'));

-- 4. Allow 'waiter' as a user role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'manager', 'cashier', 'kitchen', 'waiter'));
