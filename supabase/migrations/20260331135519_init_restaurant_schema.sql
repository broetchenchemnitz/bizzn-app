-- 1. Tabellen-Struktur
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INT DEFAULT 0
);

CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    is_available BOOLEAN DEFAULT true
);

CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    qr_code_url TEXT
);

-- 2. RLS aktivieren
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- 3. RLS-Policies für Gastronomen (ALL: SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Gastronomen CRUD restaurants" ON restaurants
    FOR ALL TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "Gastronomen CRUD categories" ON categories
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM restaurants WHERE id = categories.restaurant_id AND owner_id = auth.uid())
    );

CREATE POLICY "Gastronomen CRUD menu_items" ON menu_items
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM categories JOIN restaurants ON categories.restaurant_id = restaurants.id WHERE categories.id = menu_items.category_id AND restaurants.owner_id = auth.uid())
    );

CREATE POLICY "Gastronomen CRUD tables" ON tables
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM restaurants WHERE id = tables.restaurant_id AND owner_id = auth.uid())
    );

-- 4. RLS-Policies für Gäste (SELECT)
CREATE POLICY "Public SELECT restaurants" ON restaurants FOR SELECT TO anon USING (true);
CREATE POLICY "Public SELECT categories" ON categories FOR SELECT TO anon USING (true);
CREATE POLICY "Public SELECT menu_items" ON menu_items FOR SELECT TO anon USING (true);
CREATE POLICY "Public SELECT tables" ON tables FOR SELECT TO anon USING (true);
