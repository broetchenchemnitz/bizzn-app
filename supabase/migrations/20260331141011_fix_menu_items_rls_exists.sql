DROP POLICY IF EXISTS "Public Select" ON menu_items;
CREATE POLICY "Public Select" ON menu_items FOR SELECT TO anon USING (
    is_active = true AND EXISTS (
        SELECT 1 
        FROM categories c
        JOIN restaurants r ON c.restaurant_id = r.id
        WHERE c.id = menu_items.category_id 
        AND r.is_active = true
    )
);
