-- M24b: Abholzeit-Redesign — Auto-Slot-Generator
-- Ersetzt den manuellen pickup_slots-Ansatz durch 3 einfache Einstellungen

-- ── 1. Alte pickup_slots Tabelle droppen (war nie in Produktion genutzt) ──────
DROP TABLE IF EXISTS public.pickup_slots CASCADE;

-- ── 2. Neue Konfigurations-Spalten auf projects ───────────────────────────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS prep_time_minutes    SMALLINT NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS slot_interval_minutes SMALLINT NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS max_orders_per_slot   SMALLINT DEFAULT NULL;
  -- NULL = unbegrenzt

COMMENT ON COLUMN public.projects.prep_time_minutes     IS 'M24b: Vorlaufzeit in Minuten (Zubereitungszeit)';
COMMENT ON COLUMN public.projects.slot_interval_minutes IS 'M24b: Slot-Raster in Minuten (10/15/20/30)';
COMMENT ON COLUMN public.projects.max_orders_per_slot   IS 'M24b: Max. Bestellungen pro Zeitslot (NULL = unbegrenzt)';

-- orders.pickup_slot (TEXT) bleibt unverändert — bereits in M24 angelegt
