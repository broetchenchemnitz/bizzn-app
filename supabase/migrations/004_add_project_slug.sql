-- ============================================================
-- Bizzn Gastro-OS — Project Slug Column
-- Migration: 004_add_project_slug.sql
-- ============================================================

-- 1. Add the slug column (nullable initially to allow backfill)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS slug text;

-- 2. Backfill existing rows: derive slug from name
--    e.g. "Mario's Restaurant" → "marios-restaurant"
UPDATE public.projects
SET slug = lower(
  regexp_replace(
    regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL;

-- 3. Enforce NOT NULL + UNIQUE now that backfill is complete
ALTER TABLE public.projects
  ALTER COLUMN slug SET NOT NULL,
  ADD CONSTRAINT projects_slug_key UNIQUE (slug);

-- 4. Index for fast subdomain lookup
CREATE INDEX IF NOT EXISTS projects_slug_idx ON public.projects (slug);
