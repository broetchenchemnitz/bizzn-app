-- Migration 008: Fehlende RLS-Policy für projects UPDATE
-- Die projects-Tabelle hatte keine UPDATE-Policy, weshalb Slug-Speicherung fehlschlug.

-- UPDATE-Policy: Nur der Owner darf sein eigenes Projekt aktualisieren
-- (Slug, Name, Status etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'projects'
      AND policyname = 'projects_update_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "projects_update_own"
        ON public.projects FOR UPDATE
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    $policy$;
  END IF;
END;
$$;

-- Sicherheitshalber: SELECT und INSERT falls ebenfalls fehlend
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'projects'
      AND policyname = 'projects_select_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "projects_select_own"
        ON public.projects FOR SELECT
        USING (user_id = auth.uid());
    $policy$;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'projects'
      AND policyname = 'projects_insert_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "projects_insert_own"
        ON public.projects FOR INSERT
        WITH CHECK (user_id = auth.uid());
    $policy$;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'projects'
      AND policyname = 'projects_delete_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "projects_delete_own"
        ON public.projects FOR DELETE
        USING (user_id = auth.uid());
    $policy$;
  END IF;
END;
$$;
