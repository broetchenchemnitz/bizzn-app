# 🚀 BIZZN.DE - MASTERPLAN & ROADMAP (V1.1)

## VISION
Bizzn.de ist das moderne Betriebssystem für die lokale Gastronomie. Es eliminiert Zettelwirtschaft und komplexe Alt-Systeme. Hoher Kontrast (Dark Mode, grüne Akzente), absolute Zuverlässigkeit und Mobile-First stehen an erster Stelle. Strikte Trennung zwischen B2B (Dashboard) und B2C (Gäste-Webapp).

## TECH-FUNDAMENT
- **Frontend:** Next.js, Tailwind CSS.
- **Backend & Auth:** Supabase (PostgreSQL, strikte Row Level Security zur Trennung von Gastronomen und Gästen).
- **Payments:** Stripe (Abonnements für Restaurants & Checkout für Gäste).

## PHASE 1: DAS CORE-MVP (Das Gastronomen-Dashboard)
- [x] Projekt-Setup & Architektur-Richtlinien.
- [x] UI/UX Grundgerüst (Dark Mode, Vektor-Logos, Responsive Layout).
- [x] Authentifizierung: Supabase Login/Registrierung NUR für Gastronomen.
- [x] Backend-Architektur: Supabase-Tabellen für "Restaurants", "Kategorien", "Gerichte", "Tische".
- [ ] Speisekarten-Management: CRUD-Operationen (Erstellen, Lesen, Ändern, Löschen) im Dashboard.
- [ ] QR-Code Generator: Das System generiert individuelle QR-Codes pro Tisch.

## PHASE 2: DIE GÄSTE-WEBAPP (Das Customer-Frontend)
- [ ] Dynamisches Routing: Eigene URLs für Gäste (z.B. `bizzn.de/[restaurant-id]/[tisch-nr]`).
- [ ] Digitale Speisekarte (Read-Only): Extrem schnelle, Mobile-Only optimierte Ansicht für Gäste.
- [ ] Warenkorb-System: Gäste können Gerichte zu ihrer Tisch-Bestellung hinzufügen.
- [ ] Live-Sync: Bestellungen der Gäste tauchen in Echtzeit (via Supabase Realtime) im Dashboard des Gastronomen auf.

## PHASE 3: TRANSAKTIONEN & PAYMENT
- [ ] Stripe-Integration (SaaS-Abo-Modell für Restaurants zur Nutzung von Bizzn.de).
- [ ] Customer Checkout: Gäste können ihre Rechnung direkt am Tisch via Webapp (Apple Pay / Google Pay via Stripe) bezahlen.
- [ ] Webhook-Handling & End-to-End Tests für absolut sichere Zahlungsflüsse.

## PHASE 4: RETENTION & SKALIERUNG
- [ ] PWA-Integration (Progressive Web App): Speichern der App auf dem Homescreen.
- [ ] Native Apps: Vorbereitung auf React Native / Expo für iOS & Android (Fokus auf Service-Personal & Küchen-Display-Systeme).
