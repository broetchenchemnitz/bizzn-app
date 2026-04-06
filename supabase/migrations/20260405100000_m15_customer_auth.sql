-- M15: Kunden-Auth
-- customer_profiles: verknüpft mit Supabase Auth users
-- restaurant_customers: Restaurant-Kunden-Beziehung (wer hat bei welchem Restaurant bestellt/registriert)

-- 1. Kundenprofile
CREATE TABLE IF NOT EXISTS customer_profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL DEFAULT '',
  phone       text,
  created_at  timestamptz DEFAULT now()
);

-- 2. Restaurant-Kunden-Beziehung
CREATE TABLE IF NOT EXISTS restaurant_customers (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id                     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marketing_consent_push      boolean NOT NULL DEFAULT false,
  marketing_consent_email     boolean NOT NULL DEFAULT false,
  created_at                  timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- 3. RLS aktivieren
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_customers ENABLE ROW LEVEL SECURITY;

-- 4. Policies: customer_profiles
-- Kunden sehen und bearbeiten nur ihr eigenes Profil
CREATE POLICY "customer_profiles_own" ON customer_profiles
  FOR ALL USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Policies: restaurant_customers
-- Kunden können sich selbst registrieren
CREATE POLICY "restaurant_customers_insert_self" ON restaurant_customers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Kunden sehen ihre eigenen Restaurant-Beziehungen
CREATE POLICY "restaurant_customers_own_select" ON restaurant_customers
  FOR SELECT USING (auth.uid() = user_id);

-- Gastronomen (Projekt-Owner) sehen ihre Kunden
CREATE POLICY "restaurant_owner_sees_customers" ON restaurant_customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = restaurant_customers.project_id
        AND p.user_id = auth.uid()
    )
  );

-- 6. Index für Performance
CREATE INDEX IF NOT EXISTS idx_restaurant_customers_project_id
  ON restaurant_customers(project_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_customers_user_id
  ON restaurant_customers(user_id);
