-- 1. Create Tables
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0 NOT NULL
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  is_available BOOLEAN DEFAULT true NOT NULL
);

CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  table_number TEXT NOT NULL,
  qr_code_url TEXT
);

-- 2. Enable RLS
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Restaurants
CREATE POLICY "Restaurants Owner CRUD" ON restaurants
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Categories
DROP POLICY IF EXISTS "Categories Owner CRUD" ON categories;
DROP POLICY IF EXISTS "Gastronom_All_Access_Categories" ON categories;
CREATE POLICY "Gastronom_All_Access_Categories" ON categories AS PERMISSIVE FOR ALL TO authenticated USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
) WITH CHECK (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);

CREATE POLICY "Categories Public Select" ON categories
  FOR SELECT TO anon, authenticated
  USING (true);

-- Menu Items
DROP POLICY IF EXISTS "Menu Items Owner CRUD" ON menu_items;
DROP POLICY IF EXISTS "Gastronom_All_Access_MenuItems" ON menu_items;
CREATE POLICY "Gastronom_All_Access_MenuItems" ON menu_items AS PERMISSIVE FOR ALL TO authenticated USING (
  category_id IN (SELECT id FROM categories WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
) WITH CHECK (
  category_id IN (SELECT id FROM categories WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
);

CREATE POLICY "Menu Items Public Select" ON menu_items
  FOR SELECT TO anon, authenticated
  USING (true);

-- Tables
DROP POLICY IF EXISTS "Tables Owner CRUD" ON tables;
DROP POLICY IF EXISTS "Gastronom_All_Access_Tables" ON tables;
CREATE POLICY "Gastronom_All_Access_Tables" ON tables AS PERMISSIVE FOR ALL TO authenticated USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
) WITH CHECK (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);

CREATE POLICY "Tables Public Select" ON tables
  FOR SELECT TO anon, authenticated
  USING (true);
