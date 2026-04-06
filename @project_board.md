# 📊 BIZZN-APP — Project Board

## 📍 MICRO-STATE
| Feld | Wert |
|---|---|
| **Phase** | 6 |
| **Letzter Build** | ✅ Erfolgreich — M15 abgeschlossen (tsc clean, alle Routen kompiliert) |
| **Aktueller Schritt** | Phase 6 — M16: Willkommensrabatt 🚧 |
| **Constitution-Sync** | 2026-04-06 19:53 |

## 🏁 Milestone-Fortschritt

| # | Milestone | Status |
|---|---|---|
| M1 | Analytics Data-Aggregation | ✅ Done |
| M2 | Advanced Culinary Charts | ✅ Done |
| M3 | Multi-User Role System + RLS-Policies | ✅ Done |
| **M4** | **Live Kitchen-Status-Sync (Realtime)** | ✅ Done |
| **M5** | **UI Brand Foundation (Globals & Brand-DNA)** | ✅ Done |
| **M6** | **KDS Wrapper Layout & Brand DNA** | ✅ Done |
| **M7** | **KitchenDisplay Inner-Board Dark-Mode Polish** | ✅ Done |
| **M8** | **Dashboard Navigation & Layout Polish** | ✅ Abgeschlossen |
| **M9** | **Dashboard Core Fixes** | ✅ Abgeschlossen (Schema an types/supabase.ts angepasst, Dark Mode Culinary Gold injiziert) |
| **M10** | **Magic Import End-to-End Integration (Gemini Vision)** | ✅ Abgeschlossen — 2026-04-04 |
| **M11** | **Menu CRUD Polish & Full Item-Editor** | ✅ Abgeschlossen — 2026-04-04 |
| **M12** | **QR-Code Generator (Tisch-Kiosk-System)** | ✅ Abgeschlossen — 2026-04-04 |
| **M13-Pre** | **Superadmin-Bereich** | ✅ Abgeschlossen — 2026-04-05 |
| **M14** | **Restaurant-Profilseite** | ✅ Abgeschlossen — 2026-04-05 |
| **M15** | **Kunden-Auth (Storefront-Modal + Dashboard-Tab)** | ✅ Abgeschlossen — 2026-04-06 |
| **M16** | **Willkommensrabatt (Erstbesteller-Bonus)** | 🚧 In Progress |

## 🛠 M10 Aktionsplan (Sub-Tasks)
- [x] **M10.1 UI Overhaul:** `menu/magic-import/page.tsx` — Dual-Tab (PDF/Bild + Text), Drag & Drop Dropzone, FileGuard (10MB, Typ-Validierung), WCAG A11y (aria-live, aria-busy, role=alert/status). ✅ Erledigt
- [x] **M10.2 File-Upload Backend:** `GET /api/magic-import` (Gemini 1.5 Flash Vision) korrekt verdrahtet — FormData(`file` + `projectId`) → Gemini Vision → Supabase Insert mit `category_id`. ✅ Erledigt
- [x] **M10.3 Text-Import Backend:** `POST /api/magic-import/text` (neu) — Gemini 1.5 Flash Text-only, selbe Kategorien+Items-Logik wie Vision-Route. ✅ Erledigt
- [x] **M10.4 TypeScript-Validation:** `npx tsc --noEmit` — Kein neuer Fehler. ✅ Erledigt
- [x] **M10.5 Build-Validation:** `npm run build` — Exit 0, alle 24 Routen kompiliert. ✅ Erledigt
- [ ] **M10.6 GEMINI_API_KEY setzen:** `.env.local` Zeile 13 — Key von https://aistudio.google.com/app/apikey eintragen. 🔑 CEO-Action!

## 🛠 M8 Aktionsplan (Sub-Tasks)
- [x] **M8.1 Layout Scaffold:** `app/dashboard/layout.tsx` — Culinary Gold Sidebar, Auth-Guard, LogoutButton. ✅ Erledigt
- [x] **M8.2 Settings Dark-Mode:** `settings/page.tsx` — Culinary Gold Migration, Supabase-Pfad fix, Unique IDs. ✅ Erledigt
- [x] **M8.3 Menu Fallback:** `menu/page.tsx` — Fallback-State Culinary Gold, MenuManager + Supabase-Logik erhalten. ✅ Erledigt
- [x] **M8.4 Orders Route:** `app/dashboard/orders/page.tsx` — KDS Scaffold, Live-Indikator mit animate-pulse. ✅ Erledigt
- [x] **M8.5 Navbar/Footer Separation:** `(landing)/layout.tsx` erstellt, Root-Layout sterilisiert — Dashboard ist frei von Navbar/Footer. ✅ Erledigt

## 🛠 M4 Aktionsplan (Architektur & Sub-Tasks)
- [x] **M4.1 Supabase Realtime Setup:** Tabelle `orders` für Realtime-Broadcasting aktiviert (`alter publication supabase_realtime add table orders;`). ✅ Erledigt
- [x] **M4.2 Client Component Architektur:** `KitchenDisplay.tsx` mit vollständigem `postgres_changes`-Listener (INSERT/UPDATE/DELETE). ✅ Erledigt
- [x] **M4.3 State & Optimistic UI:** `useTransition` + lokales State-Management für `Pending → Preparing → Ready → Delivered`. ✅ Erledigt
- [x] **M4.4 Resilienz & Fehlerbehandlung:** `.subscribe(status)` Callback, `ConnectionStatus` State, Wifi-Indikator + `RetryCount`-Reconnect-Button. ✅ Erledigt

## 🩹 Hotfixes (Post-M4)

| Hotfix | Status |
|---|---|
| ESLint `no-explicit-any` — `route.ts`, `magic-import` (2×) | ✅ Erledigt |
| Deprecated `createRouteHandlerClient` → `createServerClient` | ✅ Erledigt |
| OpenAI Lazy Init — Build-Zeit Crash Fix | ✅ Erledigt |
| **Hotfix · KDS Viewport Layout** | ✅ Erledigt |

## 🛠 M11 Aktionsplan (Sub-Tasks)
- [x] **M11.1 Server Actions:** `updateMenuItem`, `deleteMenuItem`, `updateMenuCategory`, `deleteMenuCategory` in `app/actions/menu.ts` — chirurgisch ergänzt. ✅
- [x] **M11.2 EditMenuItemForm:** `components/EditMenuItemForm.tsx` — Inline-Edit-Form inkl. Preis (€→Cent), Aktiv-Toggle, Delete-Button, Culinary Gold Styling. ✅
- [x] **M11.3 EditCategoryInline:** `components/EditCategoryInline.tsx` — Hover-Aktionen (Rename/Delete), Enter=Save, Esc=Abbrechen, Item-Count Badge, Drag-Handle (visuell). ✅
- [x] **M11.4 Pages:** `menu/page.tsx` — EditCategoryInline + Item-Count pro Kategorie. `menu/[categoryId]/page.tsx` — Client Component mit Pencil-Toggle pro Item. ✅
- [x] **M11.5 Build-Validation:** `npm run build` — Exit 0, alle 26 Routen kompiliert. ✅

## 🛠 M12 Aktionsplan (Sub-Tasks)
- [x] **M12.1 QRCodeGenerator Component:** `components/QRCodeGenerator.tsx` — Client Component, Canvas-QR via `qrcode`-Library, Dual-Tab (Tisch-QR / Storefront-QR), Download-PNG-Button, Copy-URL, externer Link. ✅
- [x] **M12.2 Page Route:** `app/dashboard/project/[id]/qr-codes/page.tsx` — Server Component mit Auth-Guard + Ownership-Check, übergibt Slug + Projektname an Generator. ✅
- [x] **M12.3 Sidebar Nav:** `components/dashboard/SidebarPreviewLink.tsx` — QR-Code NavLink mit QrCode-Icon und Active-State, QrCode-Import aus lucide-react. ✅
- [x] **M12.4 Lint-Fix:** `IconSettings` (unused) aus `dashboard/layout.tsx` entfernt, `projectId` (unused) aus QRCodeGenerator-Props entfernt. ✅
- [x] **M12.5 Build-Validation:** `npm run build` — Exit 0, 28 Routen kompiliert inkl. `/dashboard/project/[id]/qr-codes` (12.5 kB). ✅

## 🛠 M16 Aktionsplan (Sub-Tasks)
- [ ] **M16.1 DB-Migration:** `projects`-Tabelle: `welcome_discount_pct` (integer, 0–100, nullable) + `welcome_discount_enabled` (boolean). Migration `008_m16_welcome_discount.sql`. TypeScript-Typen aktualisieren.
- [ ] **M16.2 Dashboard-Settings:** Discount-Toggle + Slider in `app/dashboard/project/[id]/settings/page.tsx`. Server Action `updateWelcomeDiscount` in `app/actions/project.ts`.
- [ ] **M16.3 Storefront-Anzeige:** Willkommensrabatt-Banner im Warenkorb (`MenuBoard.tsx` / `OrderForm`). Beim ersten Aufruf: Prüfe ob Erstbesteller (0 Bestellungen für dieses Projekt), zeige %-Badge + wende Rabatt automatisch bei Checkout an.
- [ ] **M16.4 Order-Service:** `orders`-Tabelle um `discount_pct` + `discount_amount_cents` erweitern. Server Action `createOrder` anpassen (Migration 009).
- [ ] **M16.5 Build-Validation:** `npm run build` — Exit 0.

## 💾 Save-Game
M15 abgeschlossen: Kunden-Auth vollständig implementiert. Storefront `{slug}.bizzn.de` hat CustomerBar (Hallo {name} / Anmelden). CustomerAuthModal: Tab Register/Login, Opt-Ins. Server Actions: signUpCustomer, signInCustomer, signOutCustomer, getCustomerSession. DB: customer_profiles + restaurant_customers (RLS korrekt). Dashboard Kunden-Tab: Kunden-Liste mit Stats (Gesamt/Push/Email-Opt-In), Tabelle, Broadcast-Hinweis M18. tsc clean. Constitution-Sync: 2026-04-06 19:53.
