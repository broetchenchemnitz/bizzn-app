-- ============================================================
-- Bizzn Gastro-OS — Add table_number to orders
-- Migration: 005_add_table_number.sql
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS table_number text;

-- Public RLS: allow anonymous INSERT with table_number (in-store QR flow)
-- The existing insert policy already allows inserts scoped to project_id.
-- No additional policy needed; table_number is just a nullable text column.
