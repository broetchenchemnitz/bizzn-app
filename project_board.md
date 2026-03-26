# Bizzn – Project Board

## 📋 Todo
- [ ] Customer-facing order tracking page

## 🔄 In Progress
*(empty)*

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
