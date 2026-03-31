-- 1. PERFORMANCE-FIX
CREATE OR REPLACE FUNCTION auth_user_restaurant_ids() RETURNS SETOF uuid AS $$
  SELECT id FROM restaurants WHERE owner_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 2. SECURITY-LEAK SCHLIESSEN
DROP POLICY IF EXISTS "Public Select" ON menu_items;
CREATE POLICY "Public Select" ON menu_items FOR SELECT TO anon USING (
  is_active = true AND
  category_id IN (
    SELECT c.id FROM categories c
    JOIN restaurants r ON c.restaurant_id = r.id
    WHERE r.is_active = true
  )
);

-- 3. DELETE CASCADE VERVOLLSTÄNDIGEN
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS fk_category;
ALTER TABLE menu_items ADD CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE;
