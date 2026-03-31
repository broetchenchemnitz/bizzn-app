COMMIT;

-- QA-Mandatory: Indizes für performante RLS-Auflösung (Verhindert Seq Scans)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_restaurant_id ON categories(restaurant_id);
