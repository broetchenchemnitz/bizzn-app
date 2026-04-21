-- ═══════════════════════════════════════════════════════════════════════════
-- M32: Superadmin-Prüfung & Freigabe Flow
-- Neue Statuses: pending_review, approved, inactive
-- Neue Spalten: approved_at, approved_by, superadmin_note, online_since
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Status-Constraint erweitern (alle erlaubten Werte)
ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('draft', 'pending_review', 'approved', 'active', 'inactive'));

-- 2. Neue Spalten hinzufügen
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by       TEXT,
  ADD COLUMN IF NOT EXISTS superadmin_note   TEXT,
  ADD COLUMN IF NOT EXISTS online_since      TIMESTAMPTZ;

-- 3. Index für Superadmin-Abfragen
CREATE INDEX IF NOT EXISTS idx_projects_status_pending
  ON projects (status)
  WHERE status = 'pending_review';

-- 4. Bestehende 'active' Projekte behalten ihren Status
-- (kein Data-Migration nötig, bestehende active bleiben active)
