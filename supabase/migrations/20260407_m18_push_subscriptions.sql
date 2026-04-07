-- M18: Web Push Broadcast — push_subscriptions Tabelle

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_project_id_idx ON public.push_subscriptions(project_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions(user_id);

-- RLS aktivieren
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anon & authenticated dürfen subscriben (INSERT)
CREATE POLICY "push_subs_insert_anon"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Restaurant-Owner darf seine Subscribers lesen
CREATE POLICY "push_subs_select_owner"
  ON public.push_subscriptions
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

-- Jeder kann seinen eigenen Subscription-Eintrag löschen (Opt-out)
CREATE POLICY "push_subs_delete_own"
  ON public.push_subscriptions
  FOR DELETE
  USING (endpoint = current_setting('request.jwt.claims', true)::json->>'endpoint'
    OR user_id = auth.uid());
