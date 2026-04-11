-- Die ursprüngliche Policy war auf "TO anon" beschränkt.
-- Wir droppen sie und erstellen sie neu für "anon, authenticated", 
-- damit auch eingeloggte Gastronomen die Discovery-Seite nutzen können.

DROP POLICY IF EXISTS "Public SELECT öffentliche Restaurants (Discovery)" ON projects;

CREATE POLICY "Public SELECT öffentliche Restaurants (Discovery)"
  ON projects
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);
