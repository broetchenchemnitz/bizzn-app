# 📍 CURRENT MICRO-STATE: Bugfix Routing - Projekt-ID in Kategorie-Links & Ordnerstruktur korrigiert.

## 🚀 MEILENSTEINE (PHASE 1)
1. [x] **DB-Architektur & Vision-Service:** Setup der Supabase-Tabellen für Kategorien/Gerichte und Integration der Vision API Schnittstelle.
2. [x] **Kategorie-Routing:** Kategorie-Headings verlinkt auf `/dashboard/menu/[categoryId]`.
3. [x] **Artikel-CRUD:** `createDish`, `updateDish`, `deleteDish` Server Actions in `app/lib/actions/dishActions.ts`.
4. [x] **Kategorie-Detail-Page:** `app/dashboard/menu/[categoryId]/page.tsx` mit Dish-Liste + Delete-Forms.
5. [x] **DishForm Component:** `app/dashboard/menu/[categoryId]/DishForm.tsx` Client Component.
6. [ ] **Magic Import UI:** Entwicklung der Upload-Komponente für Fotos/PDFs inklusive Echtzeit-Parsing-Status.
7. [ ] **Review & Edit Dashboard:** Interface zur finalen Kontrolle der von der AI erkannten Daten vor dem DB-Commit.
