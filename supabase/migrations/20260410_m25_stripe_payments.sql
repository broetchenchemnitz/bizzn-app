-- ─────────────────────────────────────────────────────────────────────────────
-- M25: Online-Zahlung via Stripe
-- ─────────────────────────────────────────────────────────────────────────────

-- orders: Zahlungsstatus + Stripe PaymentIntent-Referenz
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status text
    DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- projects: Toggle "Online-Zahlung aktivieren"
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS online_payment_enabled boolean DEFAULT false;
