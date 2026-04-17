-- ─── Checkout-Flow Restrukturierung ──────────────────────────────────────────

-- 1. customer_profiles: Vorname + Nachname (statt einzelnem "name")
ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name  TEXT;

-- Bestehende Daten migrieren: name → first_name + last_name
UPDATE customer_profiles SET
  first_name = COALESCE(split_part(name, ' ', 1), name),
  last_name  = CASE
    WHEN position(' ' in name) > 0 THEN substring(name from position(' ' in name) + 1)
    ELSE ''
  END
WHERE first_name IS NULL;

-- 2. projects: Barzahlung-Limit für Erstbesteller (Standard: 3000 = 30,00 €)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS cash_limit_first_order_cents INTEGER NOT NULL DEFAULT 3000;
