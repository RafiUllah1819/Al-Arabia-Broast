-- Add barcode column to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
