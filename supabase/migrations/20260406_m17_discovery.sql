-- M17: Discovery-App (bizzn.de)
-- Ermöglicht Restaurants, sich auf der Discovery-Seite listen zu lassen.

-- 1. projects: Discovery-Felder
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS city      text;

COMMENT ON COLUMN projects.is_public IS 'Wenn true, erscheint das Restaurant auf der bizzn.de Discovery-Seite';
COMMENT ON COLUMN projects.city      IS 'Stadt des Restaurants, z.B. "Chemnitz" — für Discovery-Filter';

-- 2. RLS: Anonyme Nutzer können öffentliche Restaurants lesen (für Discovery)
-- Die projects-Tabelle hat bereits RLS. Wir ergänzen eine SELECT-Policy für anon.
CREATE POLICY "Public SELECT öffentliche Restaurants (Discovery)"
  ON projects
  FOR SELECT
  TO anon
  USING (is_public = true);
