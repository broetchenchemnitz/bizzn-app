# Bizzn – Project Board

## 📋 Todo
*(all core features complete)*

## ✨ Phase 1 — Polish
- [x] Self-Service Slug Management UI (dashboard/project/[id] → SlugSettingsBlock, updateProjectSlug action, unique constraint handling, deployed 6b8a741..42f066d)
- [x] KDS Payout Transparency: 4th 'Ausgeliefert' column, PayoutBadge (green=paid/amber=pending), payout summary in live bar, realtime payout_status updates (deployed 42f066d..c0fe6cc)

## 🚀 Phase 2 — Growth & Compliance
- [x] Dashboard UI Polish: KPI glow shadows, extrabold typography, animated status pings, SlugSettingsBlock inline input group (deployed c0fe6cc..74f9506)
- [x] Radical Dashboard Grid Redesign: 12-col grid layout (col-span-8 main + col-span-4 sidebar), topnav with live badge, channels in sidebar, condensed ProjectSettingsBlock (deployed 74f9506..aebe3a9)
- [x] Magic Import UI Redesign: Premium glassmorphism card, radial gold gradient bg, layered spinner with blur-glow pulse, elevated upload zone with icon scale/glow hover (app/dashboard/project/[id]/menu/magic-import/page.tsx)

## 🔄 In Progress
- 📍 CURRENT MICRO-STATE: Applied Tech-Lead QA fixes to MagicImport UI (DND strict propagation stop, transform-gpu performance update, a11y focus rings).

## ✅ Done
- [x] Create Brand Assets (logo.svg, visual identity)
- [x] Init Next.js & Supabase
- [x] Setup Next.js App Router (layout/page)
- [x] Init Tailwind CSS & TypeScript Config
- [x] Setup Supabase Client & Env Variables
- [x] Create Auth Layout & Login Component
- [x] Implement Supabase Auth Middleware (Protected Routes)
- [x] Setup Global Layout & Navigation
- [x] Implement Dashboard Database Fetching
- [x] Deploy to Production & Verify Webhooks
- [x] Implement Stripe Connect Payment Flow
- [x] Build Project Creation UI & Connect Checkout
- [x] Set up Supabase schema & RLS policies
- [x] Implement Project Rename & Delete Functionality
- [x] Enforce strict TypeScript typing (remove all any/ts-ignore bypasses)
- [x] Implement User Profile Settings & Personalized Dashboard Greeting
- [x] Implement Interactive Task Board (Kanban) in Project Workspace
- [x] Gastro-OS Phase 1: Restaurant Dashboard with Bizzn Branding & KPI Cards
- [x] Menu Builder Database Schema & TypeScript Types (menu_categories, menu_items, RLS)
- [x] Menu Builder UI Phase 1: Category overview, add category form, routing
- [x] Menu Builder UI Phase 2: Menu items CRUD with price formatting and active toggle
- [x] Live Orders Database Schema & TypeScript Types (orders, order_items, RLS, union literals)
- [x] Realtime KPI Dashboard (Supabase Realtime subscription, live order counts & revenue)
- [x] Kitchen Display System (KDS): Realtime Kanban, 3-column order management, advance-status buttons
- [x] Fix: Wire Quick Action buttons to /orders and /menu routes
- [x] Multi-Tenant Subdomain Routing: middleware rewrite + app/[domain]/page.tsx storefront placeholder
- [x] Stripe Connect Schema: stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled added to projects
- [x] Stripe Connect Onboarding: /api/stripe/connect route + dashboard payout warning banner
- [x] Stripe Webhook account.updated: syncs charges_enabled + payouts_enabled to projects table
- [x] Daily Payout Cron: /api/cron/payouts + vercel.json 23:00 UTC schedule + CRON_SECRET
- [x] Middleware: added bizzn-chemnitz.vercel.app to MAIN_DOMAINS whitelist
- [x] DEPLOYED TO PRODUCTION: git push origin main → Vercel auto-deploy triggered (3ecd9a1..df69b4f)
- [x] Public Storefront: app/[domain]/page.tsx + MenuBoard cart UI + placeOrder server action (deployed df69b4f..8cd0ab0)
- [x] Project Slug: 004_add_project_slug.sql (unique, backfill) + .eq('slug') routing (deployed 8cd0ab0..e35f8d1)
- [x] Customer Order Tracking: /[domain]/order/[orderId] with Supabase Realtime + progress stepper (deployed e35f8d1..1817f3d)
- [x] In-Store Kiosk/QR: ?table=&mode=kiosk URL params, table_number DB column (migration 005), locked order type (deployed 1817f3d..8618e98)
- [x] Stripe Live Payouts: real stripe.transfers.create activated, payout_status idempotency guard (migration 006), deployed 8618e98..6b8a741
