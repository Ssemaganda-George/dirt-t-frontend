# Gemma Trip Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a guest-usable Gemma trip planner that returns a reconciled DirtTrails itinerary (BOOKABLE package spine + WISH gaps) with zero payment surface.

**Architecture:** Pure TS catalog/reconcile in `src/lib/tripPlanner`. Edge function `trip-planner` loads approved services (no shops), calls Gemma via Gemini API, reconciles ids to DB prices, writes `trip_plans`. React page `/plan` collects intent and renders the plan. Wish clicks write `trip_wish_requests` through the same function.

**Tech Stack:** Vite · React 18 · TypeScript · Supabase Edge (Deno) · Gemma (`GEMMA_MODEL` + `GEMINI_API_KEY` as **function secrets**, never `VITE_*`) · Vitest

## Global Constraints

- No MarzPay, wallets, bookings, payments, or ledger writes
- Restaurants always `reservation` (category_id `cat_restaurants`), never priced
- Shops (`cat_shops`) never enter the catalog
- Model emits `service_id` only; displayed price is the DB `services.price` + `currency`
- Prefer one tour package as the trip spine; stitch only if none fits
- Guests allowed; cap 5 plans per `visitor_id` per UTC day
- Do not add npm packages
- Do not commit unless the user asks

---

### Task 1: Catalog filter + reconcile + JSON parse (tested)

**Files:**
- Create: `src/lib/tripPlanner/types.ts`
- Create: `src/lib/tripPlanner/catalog.ts`
- Create: `src/lib/tripPlanner/parse.ts`
- Create: `src/lib/tripPlanner/reconcile.ts`
- Test: `src/tests/tripPlanner.test.ts`

---

### Task 2: SQL tables + RLS

**Files:**
- Create: `scripts/create-trip-planner-tables.sql`
- Create: `supabase/migrations/20260819140000_trip_plans.sql`

---

### Task 3: Edge function `trip-planner`

**Files:**
- Create: `supabase/functions/trip-planner/index.ts`
- Create: `supabase/functions/trip-planner/config.toml` (`verify_jwt = false`)

Secrets (operator): `GEMINI_API_KEY`, `GEMMA_MODEL` (default `gemma-4-26b-a4b-it`)

---

### Task 4: Plan page + route + tours CTA

**Files:**
- Create: `src/lib/tripPlannerClient.ts`
- Create: `src/pages/TripPlanner.tsx`
- Modify: `src/App.tsx` — lazy route `/plan` and `/plan/:id`
- Modify: `src/pages/CategoryPage.tsx` — tours CTA → `/plan`
