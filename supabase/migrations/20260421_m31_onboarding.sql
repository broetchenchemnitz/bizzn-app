-- ============================================================
-- M31: Onboarding-Wizard
-- Neue Spalten auf projects für Draft/Live-Status, Wizard-Fortschritt,
-- Superadmin-Preisoverride, Trial-Zeitraum und Preview-Token
-- ============================================================

-- 1. Status-Default auf 'draft' setzen (bestehende Rows bleiben 'active')
ALTER TABLE projects
  ALTER COLUMN status SET DEFAULT 'draft';

-- 2. Wizard-Fortschritt (0 = nicht gestartet, 1-9 = Schritt abgeschlossen)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS onboarding_step INT NOT NULL DEFAULT 0;

-- 3. Superadmin: individuelle Monatsgebühr in Cent (NULL = Standard 9900)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS custom_monthly_price_cents INT NULL;

-- 4. Trial: Restaurant bis zu diesem Datum kostenfrei live (NULL = kein Trial)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ NULL;

-- 5. Timestamp wann das Restaurant erstmals live gegangen ist
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS live_since TIMESTAMPTZ NULL;

-- 6. Preview-Token: Gastronom kann Draft-Storefront per URL vorab sehen
--    Format: slug.bizzn.de?preview=<token>
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS preview_token TEXT NOT NULL DEFAULT gen_random_uuid()::text;

-- 7. Index für Draft-Filterung (Discovery + Storefront)
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- 8. Index für Preview-Token (Storefront-Lookup)
CREATE INDEX IF NOT EXISTS idx_projects_preview_token ON projects(preview_token);
