-- 20260408_m19_customer_orders.sql
-- M19: Customer Authentication für Bestellungen

-- 1. Füge user_id zu orders hinzu (nullable für Rückwärtskompatibilität)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Erweitere RLS: Kunden dürfen Bestellungen anlegen
CREATE POLICY "orders_insert_customer"
  ON public.orders FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 3. Erweitere RLS: Kunden dürfen Bestellungs-Positionen anlegen
CREATE POLICY "order_items_insert_authenticated"
  ON public.order_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 4. Kunden dürfen ihre eigenen Bestellungen sehen
CREATE POLICY "orders_select_customer"
  ON public.orders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "order_items_select_customer"
  ON public.order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
  );

-- 5. Restaurant-Besitzer dürfen alle Bestellungen ihres Projekts sehen (KDS)
CREATE POLICY "orders_select_own"
  ON public.orders FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "order_items_select_own"
  ON public.order_items FOR SELECT
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.projects p ON p.id = o.project_id
      WHERE p.user_id = auth.uid()
    )
  );

-- 6. Denormalisierter Artikelname für das KDS (kein JOIN nötig)
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS item_name text;
