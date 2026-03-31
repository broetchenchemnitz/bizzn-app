-- ============================================================
-- BIZZN RLS Security & Performance Fix Migration
-- Fixes: WITH CHECK, Security Definer Fn, is_active Flags, CASCADE FK
-- ============================================================

-- 1. Fix Categories RLS (Add WITH CHECK)
DROP POLICY IF EXISTS "Gastronomen Vollzugriff Kategorien" ON categories;
CREATE POLICY "Gastronomen Vollzugriff Kategorien" ON categories FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM restaurants WHERE id = categories.restaurant_id AND owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM restaurants WHERE id = categories.restaurant_id AND owner_id = auth.uid())
);

-- 2. Performance Fix (Security Definer Function & Policy Update)
CREATE OR REPLACE FUNCTION auth_user_restaurant_ids() RETURNS SETOF uuid AS $$
  SELECT id FROM restaurants WHERE owner_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Gastronomen Vollzugriff Menu Items" ON menu_items;
CREATE POLICY "Gastronomen Vollzugriff Menu Items" ON menu_items FOR ALL TO authenticated USING (
  category_id IN (SELECT id FROM categories WHERE restaurant_id IN (SELECT auth_user_restaurant_ids()))
) WITH CHECK (
  category_id IN (SELECT id FROM categories WHERE restaurant_id IN (SELECT auth_user_restaurant_ids()))
);

-- 3. Security Leak Fix (Public Policies & Active Flags)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

DROP POLICY IF EXISTS "Public Select" ON restaurants;
CREATE POLICY "Public Select" ON restaurants FOR SELECT TO anon USING (is_active = true);

DROP POLICY IF EXISTS "Public Select" ON menu_items;
CREATE POLICY "Public Select" ON menu_items FOR SELECT TO anon USING (is_active = true);

-- 4. DELETE CASCADE on categories
ALTER TABLE categories DROP CONSTRAINT IF EXISTS fk_restaurant;
ALTER TABLE categories ADD CONSTRAINT fk_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE;
