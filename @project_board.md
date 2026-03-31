# 📍 CURRENT MICRO-STATE: [Speisekarten-Management CRUD]

## PHASE 1: DAS CORE-MVP (Gastronomen-Dashboard)
- [x] Authentifizierung: Supabase Login/Registrierung NUR für Gastronomen. Middleware-Protection für /dashboard.
- [x] Backend-Architektur: Supabase-Tabellen (Restaurants, Kategorien, Gerichte, Tische) inkl. RLS-Policies.
- [x] Speisekarten-Management: CRUD-Operationen für Gerichte im Dashboard.
- [ ] QR-Code Generator: Erstellung individueller Tisch-QR-Codes.

## PHASE 2: DIE GÄSTE-WEBAPP (Das Customer-Frontend)
- [ ] Dynamisches Routing: Eigene URLs für Gäste (z.B. `bizzn.de/[restaurant-id]/[tisch-nr]`).
- [ ] Digitale Speisekarte (Read-Only): Extrem schnelle, Mobile-Only optimierte Ansicht für Gäste.
- [ ] Warenkorb-System: Gäste können Gerichte zu ihrer Tisch-Bestellung hinzufügen.
- [ ] Live-Sync: Bestellungen der Gäste tauchen in Echtzeit (via Supabase Realtime) im Dashboard auf.

## PHASE 3: TRANSAKTIONEN & PAYMENT
- [ ] Stripe-Integration: SaaS-Abo-Modell für Restaurants.
- [ ] Customer Checkout: Gäste bezahlen Rechnung direkt am Tisch via Webapp (Apple/Google Pay).
- [ ] Webhook-Handling & E2E-Tests: Absicherung der Zahlungsflüsse.

## PHASE 4: RETENTION & SKALIERUNG
- [ ] PWA-Integration: Speichern der App auf dem Homescreen.
- [ ] Native Apps: Vorbereitung auf React Native / Expo für iOS & Android.
