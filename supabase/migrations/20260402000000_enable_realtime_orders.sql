-- M4.1: Live Kitchen-Status-Sync
-- Aktiviert Supabase Realtime für die 'orders' Tabelle im 'public' Schema.

BEGIN;

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

COMMIT;
