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

## Phasen & Meilensteine

### PHASE 1: DAS CORE-MVP (Das Gastronomen-Dashboard)
- Core-Infrastruktur & Authentifizierung.
- ✨ **Magic AI Onboarding (Menü-Import):** Gastronomen können ein Foto, PDF oder einen Screenshot ihrer bestehenden Lieferando-Speisekarte hochladen. Eine AI (Vision API) parst die Gerichte, Preise und Kategorien automatisch und speichert sie strukturiert in unserer Supabase-Datenbank. Onboarding in 10 Sekunden statt manueller Dateneingabe.
- CRUD-Interface für finales Speisekarten-Management und Korrekturen.

### PHASE 2: DER MARKTPLATZ (M13–M18)

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

**Milestone-Übersicht M13–M18:**
- M13: Domain-Umstrukturierung (app.bizzn.de, Middleware)
- M14: Restaurant-Profilseite ({slug}.bizzn.de) + Dashboard Profil-Einstellungen
- M15: Kunden-Auth (Inline-Modal, ein Account für alle Restaurants)
- M16: Willkommensrabatt (Erstbestellungsrabatt, Dashboard-konfigurierbzr)
- M17: bizzn.de Discovery-App (Filterung, faire Zufalls-Rotation)
- M18: Web Push Broadcast (Restaurant-Button → alle Kunden sofort erreichbar)

---

## 💡 Feature-Ideenpool (noch nicht geplant – für spätere Diskussion)

> Ideen gesammelt 2026-04-05. Kein Milestone zugewiesen. Reihenfolge = keine Priorität.

| ID | Name | Kurzbeschreibung |
|----|------|-----------------|
| A | **Support-Your-Local-Zähler** | Ersparnis im Warenkorb anzeigen (vs. Lieferando-Provision) |
| B | **Web-App Push-Benachrichtigungen** | Echtzeit-Bestellinfos direkt aufs Tablet/Handy des Gastronomen |
| C | **Büro-Runde / Sammelbestellung** | Gemeinsamer Bestell-Link für Firmen (kollektive Bestellung) |
| D | **Mittags-Matrix** | Gezielte Lunch-Deals (11–14 Uhr) mit Zeitsteuerung |
| E | **In-House QR-Ordering** | Digitales Bestellen am Tisch (Gast scannt, Küche bekommt Bestellung) |
| F | **Echt-Chemnitz-Siegel** | Lokales Branding / Vertrauenssiegel „0 % Provision" |
| G | **Hyper-Local PLZ-Zonen** | Variable Liefergebühren & Mindestbestellwerte je PLZ (Fokus Chemnitz) |
| H | **Magic-Import & 10 % Rabatt** | Automatischer Menü-Einzug + Erstbesteller-Bonus für Kunden |
| I | **Bizzn-Pass Abo** | Monatliche Liefer-Flatrate für Endkunden |
| J | **Gastro-Sharing** | Lokale Partner-Vernetzung & Cross-Selling zwischen Restaurants |
| K | **KI-Sprachbestellung** | „Voice-to-Cart" & Payment per Spracheingabe |
| L | **Gastro-Retter** | Abend-Deals ab 21 Uhr (gegen Lebensmittelverschwendung) |
| N | **Digitale Stempelkarte** | Systemübergreifendes Punkte-Sammeln über alle Bizzn-Restaurants |
| O | **B2B Mitarbeiter-Guthaben** | Steuerfreier Sachbezug (44 €/Monat) für Chemnitzer Firmen |
| P | **Mehrweg-System** | Integration von ReCup/Vytal in den Bestellprozess |
| Q | **Live-Küchen-Status** | Auslastungsanzeige für Kunden ("Küche unter Hochdruck") |
| T | **KI-Bewertungs-Manager** | Automatisierte Antwortentwürfe auf Kundenbewertungen |
| W | **Hardware-Plug-and-Play** | Einmal-Verkauf Starter-Kit (~249–299 €): vorkonfiguriertes Tablet & Bondrucker |
