-- Add is_active flag to expense_categories.
-- Safe to re-run — IF NOT EXISTS / DEFAULT TRUE keeps existing rows active.
ALTER TABLE expense_categories
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
