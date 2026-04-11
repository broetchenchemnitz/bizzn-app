-- ========================================================
-- M27: Bizzn-Pass (4,99 €/Monat Kunden-Abo)
-- ========================================================

-- 1. Subscription-Tabelle für Bizzn-Pass-Inhaber
CREATE TABLE IF NOT EXISTS bizzn_pass_subscriptions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id    text        NOT NULL,
  stripe_subscription_id text       NOT NULL UNIQUE,
  status                text        NOT NULL DEFAULT 'active',
    -- active | trialing | past_due | canceled | unpaid | incomplete
  current_period_end    timestamptz,
  cancel_at_period_end  boolean     NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- RLS: Jeder Kunde liest nur eigenes Abo
ALTER TABLE bizzn_pass_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bizzn_pass_user_select" ON bizzn_pass_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Indizes für schnellen Lookup
CREATE INDEX IF NOT EXISTS idx_bizzn_pass_user_id
  ON bizzn_pass_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_bizzn_pass_subscription_id
  ON bizzn_pass_subscriptions (stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_bizzn_pass_customer_id
  ON bizzn_pass_subscriptions (stripe_customer_id);

-- 2. Drive-In Feature-Flag auf projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS drive_in_enabled boolean NOT NULL DEFAULT false;

-- 3. Drive-In order_type: Wir speichern 'drive-in' als erweiterten Typ
--    (orders.order_type ist text, kein Enum — kein Migration-Problem)

-- 4. Helper-Funktion: Hat Kunden einen aktiven Bizzn-Pass?
--    Wird in placeOrder (Loyalty-Booster) und Checkout (MBW-Override) genutzt.
CREATE OR REPLACE FUNCTION public.has_active_bizzn_pass(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   bizzn_pass_subscriptions
    WHERE  user_id = p_user_id
      AND  status IN ('active', 'trialing')
      AND  (current_period_end IS NULL OR current_period_end > now())
  );
$$;

-- Kommentar
COMMENT ON TABLE bizzn_pass_subscriptions IS 'M27: Bizzn-Pass Kunden-Abonnements (4,99 €/Monat via Stripe)';
COMMENT ON FUNCTION public.has_active_bizzn_pass IS 'Gibt true zurück wenn Kunden einen aktiven Bizzn-Pass hat';
