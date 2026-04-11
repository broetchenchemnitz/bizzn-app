# 🎯 BIZZN MASTERPLAN: Gastronomie-Revolution

## Mission
Abwerbung von Lieferando-Kunden durch radikale Vereinfachung und Kosteneffizienz.

## Strategischer Hebel
**Zero-Friction Onboarding:** Kein manuelles Eintippen von Speisekarten. Wir nutzen AI, um bestehende Strukturen der Konkurrenz zu absorbieren.

## Tech-Stack
- **Frontend:** Next.js (Dashboard)
- **Backend/DB:** Supabase (PostgreSQL)
- **AI-Engine:** OpenAI Vision API / Anthropic Claude Vision
- **Storage:** Supabase Storage (für Menü-Uploads)

---

## Phasen & Meilensteine

### PHASE 1: DAS CORE-MVP (Das Gastronomen-Dashboard)
- Core-Infrastruktur & Authentifizierung.
- ✨ **Magic AI Onboarding (Menü-Import):** Gastronomen können ein Foto, PDF oder einen Screenshot ihrer bestehenden Lieferando-Speisekarte hochladen. Eine AI (Vision API) parst die Gerichte, Preise und Kategorien automatisch und speichert sie strukturiert in unserer Supabase-Datenbank. Onboarding in 10 Sekunden statt manueller Dateneingabe.
- CRUD-Interface für finales Speisekarten-Management und Korrekturen.

### PHASE 2: DER MARKTPLATZ (M13–M18) ✅

**Domain-Architektur (final beschlossen 2026-04-04):**
- `bizzn.de` → Kunden-Discovery-App (Restaurant entdecken, filtern, bestellen)
- `app.bizzn.de` → Restaurant-Dashboard (Gastronomen)
- `{slug}.bizzn.de` → Restaurant-Profilseite (Kunden-Einstieg)

**Kunden-Philosophie:** Die Kunden gehören dem Restaurant — nicht Bizzn.
- Ein Plattform-Account gilt für alle Restaurants
- Restaurant besitzt sein CRM, kann exportieren & direkt kontaktieren
- Bizzn vermarktet Kundendaten niemals cross-restaurant

**Go-to-Market — Lieferando-Abgreifer-Strategie:**
- Restaurants legen Flyer mit QR-Code aus (bereits in M12 gebaut)
- Text: "Nächstes Mal direkt bestellen → X% Rabatt auf deine Erstbestellung"
- Willkommensrabatt: Restaurant setzt % oder €-Betrag im Dashboard
- Automatisch bei erster Bestellung eingelöst → kein Kommissionsmodell

**Broadcast-Kanal:** Web Push (primär, kostenlos) + E-Mail (Fallback)
**Monetarisierung:** Monatliche Flatrate (keine Provision pro Bestellung)

| # | Milestone | Status |
|---|---|---|
| M13 | Domain-Umstrukturierung (app.bizzn.de, Middleware) | ✅ Done |
| M14 | Restaurant-Profilseite ({slug}.bizzn.de) + Dashboard Profil-Einstellungen | ✅ Done |
| M15 | Kunden-Auth (Inline-Modal, ein Account für alle Restaurants) | ✅ Done |
| M16 | Willkommensrabatt (Erstbestellungsrabatt, Dashboard-konfigurierbar) | ✅ Done |
| M17 | bizzn.de Discovery-App (Filterung, faire Zufalls-Rotation) | ✅ Done |
| M18 | Web Push Broadcast (Restaurant-Button → alle Kunden sofort erreichbar) | ✅ Done |

---

### PHASE 3: CHECKOUT & KUNDEN-ERLEBNIS (M19–M27)

#### 🏗️ Architektur-Entscheidungen (beschlossen 2026-04-08)

| Thema | Entscheidung |
|---|---|
| Discovery → Restaurant | Slide-In von rechts, kein iframe — natives Rendering auf bizzn.de |
| URL beim Öffnen | bleibt `bizzn.de` (kein Deep-Link) |
| Desktop Layout | Split-Screen (Discovery links abgedimmt, Panel rechts) |
| Mobile/Tablet | Slide-In = 100% Breite, iOS-/Android-Feeling |
| Auth-Methode | E-Mail + Passwort |
| E-Mail-Bestätigung | **Deaktiviert** in Supabase → sofortige Registrierung |
| Session-Dauer | 30 Tage Auto-Login |
| Kundenkonto | Global (ein Konto für alle Bizzn-Restaurants) |
| Checkout-Flow | 3 Schritte: Warenkorb → Review+Auth → Bestell-Status |
| Pflichtfelder | Name + E-Mail + Telefon (Abholung/Lieferung), Anonym (Vor-Ort) |
| Abholzeit | M24 (Zeitslots) — bis dahin kein Zeitfeld |
| Telefon | Im Kundenprofil gespeichert, nicht pro Bestellung |
| Warenkorb | localStorage — bleibt erhalten wenn Slide-In geschlossen wird |
| Status-Seite | Im Slide-In, Live-Refresh via Supabase Realtime |
| Bestellstatus-Stufen | Neu → In Vorbereitung → Bereit → Abgeholt/Geliefert |
| QR-Code Tischbestellung | Bleibt anonym via slug.bizzn.de (unveränderter Bestands-Flow) |
| Online-Zahlung | M25 (Stripe) |

---

#### ✅ M19 — Discovery Visual Upgrade (abgeschlossen 2026-04-08)
- Animierter Hero, Kategorie-Icon-Leiste, Sticky Filter-Bar
- Premium Restaurant-Cards mit Deal- & Neu-Badges
- Restaurant-Info: Zentriertes Modal (dunkel, aus rechts einschiebbares Panel ab M20)
- API-Erweiterung: `deal_badge`, `is_new`, Filter-Parameter

---

#### ✅ M20 — Checkout & Discovery Neubau (abgeschlossen 2026-04-08)

**Ziel:** Den kaputten iframe-Checkout komplett ersetzen durch natives Slide-In auf bizzn.de.

**Neue Dateien:**
- `app/api/menu/[slug]/route.ts` — Menüdaten-API für Discovery
- `components/discovery/RestaurantSlideIn.tsx` — Slide-In Container (responsive: Split auf Desktop, Full auf Mobile)
- `components/storefront/InlineMenuBoard.tsx` — Menü + 3-Schritt-Checkout (Dark Mode)

**Geänderte Dateien:**
- `app/(landing)/page.tsx` — Modal → Slide-In, kein iframe mehr
- `components/storefront/CustomerAuthModal.tsx` — nicht mehr im Hauptflow

**Supabase:**
- E-Mail-Bestätigung deaktivieren (Auth → Settings → Email Confirmations OFF)
- Keine neue DB-Migration nötig

**3-Schritt-Checkout:**
1. Warenkorb (Items, Summe, Ordertype-Auswahl, Rabatt-Banner)
2. Review & Auth (Name/Email/Tel editierbar, Passwort bei Neu-Registrierung, Lieferadresse bei Lieferung)
3. Status-Seite (Bestellnummer, Items, Live-Status via Supabase Realtime)

---

#### ✅ M21 — Kundenkonto-Portal (abgeschlossen 2026-04-08)

**Ziel:** `bizzn.de/mein-konto` — globales Bizzn-Kundenkonto für Endkunden

**Features:**
- Profil: Name, E-Mail, Telefon ändern
- Bestellhistorie (alle Restaurants, mit Status)
- Bonuskarten-Übersicht (Local-Hero Bonuskarte je Restaurant)
- Link-Button erscheint auf bizzn.de nach dem Einloggen (im Header)

---

#### ✅ M22 — Kitchen Display Vollbild-Upgrade (abgeschlossen 2026-04-08)

**Ziel:** Separates Fullscreen-Display für Tablet/Monitor in der Küche

**Features:**
- `/kitchen` Route (oder `/dashboard/project/[id]/kitchen`) — Auto-Refresh via Realtime
- Große Touch-Buttons: Neu → In Vorbereitung → Bereit → Abgeholt/Geliefert
- Status-Update triggert Live-Update beim Kunden (M20-Statusseite)
- Optimiert für Landscape-Modus, dauerhafter Betrieb ohne Tastatur
- Bestehende KDS-Komponente wird erweitert/ersetzt

---

#### ✅ M23 — Local-Hero Bonuskarte (abgeschlossen 2026-04-08)

**Ziel:** Kundenbindung durch restaurant-spezifisches Bonus-System

**Implementiert:**
- DB-Tabelle `loyalty_balances` (user_id, project_id, balance_cents, order_count, last_order_at)
- `orders.loyalty_spent_cents` + `projects.loyalty_enabled` (Default: AN)
- `placeOrder()` erweitert: 10 % Gutschrift, 90-Tage-Verfall, Auto-Einlösung bei 6. Bestellung
- `LoyaltySettingsBlock` im Restaurant-Dashboard (Toggle + Statistik)
- `GET /api/loyalty/balance` — Kundenguthaben-Endpunkt mit Ablaufdatum
- `bizzn.de/mein-konto` → Bonuskarten-Tab mit Fortschrittsbalken + Ablaufwarnung

---

#### ✅ M24 — Abholzeit-Slots (abgeschlossen 2026-04-10)

**Ziel:** Restaurant definiert Zeitslots, Kunde wählt beim Bestellen

**Implementiert:**
- DB-Migration `20260410_m24_pickup_slots.sql`: Tabelle `pickup_slots` (Wochentag, 15-Min-Raster, Label, is_active), Spalte `pickup_slot` auf `orders`, RLS-Policy (anon SELECT aktive Slots)
- `projects.pickup_slots_enabled` (toggle): Feature an/aus schaltbar
- `PickupSlotsBlock` im Dashboard: Toggle + Wochentag-Accordion + 15-Min-Dropdown + einzelnes Speichern pro Tag
- Server Actions: `updatePickupSlotsEnabled`, `getPickupSlots`, `replacePickupSlots`, `getPublicPickupSlots`
- Checkout (Schritt 2, `InlineMenuBoard`): Slot-Dropdown mit Optgroup/Wochentag-Gruppierung — Default: "⚡ So schnell wie möglich"
- `placeOrder` + `checkoutWithAuth`: Slot als lesbaren Text (z. B. "Montag · 12:15 Uhr") in `orders.pickup_slot` speichern
- KDS (`KitchenDisplayFullscreen`): Slot-Badge auf jeder Bestellkarte sichtbar

---

#### ✅ M25 — Online-Zahlung (Stripe) — abgeschlossen 2026-04-10

**Ziel:** Optionale Vorauszahlung per Karte/Apple Pay/Google Pay

**Implementiert:**
- DB-Migration `20260410_m25_stripe_payments.sql`: `orders.payment_status` + `orders.stripe_payment_intent_id` + `projects.online_payment_enabled`
- `POST /api/stripe/create-payment-intent` — erstellt Payment Intent auf Connect-Account, speichert in `orders`
- Webhook `payment_intent.succeeded` + `payment_intent.payment_failed` → synct `payment_status`
- `StripePaymentBlock` im Dashboard: Connect-Status, Onboarding-Link, Toggle Online-Zahlung
- Settings-Page: Neuer Abschnitt „Online-Zahlung" mit `StripePaymentBlock`
- `InlineMenuBoard`: Zahlungsart-Auswahl (Bar / Karte), Stripe Elements (lazy load), 2-Schritt-Flow (Order anlegen → Payment Intent → Stripe.confirmPayment)
- KDS: `💳 Online bezahlt` / `❌ Zahlung fehlgeschlagen` Badge auf Bestellkarten
- Barzahlung immer als Alternative verfügbar

---

#### ✅ M26 — No-Show-Schutz (abgeschlossen 2026-04-10)

**Ziel:** Missbrauch durch nicht abgeholte Bestellungen verhindern

**Implementiert:**
- DB-Migration `20260410_m26_no_show_protection.sql`: `orders.no_show`, `customer_profiles.is_blacklisted` + `blacklist_reason` + `blacklisted_at` + `cash_order_count` + Performance-Indizes
- `markNoShow(orderId, projectId)` Server Action: Markiert Order, sperrt Kunden (1-Strike-Prinzip) bei Barzahlungs-No-Show
- `unblacklistCustomer(userId)` + `getNoShowBlacklist(projectId)` — Gastronom-Actions
- `checkNoShowBlacklist(userId)` — Checkout-Guard: Prüft Sperre vor Barzahlung
- `NoShowBlacklistBlock` im Dashboard-Settings: Gesperrte Kunden anzeigen, Entsperren-Button
- `KitchenDisplay`: „No-Show melden"-Button auf Bestellkarten (Barzahler, Status „bereit")
- `CheckoutInput.paymentMode`: Server weiß ob Bar oder Karte → Blacklist-Check greift nur bei Barzahlung

---

#### 👑 M27 — Bizzn-Pass (Kunden-Abo 4,99 €/Monat)

**Ziel:** Premium-Abo für Endkunden

**Features:**
- Dynamischer 0 € Liefer-MBW (Restaurant legt pro PLZ selbst fest)
- Bizzn Drive-In: VIP-Abholung (Kellner bringt Essen ans Auto)
- Stempel-Booster: 15% statt 10% auf die Local-Hero Bonuskarte
- Verwaltung: `bizzn.de/mein-konto` → Abo-Tab

---

## 💡 Feature-Ideenpool (noch nicht geplant)

> Kein Milestone zugewiesen. Reihenfolge = keine Priorität.

| ID | Name | Kurzbeschreibung |
|----|------|-----------------|
| A | **Support-Your-Local-Zähler** | Ersparnis im Warenkorb anzeigen (vs. Lieferando-Provision) |
| B | **Web-App Push-Benachrichtigungen** | Echtzeit-Bestellinfos direkt aufs Tablet/Handy des Gastronomen |
| C | **Büro-Runde / Sammelbestellung** | Gemeinsamer Bestell-Link für Firmen (kollektive Bestellung) |
| D | **Mittags-Matrix** | Gezielte Lunch-Deals (11–14 Uhr) mit Zeitsteuerung |
| F | **Echt-Chemnitz-Siegel** | Lokales Branding / Vertrauenssiegel „0 % Provision" |
| G | **Hyper-Local PLZ-Zonen** | Variable Liefergebühren & Mindestbestellwerte je PLZ (Fokus Chemnitz) |
| J | **Gastro-Sharing** | Lokale Partner-Vernetzung & Cross-Selling zwischen Restaurants |
| K | **KI-Sprachbestellung** | „Voice-to-Cart" & Payment per Spracheingabe |
| L | **Gastro-Retter** | Abend-Deals ab 21 Uhr (gegen Lebensmittelverschwendung) |
| O | **B2B Mitarbeiter-Guthaben** | Steuerfreier Sachbezug (44 €/Monat) für Chemnitzer Firmen |
| P | **Mehrweg-System** | Integration von ReCup/Vytal in den Bestellprozess |
| Q | **Live-Küchen-Status** | Auslastungsanzeige für Kunden ("Küche unter Hochdruck") |
| T | **KI-Bewertungs-Manager** | Automatisierte Antwortentwürfe auf Kundenbewertungen |
| W | **Hardware-Plug-and-Play** | Einmal-Verkauf Starter-Kit (~249–299 €): vorkonfiguriertes Tablet & Bondrucker |
