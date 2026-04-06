-- M14: Restaurant-Profilfelder auf projects
-- Wird von der Profilseite ({slug}.bizzn.de) und dem Dashboard-Profil-Editor genutzt.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS description      text,
  ADD COLUMN IF NOT EXISTS address          text,
  ADD COLUMN IF NOT EXISTS phone            text,
  ADD COLUMN IF NOT EXISTS cuisine_type     text,
  ADD COLUMN IF NOT EXISTS cover_image_url  text,
  ADD COLUMN IF NOT EXISTS opening_hours    jsonb DEFAULT '{}';

-- Kommentar für Klarheit
COMMENT ON COLUMN projects.description     IS 'Kurzbeschreibung des Restaurants (max. 300 Zeichen)';
COMMENT ON COLUMN projects.address         IS 'Vollständige Adresse (Straße, PLZ, Stadt)';
COMMENT ON COLUMN projects.phone           IS 'Telefonnummer für Kunden';
COMMENT ON COLUMN projects.cuisine_type    IS 'Küchen-Typ, z.B. Japanisch, Italienisch, Burger';
COMMENT ON COLUMN projects.cover_image_url IS 'URL zum Cover-Bild (Supabase Storage)';
COMMENT ON COLUMN projects.opening_hours   IS 'Öffnungszeiten als JSON: { "mo": "11:00-22:00", "di": "geschlossen", ... }';
