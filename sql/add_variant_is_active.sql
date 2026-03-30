-- Run this once if you already ran schema.sql before the is_active column was added
-- to product_variants.  It is safe to run more than once (IF NOT EXISTS).
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
