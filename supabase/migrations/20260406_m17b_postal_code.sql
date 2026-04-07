-- M17-Patch: Postleitzahl für Discovery-Filterung
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS postal_code text;

COMMENT ON COLUMN projects.postal_code IS 'PLZ des Restaurants, z.B. "09116" — für Discovery-Filter';
