-- ============================================================================
-- M28: Optionsgruppen, Optionen & Kundennotiz pro Artikel
-- ============================================================================

-- A) Optionsgruppen (z.B. "Größe", "Extra Belag")
CREATE TABLE IF NOT EXISTS menu_option_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT false,
  min_select INTEGER DEFAULT 0,
  max_select INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- B) Einzelne Optionen (z.B. "Klein +0€", "Groß +2€")
CREATE TABLE IF NOT EXISTS menu_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  option_group_id UUID NOT NULL REFERENCES menu_option_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER DEFAULT 0 CHECK (price_cents >= 0),
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- C) Gewählte Optionen pro Bestellposition (Snapshot für Historie)
CREATE TABLE IF NOT EXISTS order_item_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  option_name TEXT NOT NULL,
  option_group_name TEXT NOT NULL,
  price_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- D) Kundennotiz pro Artikel
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS customer_note TEXT;

-- E) Performance-Indizes
CREATE INDEX IF NOT EXISTS idx_mog_item ON menu_option_groups(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_mo_group ON menu_options(option_group_id);
CREATE INDEX IF NOT EXISTS idx_oio_item ON order_item_options(order_item_id);

-- F) RLS
ALTER TABLE menu_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_options ENABLE ROW LEVEL SECURITY;

-- Anon kann Optionsgruppen + Optionen lesen (Storefront/Checkout)
CREATE POLICY "anon_read_option_groups" ON menu_option_groups
  FOR SELECT USING (true);

CREATE POLICY "anon_read_options" ON menu_options
  FOR SELECT USING (true);

-- order_item_options: Service Role schreibt, anon darf lesen
CREATE POLICY "anon_read_order_item_options" ON order_item_options
  FOR SELECT USING (true);
