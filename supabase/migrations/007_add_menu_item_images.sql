-- Migration 007: Bild-URL für Speisen
-- Fügt image_url zu menu_items hinzu und richtet den Storage Bucket ein

-- 1. Spalte hinzufügen
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

-- 2. Storage Bucket für Menü-Bilder erstellen (falls nicht vorhanden)
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policy: Gastronomen dürfen eigene Bilder hochladen
CREATE POLICY "Authenticated users can upload menu images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'menu-images');

-- 4. Storage Policy: Jeder kann Bilder lesen (public bucket)
CREATE POLICY "Public can read menu images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'menu-images');

-- 5. Storage Policy: Eigene Bilder löschen
CREATE POLICY "Authenticated users can delete their menu images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'menu-images');
