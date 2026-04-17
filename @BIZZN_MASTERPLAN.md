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

#### ✅ M27 — Bizzn-Pass (Kunden-Abo 4,99 €/Monat) — abgeschlossen 2026-04-17

**Ziel:** Premium-Abo für Endkunden

**Implementiert:**
- DB-Migration `20260411_m27_bizzn_pass.sql`: Tabelle `bizzn_pass_subscriptions`, SQL-Funktion `has_active_bizzn_pass()`, `projects.drive_in_enabled`
- Stripe-Abo-Flow: `/api/stripe/bizzn-pass/subscribe` (Checkout Session), `/portal` (Kundenportal), `/api/bizzn-pass/verify` (Post-Checkout-Sync), `/reactivate`, `/status`
- Webhook-Sync: `customer.subscription.updated/deleted` → `bizzn_pass_subscriptions` automatisch aktualisiert
- Stempel-Booster: Bizzn-Pass-Inhaber erhalten 10 % statt 5 % Loyalty-Gutschrift (`placeOrder()` → `creditRate = passActive ? 0.10 : 0.05`)
- Drive-In VIP-Abholung: `DriveInArrivalCard`, `DriveInSettingsBlock`, `DriveInToast`, `app/actions/drive-in.ts` — exklusiv bei Online-Vorauszahlung (`payment_status = 'paid'`) + Bizzn-Pass
- Abo-Tab in `bizzn.de/mein-konto`: Sales-Page (Nicht-Abonnenten), Verwaltungs-Ansicht (aktive/gekündigte Abos), Reaktivierung, Stripe-Portal-Link
- Transparenz-Hinweis: Drive-In nur bei Online-Zahlung — auf Sales-Page und aktiver Pass-Ansicht
- Admin-Dashboard: `/admin/passes` — Bizzn-Pass Übersicht (Abonnenten, Kündigungen, Einnahmen)

---

### PHASE 4: ERWEITERTE FEATURES (M28–M29)

---

#### ✅ M28 — Optionen, Extras & Kundennotiz — abgeschlossen 2026-04-17

**Ziel:** Gerichte mit konfigurierbaren Optionsgruppen (Größe, Extras, Beilagen) erweitern + Freitext-Bestellnotiz

**Implementiert:**

**A) Datenmodell:**
- DB-Migration `20260417_m28_menu_options.sql`: Tabellen `menu_option_groups`, `menu_options`, `order_item_options` + Spalte `order_items.customer_note`
- Performance-Indizes + RLS-Policies (anon READ für Storefront/Checkout)
- Zusätzlich: `20260415_m28_customer_management.sql` — Pro-Restaurant Kundensperre (`is_banned`, `ban_reason` auf `restaurant_customers`)
- TypeScript-Typen in `types/supabase.ts` für alle drei neuen Tabellen

**B) Dashboard (Gastronom):**
- `EditMenuItemForm.tsx`: Optionen & Extras-Sektion im Item-Editor mit Gruppen-CRUD
- `MenuOptionGroupEditor.tsx`: Inline-Add/Edit/Delete für Optionen, Reorder (Pfeile), Pflicht-Badge, Default-Stern, Preis-Eingabe
- `CopyOptionsModal.tsx`: Optionsgruppen von einem Gericht auf ein anderes kopieren
- Server Actions: `getOptionGroups`, `createOptionGroup`, `updateOptionGroup`, `deleteOptionGroup`, `createOption`, `updateOption`, `deleteOption`, `reorderOptionGroups`, `reorderOptions`, `copyOptionGroupsToItem`

**C) Checkout (Kunde):**
- `InlineMenuBoard.tsx`: Options-Drawer beim "In den Warenkorb"-Klick, Pflichtgruppen-Validierung, Aufpreise live eingerechnet, `customerNote` pro Artikel
- API-Route `/api/menu/[slug]`: Nested Select `menu_option_groups(*, menu_options(*))`
- `placeOrder()`: Subtotal inkl. Options-Aufpreise, `order_item_options`-Snapshot, `customer_note` gespeichert

**D) KDS (Küche):**
- `KitchenDisplayFullscreen.tsx`: Optionen + `📝 customer_note` auf Bestellkarten, Supabase Select inkl. `order_item_options`, Bon-Druck mit Optionen + Notiz

---

#### ✅ M29 — URL-Import (Lieferando & Co.) — abgeschlossen 2026-04-17

**Ziel:** Speisekarte per URL von Lieferando, Wolt, Uber Eats oder beliebiger Website automatisch importieren — Zero-Friction Onboarding

**Implementiert:**

**A) 3-Tab Magic-Import (UI):**
- Tab 1: 🔗 URL importieren (NEU, Default)
- Tab 2: 📄 PDF / Bild (besteht)
- Tab 3: ✏️ Text (besteht)
- Plattform-Logos (Lieferando-Orange, Wolt-Blau, Uber-Eats-Grün) + Hinweis „auch andere Websites"
- Fortschritts-Steps beim Scan: Seite laden → KI analysiert → Vorschau
- Detaillierte Vorschau-Tabelle: Kategorien-Akkordeon, Checkboxes pro Gericht, Preis, Optionen-Count, Bild-Indikator
- „Alles auswählen / abwählen"-Toggle, selektiver Import
- Responsive: Mobile + Desktop optimiert
- Fallback-Hinweis bei Fehler: „Nutze den Foto-Import als Alternative"

**B) Scraping-Pipeline:**
- **Browserless.io `/smart-scrape`** API (Amsterdam-Endpoint, Free-Tier 1k Units/Monat)
- Cascading Strategy: HTTP-Fetch → Proxy → Headless Browser → Captcha-Solving
- Output: Markdown + Screenshot (dual-input für höhere AI-Accuracy)
- Plattform-Erkennung: Lieferando, Wolt, Uber Eats + beliebige URLs

**C) AI-Parsing (Gemini 2.5 Flash):**
- Markdown + Screenshot als dual-input → strukturiertes JSON
- Extrahiert: Kategorien, Gerichte (Name, Preis, Beschreibung), Optionsgruppen + Optionen (M28-Struktur)
- Aufpreise in Cent, isRequired/maxSelect-Erkennung, Bild-URLs
- Plattform-spezifischer Prompt-Hint für bessere Ergebnisse

**D) Import-Daten:**
- Kategorien → `menu_categories`
- Gerichte → `menu_items` (Name, Preis in Cent, Beschreibung, is_active)
- Optionsgruppen → `menu_option_groups` (M28: is_required, min/max_select, sort_order)
- Optionen → `menu_options` (M28: price_cents, is_default, sort_order)
- Bilder → Download nach Supabase Storage (`menu-images` Bucket), Pfad: `url-import/{projectId}/...`

**E) Neue Dateien:**
- `POST /api/menu/url-import` → Browserless Scrape + Gemini Parse → Vorschau-JSON (kein DB-Write)
- `POST /api/menu/url-import/confirm` → Vorschau → DB-Insert (Kategorien, Items, Optionen, Bilder)
- `app/dashboard/project/[id]/menu/magic-import/page.tsx` → 3-Tab UI mit Vorschau

**F) Infrastruktur:**
- Env: `BROWSERLESS_API_TOKEN`, `BROWSERLESS_BASE_URL` (Amsterdam: `production-ams.browserless.io`)
- Kosten: ~1 Unit pro Scrape (Free-Tier: 1.000/Monat), Gemini Flash: ~$0.001 pro Parse

---

#### 🔲 M30 — Auto-Profil aus URL-Import — geplant

**Ziel:** Beim URL-Import (M29) nicht nur die Speisekarte, sondern auch das gesamte Restaurant-Profil automatisch ausfüllen — One-URL Onboarding.

**Konzept:**
Wenn ein neuer Gastronom seine Wolt/Lieferando-URL im Magic Import eingibt, extrahiert die KI zusätzlich zur Speisekarte:

**A) Extrahierte Profildaten:**
- Restaurantname → Projektname überschreiben
- Kurzbeschreibung
- Adresse
- Telefonnummer (falls verfügbar)
- Öffnungszeiten (pro Wochentag, Format: „11:00–22:00" oder „geschlossen")
- Küchen-Typ (z.B. „Syrisch", „Italienisch")
- Cover-Bild → automatisch nach Supabase Storage hochladen
- Web-Adresse (Slug) → aus Restaurantname ableiten (z.B. „Syriana Bistro" → `syriana-bistro`)

**B) UI-Vorschau:**
- Profildaten werden in der Import-Vorschau angezeigt (vor Speisekarte)
- Gastronom kann Felder vor Bestätigung korrigieren
- Hinweis auf fehlende Felder: „Telefonnummer war nicht verfügbar — bitte manuell nachtragen"

**C) Import-Logik:**
- Nur **leere Felder** werden befüllt (keine Überschreibung bestehender Daten)
- Cover-Bild wird in Supabase Storage geladen (`profile/{projectId}/cover.webp`)
- Slug wird generiert und auf Einzigartigkeit geprüft
- Eine URL pro Import (kein Multi-URL-Merging)

**D) Betrifft:**
- `POST /api/menu/url-import` → Gemini-Prompt erweitern um Profildaten-Extraktion
- `POST /api/menu/url-import/confirm` → Profildaten + Slug + Cover-Bild speichern
- `magic-import/page.tsx` → Vorschau-Sektion für Profildaten
- `projects`-Tabelle → Name, Description, Address, Phone, Opening Hours, Cuisine, Cover, Slug

---

#### 🔲 M31 — Onboarding-Wizard (Gastronomen) — geplant

**Ziel:** Neue Gastronomen werden nach der Registrierung durch einen geführten Setup-Wizard geleitet, der ihr Restaurant in wenigen Minuten komplett einrichtet — inklusive Speisekarten-Import, Profil und Live-Schaltung.

**Trigger:** Der Wizard startet automatisch beim ersten Dashboard-Besuch (wenn kein Projekt existiert oder ein Projekt im Entwurfsmodus ist). Kann jederzeit manuell neu gestartet werden.

**A) Wizard-Schritte:**

| # | Schritt | Pflicht? | Details |
|---|---------|----------|---------|
| 1 | **Restaurantname** | ✅ | Freitextfeld, wird als Projektname gespeichert |
| 2 | **URL-Import** | ❌ | Wolt/Lieferando-URL eingeben → Speisekarte + Profildaten (M30) automatisch. Alternative: "Keine URL, ich mache es manuell" → überspringen |
| 3 | **Profil vervollständigen** | ❌ | Beschreibung, Adresse, Telefon, Öffnungszeiten, Küchen-Typ, Cover-Bild. Ggf. aus M30 vorausgefüllt. Hinweis auf fehlende Felder ("Telefon war nicht verfügbar") |
| 4 | **Web-Adresse wählen** | ✅ | Slug: `dein-restaurant.bizzn.de`. Auto-Vorschlag aus Restaurantname. Einzigartigkeit wird geprüft |
| 5 | **Bestellkanäle & Lieferung** | ❌ | Toggles: Abholung ✅ (Default an), Lieferung ❌, Tischbestellung (In-Store) ❌. Bei Lieferung aktiviert → inline Liefergebühr (€), Mindestbestellwert (€), Gratislieferung ab (€) einstellen |
| 6 | **Standort & Discovery** | ❌ | Stadt + PLZ eingeben (nötig für bizzn.de Discovery-Filterung). "Auf bizzn.de entdeckt werden" Toggle (Default: an nach Bezahlung) |
| 7 | **Willkommensrabatt** | ❌ | Erstbestellungsrabatt %-Slider (Default: 10%). Erklärung: "Dein stärkstes Werkzeug um Gäste von Lieferando abzuwerben." Kann deaktiviert werden |
| 8 | **Vorschau** | - | "So sieht dein Restaurant aus" — inline Vorschau der Storefront im Wizard (wie Kunden es auf `slug.bizzn.de` sehen werden) |
| 9 | **Live schalten** (Stripe 99€) | ❌ | "Jetzt online gehen" → Stripe Checkout → Restaurant wird öffentlich + auf bizzn.de sichtbar. ODER "Später" → Entwurf bleibt gespeichert, unbegrenzt |

**Nicht im Wizard (zu fortgeschritten, später über Einstellungen):**
- Local-Hero Bonuskarte (Default: an) — läuft automatisch
- Abholzeit-Slots/Vorlaufzeit — Feintuning
- Online-Zahlung / Stripe Connect — komplexes Setup
- No-Show-Schutz / Blacklist — erst relevant nach ersten Bestellungen
- Drive-In (VIP) — Bizzn-Pass Feature

**B) Entwurfsmodus:**
- Projekte starten im Status `draft` (Entwurf)
- **Nicht öffentlich**: Kein Eintrag auf bizzn.de Discovery, kein `slug.bizzn.de`, Kunden können nicht bestellen
- **Unbegrenzter Entwurf**: Kein Zeitlimit — erst wenn der Gastronom live gehen will, zahlt er
- **Visueller Unterschied**: 🟡 "Entwurf" Badge am Projekt im Dashboard vs. 🟢 "Live" Badge nach Bezahlung
- Alle Dashboard-Funktionen (Speisekarte bearbeiten, Einstellungen etc.) sind im Entwurf verfügbar

**C) UX-Entscheidungen:**
- **Überspringbar**: Jeder optionale Schritt kann übersprungen werden ("Später machen")
- **Fortschritt wird gespeichert**: Bei Abbruch (Browser schließt) → beim nächsten Login dort weitermachen
- **Wizard neu starten**: Button im Dashboard oder Einstellungen
- **Mobile-optimiert**: Große Touch-Buttons, einfache Layouts, responsive Design
- **Fullscreen-Layout**: Eigene Seite ohne Dashboard-Sidebar — fokussiertes Erlebnis

**D) Mehrere Restaurants:**
- Ein Account kann den Wizard mehrfach durchlaufen für weitere Restaurants
- Jedes Restaurant = eigenes Projekt mit eigenem Entwurf/Live-Status

**E) Betrifft:**
- Neuer DB-Status: `projects.status` = `draft` | `live`
- Neue Seite: `app/dashboard/onboarding/page.tsx` — der Wizard
- DB: `projects.onboarding_step` (int) — Fortschritt speichern
- `middleware.ts` → Redirect zu Wizard wenn erstes Projekt im Entwurf
- `app/(landing)/page.tsx` → Discovery filtert `draft`-Projekte raus
- `app/[domain]/page.tsx` → Storefront blockiert für `draft`-Projekte
- `components/dashboard/ProjectCard.tsx` → Draft/Live Badge
- Stripe Checkout wird aus dem Wizard heraus aufgerufen (nicht vorher)

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
