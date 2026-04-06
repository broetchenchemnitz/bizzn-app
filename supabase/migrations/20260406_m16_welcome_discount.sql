-- M16: Willkommensrabatt (Erstbesteller-Bonus)

-- 1. projects: Rabatt-Konfiguration
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS welcome_discount_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS welcome_discount_pct     integer NOT NULL DEFAULT 10
    CHECK (welcome_discount_pct BETWEEN 1 AND 100);

-- 2. orders: Rabatt-Buchführung
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS discount_pct         integer NOT NULL DEFAULT 0
    CHECK (discount_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS discount_amount_cents integer NOT NULL DEFAULT 0;
