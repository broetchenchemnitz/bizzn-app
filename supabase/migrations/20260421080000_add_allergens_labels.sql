-- ============================================================
-- Allergene, Zusatzstoffe, Labels & Nährwerte für menu_items
-- Migration: 20260421080000_add_allergens_labels.sql
-- ============================================================

-- Allergene (14 EU-Hauptallergene gemäß LMIV als text-Array)
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS allergens text[] NOT NULL DEFAULT '{}';

-- Zusatzstoffe (Farbstoffe, Konservierungsstoffe etc.)
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS additives text[] NOT NULL DEFAULT '{}';

-- Labels / Tags (vegan, vegetarisch, scharf, halal etc.)
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS labels text[] NOT NULL DEFAULT '{}';

-- Nährwerte pro Portion (optional, JSON)
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS nutritional_info jsonb DEFAULT NULL;

-- Index für Allergen-Filter (GIN-Index für Array-Operationen)
CREATE INDEX IF NOT EXISTS idx_menu_items_allergens ON public.menu_items USING GIN (allergens);
CREATE INDEX IF NOT EXISTS idx_menu_items_labels ON public.menu_items USING GIN (labels);
