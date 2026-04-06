-- M3: Multi-User Role System Foundation
-- Tabelle für Projekt-Mitgliedschaften und Rollen

CREATE TABLE IF NOT EXISTS public.project_members (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role        text NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
    created_at  timestamptz DEFAULT now(),
    UNIQUE(project_id, user_id)
);

-- RLS aktivieren
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Policy: User sieht nur seine eigenen Memberships
CREATE POLICY "Users can view their own memberships"
    ON public.project_members FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Owner kann alle Members seines Projekts verwalten
CREATE POLICY "Owners can manage project members"
    ON public.project_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_members.project_id
            AND pm.user_id = auth.uid()
            AND pm.role = 'owner'
        )
    );
