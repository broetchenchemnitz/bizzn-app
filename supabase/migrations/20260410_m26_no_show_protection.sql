-- ─── M26: No-Show-Schutz ─────────────────────────────────────────────────────

-- 1. orders: No-Show-Markierung
ALTER TABLE orders ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT false;

-- 2. customer_profiles: Blacklist-Felder + Barzahlungs-Zähler
ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS is_blacklisted       BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blacklist_reason      TEXT,
  ADD COLUMN IF NOT EXISTS blacklisted_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cash_order_count      INTEGER     NOT NULL DEFAULT 0;

-- 3. Index für schnelle Blacklist-Prüfung beim Checkout
CREATE INDEX IF NOT EXISTS idx_customer_profiles_blacklisted
  ON customer_profiles (id)
  WHERE is_blacklisted = true;

-- 4. Index für No-Show-Abfragen im Dashboard
CREATE INDEX IF NOT EXISTS idx_orders_no_show
  ON orders (project_id, no_show)
  WHERE no_show = true;
