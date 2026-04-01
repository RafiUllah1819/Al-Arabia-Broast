-- ── Expense Categories ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_categories (
  id         SERIAL       PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  sort_order INTEGER      NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed default categories (safe to re-run — ON CONFLICT skips duplicates)
INSERT INTO expense_categories (name, sort_order) VALUES
  ('Staff Payment',        1),
  ('Cold Drinks Purchase', 2),
  ('Chicken Purchase',     3),
  ('Burger Materials',     4),
  ('Pizza Materials',      5),
  ('Utility Bills',        6),
  ('Packaging',            7),
  ('Cleaning',             8),
  ('Transport',            9),
  ('Miscellaneous',       10)
ON CONFLICT (name) DO NOTHING;

-- ── Expenses ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id             SERIAL        PRIMARY KEY,
  category_id    INTEGER       NOT NULL REFERENCES expense_categories(id),
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description    TEXT,
  vendor         VARCHAR(200),
  payment_method VARCHAR(20)   NOT NULL DEFAULT 'cash'
                   CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'other')),
  expense_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_by     INTEGER       NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses (expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category_id);
