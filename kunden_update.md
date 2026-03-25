# Kunden-Update – Bizzn Changelog

## 2026-03-24

- **Projektstart:** Visuelle Identität (Logo & Assets) erfolgreich nach Bizzn-Richtlinien initialisiert.
- **Backend/Frontend-Gerüst:** Next.js 14 und Supabase Abhängigkeiten erfolgreich installiert. Git-Security-Regeln (Secrets) verschärft.
- **Architektur:** Next.js App Router inklusive TypeScript und Bizzn-Brand-Tailwind-Theme (Inter-Font, Bizzn-Grün) erfolgreich implementiert und fehlerfrei kompiliert.
- **Datenbank:** Supabase-Client initialisiert und Umgebungsvariablen-Template für sichere API-Keys bereitgestellt.
- **Sicherheit & UI:** Authentifizierungs-Modul (Login/Registrierung) im Bizzn-Design integriert und mit Supabase verbunden.
- **Infrastruktur:** Edge Middleware eingerichtet, um sichere Routen (z.B. Dashboard) serverseitig vor unberechtigtem Zugriff zu schützen.
- **UI/UX:** Globale Hauptnavigation inkl. dynamischem Auth-Status (Login/Logout) und Bizzn-Branding ausgerollt.
- **Datenarchitektur:** Serverseitiges Data-Fetching im Dashboard integriert. Typensicheres Datenbank-Schema für Projekte ('projects') etabliert.
- **Deployment & Payments:** Vercel-Produktionskonfiguration und initialer Stripe-Webhook-Endpoint für die Zahlungsabwicklung erfolgreich eingerichtet.
- **Monetarisierung:** Stripe-SDK integriert und sichere serverseitige Checkout-API für die Zahlungsabwicklung bereitgestellt.
- **Frontend:** Interaktiver Stripe-Checkout-Button im Dashboard integriert. Erfolgs- und Abbruch-Routen für Zahlungen eingerichtet.
- **Sicherheit & Datenbank:** Supabase 'projects' Tabelle mit strikten Row Level Security (RLS) Policies initialisiert. Nutzerdaten sind nun hart voneinander getrennt.
- **Projekt-Management:** Umbenennen und Löschen von Projekten (inklusive Sicherheitsabfrage) im Workspace-Bereich umgesetzt (abgesichert über Server Actions).
- **TypeScript:** Alle `any`-Casts und `@ts-expect-error`-Direktiven entfernt. `Database`-Typ mit vollständigem supabase-js-Schema (`Relationships`, `Views`, `Functions`, `Enums`, `CompositeTypes`) erwänltert — streng typisierter Build läuft ohne Fehler.
- **Benutzerprofil:** Einstellungsseite mit Anzeigenamen-Editor implementiert. Dashboard-Begrüßung nutzt nun den gespeicherten Namen (`full_name` aus Auth-Metadata), mit E-Mail-Fallback.
- **Workspace UI:** Interaktives Kanban-Board (To Do / In Progress / Done) im Projekt-Workspace implementiert; Aufgaben können erstellt, zwischen Spalten verschoben und gelöscht werden.
- **Gastro-OS Phase 1:** Workspace-Platzhalter durch echtes Restaurant-Dashboard ersetzt. KPI-Karten (Live Bestellungen, Tagesumsatz, Aktive Speisen), Live-Status-Indikator, Bestellkanal-Badges und Schnellaktion-Buttons im Bizzn-Limettengrün (#77CC00) umgesetzt.
- **Datenbankschema:** SQL-Migration für `menu_categories` und `menu_items` erstellt (mit RLS-Policies). TypeScript-Typen in `types/supabase.ts` um beide Tabellen inklusive `Relationships`-Arrays erweitert.
- **Menu-Builder:** Kategorie-Übersicht für die Speisekarte implementiert — neue Kategorien können angelegt und aufgelistet werden. Route `/dashboard/project/[id]/menu` mit Server Actions und Bizzn-Branding.
- **Menu-Builder Phase 2:** Speisen-CRUD pro Kategorie implementiert. Neues Gericht mit Name, Beschreibung, Preis (€ → Cent-Konvertierung) und Aktiv-Toggle anlegbar. Route `/dashboard/project/[id]/menu/[categoryId]`.
