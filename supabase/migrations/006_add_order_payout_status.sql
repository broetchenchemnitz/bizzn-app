-- ============================================================
-- Bizzn Gastro-OS — Payout Status Column
-- Migration: 006_add_order_payout_status.sql
-- ============================================================
-- Tracks whether an order has been included in a Stripe payout.
-- This is the IDEMPOTENCY GUARD that prevents double-payouts.
-- Values: 'pending' (not yet paid out), 'paid' (included in transfer)
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'pending'
    CHECK (payout_status IN ('pending', 'paid'));

-- Index for fast cron queries: project_id + status + payout_status
CREATE INDEX IF NOT EXISTS orders_payout_idx
  ON public.orders (project_id, status, payout_status);
