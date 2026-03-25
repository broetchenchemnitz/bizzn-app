-- ============================================================
-- Bizzn Gastro-OS — Stripe Connect Schema
-- Migration: 003_stripe_schema.sql
-- ============================================================

-- Add Stripe Connect fields to the projects table.
-- These track the connected account status for each restaurant owner.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS stripe_account_id        text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled   boolean NOT NULL DEFAULT false;

-- Index for fast lookups by Stripe account ID (e.g., from webhook events)
CREATE UNIQUE INDEX IF NOT EXISTS projects_stripe_account_id_idx
  ON public.projects (stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;
