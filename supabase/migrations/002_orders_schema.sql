-- ============================================================
-- Bizzn Gastro-OS — Live Orders Schema
-- Migration: 002_orders_schema.sql
-- ============================================================

-- ----------------------------------------------------------
-- TABLE: orders
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
  total_amount     integer NOT NULL DEFAULT 0, -- stored in cents
  customer_name    text NOT NULL DEFAULT '',
  customer_contact text NOT NULL DEFAULT '',
  order_type       text NOT NULL DEFAULT 'takeaway'
                   CHECK (order_type IN ('delivery', 'takeaway', 'in-store')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_own"
  ON public.orders FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "orders_insert_own"
  ON public.orders FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "orders_update_own"
  ON public.orders FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "orders_delete_own"
  ON public.orders FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );


-- ----------------------------------------------------------
-- TABLE: order_items
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id     uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  quantity         integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_at_time    integer NOT NULL DEFAULT 0, -- snapshot of price in cents at order time
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_select_own"
  ON public.order_items FOR SELECT
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.projects p ON p.id = o.project_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "order_items_insert_own"
  ON public.order_items FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.projects p ON p.id = o.project_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "order_items_update_own"
  ON public.order_items FOR UPDATE
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.projects p ON p.id = o.project_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "order_items_delete_own"
  ON public.order_items FOR DELETE
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.projects p ON p.id = o.project_id
      WHERE p.user_id = auth.uid()
    )
  );
