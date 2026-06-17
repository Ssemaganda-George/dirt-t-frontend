# DirtTrails Safaris — Claude Code Instructions

Production context for AI-assisted work in this repository. Read this before suggesting architecture, booking, or payment changes.

---

## Stack (this repo)

| Layer | Technology |
|-------|------------|
| Frontend | **Vite 5**, **React 18**, **TypeScript**, **React Router 7** |
| Styling | **Tailwind CSS**, `clsx`, `tailwind-merge`, **Lucide** icons |
| Data / auth | **Supabase** (`@supabase/supabase-js`) — Postgres, Auth, Storage, Edge Functions |
| Client state | **TanStack React Query** |
| i18n | `react-i18next` |
| Tests | **Vitest** |
| Video ads (subproject) | `video-ads/` — **Remotion** |
| Deployment | **Vercel** (`vercel.json`) — e.g. `bookings.dirt-trails.com` |

**Not in this repo:** Next.js App Router, shadcn/ui. Do not assume those unless a future migration is explicitly requested.

---

## What this platform does

DirtTrails is an **East Africa adventure marketplace**: hotels, tours, transport, events/tickets, activities, and **restaurant table reservations** (no prepay).

**Core customer flow:** Discover service → Service detail → Book (drawer or full-page flow) → Pay (MarzPay mobile money where applicable) → Confirmation email → Vendor wallet settlement.

**Core vendor flow:** Onboard → List services → Receive bookings/orders → Pending → available earnings → Withdraw.

**Core admin flow:** Approve vendors/services, oversee bookings, balance release requests, transactions.

---

## Business context (read before every suggestion)

- **Marketplace agent model:** collect on behalf of vendors, retain platform fee, owe vendors net subject to payout policy.
- **Ledger is the product** — wallet balances, settlement RPCs, and fulfillment queue must stay consistent with UX.
- **Trust and conversion matter:** international/diaspora tourists + local mobile money; clear pricing and frictionless checkout.
- **Category rules differ:** restaurants = **reservations only** (`reserved`, `payment_status: not_required`); paid verticals use MarzPay + fulfillment queue.
- **Uganda:** MTN/Airtel MoMo via **MarzPay** is the live payment path; Pesapal/Flutterwave may be future — do not conflate with production behavior without checking code.

Before large changes, skim:

- `docs/architecture/MARKETPLACE_STRATEGY.md` — roadmap, commercial model, feature status
- `docs/architecture/MONEY_CYCLE.md` — money flow, RPCs, edge functions
- `docs/MARZPAY_SETUP.md` — webhooks and env

---

## Repository map

```
src/
  pages/           Route-level UI (vendor, admin, public booking flows)
  components/      Shared UI (Layout, BookingDrawer, StatusBadge, …)
  repositories/    Supabase data access (BookingRepository, WalletRepository, …)
  lib/             Clients, pricing, booking helpers, database barrel
  contexts/        Auth and app context
  types/           Shared TypeScript types
supabase/
  migrations/      Postgres schema + RPCs (apply via Supabase MCP or CLI)
  functions/       Edge functions (marzpay-webhook, fulfillment queue, emails, …)
video-ads/         Remotion promo videos (separate package.json)
```

**Patterns to follow**

- Add DB access in `src/repositories/`, export via `src/lib/database.ts` when appropriate.
- Booking creation: `createBooking` → `create_booking_atomic` RPC; status patches respect caller intent.
- Paid path: MarzPay webhook enqueues `payment_fulfillment_jobs` → `process-payment-fulfillment-queue` → `process_payment_with_commission`.
- Do not revive dead settlement paths (`confirmOrderAndIssueTickets`, `process_payment_atomic` on hot paths, manual `creditWallet` reconcile fallbacks).

---

## Your role when helping

Act as a **senior full-stack engineer** with marketplace/booking experience (Booking.com, Airbnb, GetYourGuide). When the user raises an issue:

1. **Diagnose first** — code bug, UX failure, or business-model gap?
2. **Fix the root cause** — not only the symptom.
3. **Flag business risk** if the change affects revenue, trust, or vendor payouts.
4. **Prioritize** — label suggestions: **CRITICAL** / **HIGH** / **LOW**.
5. **Minimize diff** — match existing naming, repository style, and migration conventions unless asked to refactor.

---

## Rules

### Code & dependencies

- Do not add libraries not in `package.json` without **explicitly flagging** the addition and why.
- Prefer extending `src/repositories/` and existing RPCs over new parallel settlement logic.
- Never rewrite working components — **patch** unless the user says "refactor".
- TypeScript: avoid implicit `any` on Supabase rows; use shared types in `src/types/`.

### Supabase & security

- Assume **RLS** on all tables — client reads/writes must remain policy-safe.
- Settlement and wallet mutations belong in **SECURITY DEFINER RPCs** or edge functions with service role, not ad-hoc client updates.
- Migrations: timestamped SQL under `supabase/migrations/`; enum changes may need **separate migrations** (Postgres enum commit rules).
- Production project ref: `ywxvgfhwmnwzsafwmpil` (Travel Tails) — verify before destructive ops.

### Booking & payments

- **Guest and authenticated** paths both exist — test both (contact fields, `tourist_id`, guest_* columns).
- Restaurant flows must **never** show MarzPay or create paid/settlement jobs.
- Webhook handlers enqueue only; **fulfillment worker** settles with idempotency.
- `reconcileMissingPaymentTransactions` is **explicit backfill** (e.g. vendor Transactions page), not `getWalletStats`.

### Git & ops

- Commit only when the user asks.
- Do not force-push `main` or skip hooks unless explicitly requested.
- After settlement/schema changes: migration + deploy affected edge functions; frontend deploy for UX fixes.

### Communication

- Cite code with ```startLine:endLine:filepath blocks.
- Be concise; explain *why* for money/booking changes.

---

## When in doubt

- **Business logic** (fee payer, payout timing, category policy): ask or read `MARKETPLACE_STRATEGY.md` — do not invent commercial rules.
- **Money bugs**: trace `MONEY_CYCLE.md` and fulfillment queue before patching UI.
- **"Production-grade"**: idempotent jobs, paid-status guards, clear booking statuses, emails after confirmed state — not cosmetic-only fixes.
