-- M3: Erweiterung der RLS-Policies für Team-Zugriff
-- Erlaubt staff, admin und owner Zugriff auf Projekt-Ressourcen

-- ──────────────────────────────────────────────────────────────────
-- 1. PROJECTS: Zugriff für alle Member erlauben
-- ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;

CREATE POLICY "Members can view projects"
    ON public.projects FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = projects.id
              AND pm.user_id = auth.uid()
        )
    );

-- ──────────────────────────────────────────────────────────────────
-- 2. ORDERS: Lesen & Verwalten für alle Teammitglieder
-- ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage their project orders" ON public.orders;

CREATE POLICY "Members can view/manage orders"
    ON public.orders FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = orders.project_id
              AND pm.user_id = auth.uid()
        )
    );

-- ──────────────────────────────────────────────────────────────────
-- 3. MENU_ITEMS: Lesen für alle Member, Schreiben nur Owner/Admin
--
-- WICHTIG: menu_items hat KEIN direktes project_id-Feld.
-- Der Pfad ist: menu_items.category_id → menu_categories.project_id
-- ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage their menu items" ON public.menu_items;

CREATE POLICY "Members can view menu items"
    ON public.menu_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            JOIN public.menu_categories mc ON mc.id = menu_items.category_id
            WHERE mc.project_id = pm.project_id
              AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners and Admins can manage menu items"
    ON public.menu_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            JOIN public.menu_categories mc ON mc.id = menu_items.category_id
            WHERE mc.project_id = pm.project_id
              AND pm.user_id = auth.uid()
              AND pm.role IN ('owner', 'admin')
        )
    );
