# 🏛️ BIZZN PROJECT CONSTITUTION (MASTERPLAN V1.1)

## 1. DIE MISSION & VISION
- Bizzn.de ist das moderne Betriebssystem für die lokale Gastronomie.
- Ziel: Eliminierung von Zettelwirtschaft durch ein digitales Menü- und Bestellsystem.
- Architektur-Maxime: Strikte Trennung zwischen Gastronomen-Dashboard (Management) und Gäste-Webapp (Customer-Frontend).

## 2. BUSINESS LOGIK & UX
- DESIGN: Dark Mode, Bizzn-Limettengrün (#77CC00) als Akzentfarbe, hoher Kontrast, Mobile-First.
- CORE-FUNKTION: Individuelle QR-Codes pro Tisch. Gäste scannen, bestellen und bezahlen direkt (Customer Checkout).
- REVENUE: SaaS-Abonnements für Restaurants (via Stripe).

## 3. TECH-FUNDAMENT
- FRONTEND: Next.js 14 (App Router), React, TailwindCSS.
- BACKEND & AUTH: Supabase (PostgreSQL).
- SECURITY: Strikte Row Level Security (RLS) zur Datentrennung. Keine Passwörter im Code.

## 4. WORKFLOW-GESETZ
1. RADAR-PING vor jedem Build (Zustand synchronisieren).
2. MICRO-SPRINTS (Max. 1-2 Dateien gleichzeitig bearbeiten).
3. AUTO-ROLLBACK bei kritischen Build-Fehlern.
4. @project_board.md nach jedem Sprint pflegen.