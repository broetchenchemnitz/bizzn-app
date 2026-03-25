-- ============================================================
-- Bizzn Gastro-OS — Menu Builder Schema
-- Migration: 001_menu_schema.sql
-- ============================================================

-- ----------------------------------------------------------
-- TABLE: menu_categories
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

-- Policy: owners can read their own restaurant's categories
CREATE POLICY "menu_categories_select_own"
  ON public.menu_categories FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

-- Policy: owners can insert into their own restaurant
CREATE POLICY "menu_categories_insert_own"
  ON public.menu_categories FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

-- Policy: owners can update their own categories
CREATE POLICY "menu_categories_update_own"
  ON public.menu_categories FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

-- Policy: owners can delete their own categories
CREATE POLICY "menu_categories_delete_own"
  ON public.menu_categories FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );


-- ----------------------------------------------------------
-- TABLE: menu_items
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  uuid NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text NOT NULL DEFAULT '',
  price        integer NOT NULL DEFAULT 0, -- stored in cents (Stripe-compatible)
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Policy: owners can read menu items belonging to their restaurant
CREATE POLICY "menu_items_select_own"
  ON public.menu_items FOR SELECT
  USING (
    category_id IN (
      SELECT mc.id FROM public.menu_categories mc
      JOIN public.projects p ON p.id = mc.project_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Policy: owners can insert menu items into their own categories
CREATE POLICY "menu_items_insert_own"
  ON public.menu_items FOR INSERT
  WITH CHECK (
    category_id IN (
      SELECT mc.id FROM public.menu_categories mc
      JOIN public.projects p ON p.id = mc.project_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Policy: owners can update their own menu items
CREATE POLICY "menu_items_update_own"
  ON public.menu_items FOR UPDATE
  USING (
    category_id IN (
      SELECT mc.id FROM public.menu_categories mc
      JOIN public.projects p ON p.id = mc.project_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Policy: owners can delete their own menu items
CREATE POLICY "menu_items_delete_own"
  ON public.menu_items FOR DELETE
  USING (
    category_id IN (
      SELECT mc.id FROM public.menu_categories mc
      JOIN public.projects p ON p.id = mc.project_id
      WHERE p.user_id = auth.uid()
    )
  );
