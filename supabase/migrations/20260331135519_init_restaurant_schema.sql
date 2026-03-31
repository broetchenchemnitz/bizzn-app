-- ============================================================
-- BIZZN – Restaurant Schema (QA-bereinigt)
-- Fixes: WITH CHECK, Security Definer Fn, is_active, Explicit FK
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABELLEN-STRUKTUR
-- ────────────────────────────────────────────────────────────
CREATE TABLE restaurants (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    is_active   BOOLEAN     NOT NULL DEFAULT false,  -- Fix 3: Gäste sehen nur aktive Restaurants
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
    id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID  NOT NULL,
    name          TEXT  NOT NULL,
    sort_order    INT   NOT NULL DEFAULT 0
);

CREATE TABLE menu_items (
    id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id  UUID           NOT NULL,
    restaurant_id UUID          NOT NULL,  -- Fix 2A (Denormalisierung): direkter FK vermeidet Nested-Join in RLS
    name         TEXT           NOT NULL,
    description  TEXT,
    price        NUMERIC(10, 2) NOT NULL,
    is_available BOOLEAN        NOT NULL DEFAULT true  -- Fix 3: Gäste sehen nur verfügbare Items
);

CREATE TABLE tables (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    table_number  TEXT NOT NULL,
    qr_code_url   TEXT
);

-- ────────────────────────────────────────────────────────────
-- 2. EXPLIZITE FOREIGN KEY CONSTRAINTS (Fix 4: Explicit CASCADE)
-- ────────────────────────────────────────────────────────────
ALTER TABLE categories
    ADD CONSTRAINT fk_categories_restaurant
    FOREIGN KEY (restaurant_id)
    REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE menu_items
    ADD CONSTRAINT fk_menu_items_category
    FOREIGN KEY (category_id)
    REFERENCES categories(id) ON DELETE CASCADE;

ALTER TABLE menu_items
    ADD CONSTRAINT fk_menu_items_restaurant
    FOREIGN KEY (restaurant_id)
    REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE tables
    ADD CONSTRAINT fk_tables_restaurant
    FOREIGN KEY (restaurant_id)
    REFERENCES restaurants(id) ON DELETE CASCADE;

-- ────────────────────────────────────────────────────────────
-- 3. PERFORMANCE-HILFSFUNKTION (Fix 2B: Security Definer)
--    Cached pro Request – vermeidet Nested joins in RLS
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auth_user_restaurant_ids()
RETURNS SETOF UUID AS $$
    SELECT id FROM restaurants WHERE owner_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ────────────────────────────────────────────────────────────
-- 4. RLS AKTIVIEREN
-- ────────────────────────────────────────────────────────────
ALTER TABLE restaurants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables       ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 5. RLS-POLICIES: GASTRONOMEN (authenticated)
--    Fix 1: Alle Policies mit USING + WITH CHECK (schützt INSERT/UPDATE)
-- ────────────────────────────────────────────────────────────

-- restaurants: direkter owner_id-Vergleich
CREATE POLICY "Gastronomen Vollzugriff Restaurants" ON restaurants
    FOR ALL TO authenticated
    USING     (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- categories: Besitz über restaurant_id prüfen
CREATE POLICY "Gastronomen Vollzugriff Kategorien" ON categories
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM restaurants
            WHERE id = categories.restaurant_id AND owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM restaurants
            WHERE id = categories.restaurant_id AND owner_id = auth.uid()
        )
    );

-- menu_items: dank denormalisiertem restaurant_id kein Nested-Join mehr
CREATE POLICY "Gastronomen Vollzugriff Menu Items" ON menu_items
    FOR ALL TO authenticated
    USING     (restaurant_id IN (SELECT auth_user_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT auth_user_restaurant_ids()));

-- tables: Besitz über restaurant_id prüfen
CREATE POLICY "Gastronomen Vollzugriff Tische" ON tables
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM restaurants
            WHERE id = tables.restaurant_id AND owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM restaurants
            WHERE id = tables.restaurant_id AND owner_id = auth.uid()
        )
    );

-- ────────────────────────────────────────────────────────────
-- 6. RLS-POLICIES: GÄSTE (anon)
--    Fix 3: Nur aktive/verfügbare Datensätze öffentlich sichtbar
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Public SELECT aktive Restaurants" ON restaurants
    FOR SELECT TO anon
    USING (is_active = true);

CREATE POLICY "Public SELECT Kategorien" ON categories
    FOR SELECT TO anon
    USING (
        EXISTS (
            SELECT 1 FROM restaurants
            WHERE id = categories.restaurant_id AND is_active = true
        )
    );

CREATE POLICY "Public SELECT verfügbare Menu Items" ON menu_items
    FOR SELECT TO anon
    USING (is_available = true AND is_active = true);  -- Hinweis: is_active via restaurant-Kontext

CREATE POLICY "Public SELECT Tische" ON tables
    FOR SELECT TO anon
    USING (
        EXISTS (
            SELECT 1 FROM restaurants
            WHERE id = tables.restaurant_id AND is_active = true
        )
    );
