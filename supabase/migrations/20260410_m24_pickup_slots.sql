-- M24: Abholzeit-Slots
-- Gastronom definiert Zeitslots pro Wochentag (15-Min-Raster)
-- Kunde wählt im Checkout-Schritt 2 einen Slot

-- ── 1. Feature-Flag auf projects ─────────────────────────────────────────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pickup_slots_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.projects.pickup_slots_enabled IS 'M24: Abholzeit-Slots aktiviert/deaktiviert';

-- ── 2. Pickup-Slots Tabelle ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pickup_slots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  -- 0 = Sonntag, 1 = Montag … 6 = Samstag (JS-Konvention)
  slot_time    TIME NOT NULL,         -- z. B. 12:00, 12:15, 12:30 …
  label        TEXT,                  -- optionale Bezeichnung, z. B. "Mittagsrush"
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pickup_slots IS 'M24: Abholzeit-Slots je Wochentag und Restaurant';

-- Index für performante Abfragen nach project_id + Wochentag
CREATE INDEX IF NOT EXISTS pickup_slots_project_day_idx
  ON public.pickup_slots (project_id, day_of_week, slot_time);

-- ── 3. orders: gewählter Slot als Text speichern ──────────────────────────────
-- Format: "Montag · 12:15 Uhr" — lesbar ohne JOIN, robust gegen spätere Slot-Löschung
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pickup_slot TEXT DEFAULT NULL;

COMMENT ON COLUMN public.orders.pickup_slot IS 'M24: Gewählter Abholzeitslot als lesbare Zeichenkette';

-- ── 4. RLS Policies ───────────────────────────────────────────────────────────

-- Öffentliches Lesen der aktiven Slots (für Storefront/Checkout)
ALTER TABLE public.pickup_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pickup_slots_select_public"
  ON public.pickup_slots FOR SELECT
  USING (is_active = true);

-- Owner/Admin darf alles (INSERT, UPDATE, DELETE) via Admin-Client
-- (Server Actions verwenden Service-Role → RLS wird umgangen)
