# DirtTrails — System Evaluation Findings

Live audit of Supabase (project `ywxvgfhwmnwzsafwmpil`) + the booking/payment code paths it talks to. Each item: classification, root cause, fix, priority, risk.

**Last updated:** 2026-06-12 — code fixes landed for #1 (partial), #2, #4; deploy migration + edge function to production.

---

## Fix status

| # | Priority | Status |
|---|----------|--------|
| 1 | CRITICAL | **In progress** — client settlement removed from `BookingRepository`; client `payment_status=paid` ignored on create; anon RPC revoke in migration. RLS (#3) still open. |
| 2 | CRITICAL | **Migration ready** — `20260612200000_security_vendor_rls_settlement_grants.sql` |
| 3 | CRITICAL | **Phase 1 shipped** — RLS enabled on `bookings`, `profiles`, `transactions`, `wallets`; booking patches via RPC. **Open:** `orders`, `tickets`, OTP tables |
| 4 | HIGH | **Fixed in code + migration** — worker marks complete when tickets delivered; backfills 12 false failures |
| 5 | HIGH | **Open** — needs webhook-only paid flip audit |
| 6 | LOW | **Open** — optional DB constraint |

---

## CRITICAL

### 1. Client-side code can mark a booking "paid" and settle the vendor with no MarzPay proof
**Where:** `src/repositories/BookingRepository.ts` (`createBooking`, `updateBooking`)

`createBooking` patched caller `status`/`payment_status`, then called `process_payment_with_commission` / `process_payment_atomic` with fabricated refs — no MarzPay proof. `updateBooking` had the same side effect. Errors were swallowed; `payment_status: paid` could stick with no ledger row.

**Also verified:** `anon` could `EXECUTE` settlement RPCs directly (not only via `createBooking`).

**Proof in production data:** 3 bookings `payment_status: paid` with zero `payments` / payment `transactions` — `87933141-fe74-…`, `a0c39237-5f98-…`, `c91f5bbb-bfff-…`.

**Fix (shipped in repo):**
- Removed client-side settlement from `createBooking` and `updateBooking`.
- Ignore client `payment_status: paid` on create (webhook/queue only).
- `approveFlaggedBooking` → `backfill_wallet_credits_for_booking` (admin path).
- Migration revokes `anon` execute on settlement RPCs.

**Still needed:** Enable RLS on money tables (#3); redeploy frontend; apply migration.

**Risk:** Payout Integrity, Trust, Revenue.

### 2. Vendor financial PII readable by anyone (leftover debug RLS policy)
**Where:** `public.vendors` — `"Allow all for debugging"` and `"Allow all vendors read"` (`SELECT USING (true)`).

**Fix:** Migration drops both policies; adds `"Vendors can view own record"` (`auth.uid() = user_id`). Admin policies unchanged.

**Risk:** Trust, regulatory exposure (PII + financial account data).

### 3. RLS disabled outright on 18 tables
**Where:** `bookings`, `wallets`, `transactions`, `profiles`, `messages`, `orders`, `order_items`, `tickets`, `ticket_types`, `service_categories`, `hero_videos`, `email_verification_tokens`, `activation_requests`, `event_otps`, `service_settings`, `fee_configuration_settings`, `login_history`, `inquiry_notification_queue`.

**Fix:** Write per-table policies, then enable RLS — priority: `wallets`, `transactions`, `bookings`, `orders`, `order_items`, `tickets`, `profiles`.

**Risk:** Payout Integrity, Trust — outside actors can PATCH wallets/bookings directly until fixed.

---

## HIGH

### 4. `payment_fulfillment_jobs.status` lies about ticket delivery for `order_fulfillment`
12/12 failed `order_fulfillment` jobs had tickets issued (`tickets_code_key` retry noise).

**Fix (shipped):** `process-payment-fulfillment-queue` completes job when ticket count ≥ order_items quantity; migration backfills the 12 historical rows.

**Risk:** Ops blindness / false alerting.

### 5. Booking marked paid while the underlying payment is still `processing`
**Where:** booking `96693ffe-505c-…` — `payment_status: paid`, `payments.status: processing`.

**Fix:** Ensure only webhook sets `paid` when `payments.status = completed` (partially addressed by #1 client strip).

**Risk:** Trust, Payout Integrity.

---

## LOW / structural

### 6. Restaurant payment-exclusion is a string convention, not a category check
`isReservationBooking()` checks status strings only. 0 restaurant payment rows in prod today; future regression risk.

**Fix:** Optional DB trigger on restaurant category.

---

## Doc hygiene (CLAUDE.md / first.md)

- `first.md` absorbed into CLAUDE.md — safe to delete unless another tool reads it.
- Re-add to CLAUDE.md if missing: SECURITY DEFINER for wallet mutations, RPC map, production ref check before destructive ops.

---

## Why this matters for conversion

#1 and #4 are “looks fine in the UI, wrong underneath” — corrupts trust and funnel metrics.

---

# UI/UX & Business-Journey Audit

Methodology: code + flow read (not live browser). Compared to Booking.com / Airbnb / GetYourGuide per `PRODUCT.md` and `CLAUDE.md`.

## What's working ✓ (verified)

- **Hero search** — where / when / who + search (`Home.tsx` ~747–824).
- **Fee transparency** — base × units, booking fee, total (`BookingDrawer.tsx` ~479–496).
- **Guest checkout** — contact step only when `!user`.
- **Vendor signup draft** — `localStorage` persist (`VendorLogin.tsx` ~71–107).
- **Restaurant labeling** — “Free reservation — pay at the restaurant” (`BookingDrawer.tsx` ~497–498).
- **Listing filters** — price, sub-filters, sort, mobile drawer (`CategoryPage.tsx`).

## Priority Issues

### [P0] "Free cancellation" promised — no self-service for paid bookings
**Where:** `BookingDrawer.tsx` ~561 — *"Free cancellation up to 24 hours before your booking"* for all paid categories.

**Verified behavior:**
- `Bookings.tsx` ~233–240 — Cancel **works** for `pending` bookings (`handleCancel` → `cancelPendingBooking`).
- **No Cancel** for `confirmed` / `paid` bookings.
- `BookingDetail.tsx` — no booking cancel/refund action.
- `cancelBooking()` exists in `BookingRepository.ts` but is not wired in tourist UI.

**Fix:** Wire cancel + refund window for confirmed bookings within policy; shared entry point for drawer + full-page flows.

### [P1] Cancellation not on listing for most categories
**Partially wrong in original audit:** Hotels already show policy on `ServiceDetail.tsx` ~768 (Hotel Policies block).

**Still true:** Tours, activities, transport, etc. do not show cancellation near the sticky book widget — only in the drawer summary step.

**Fix:** One-line policy on `ServiceDetail.tsx` book card for all categories (reuse `service.cancellation_policy` where set).

### [P1] Vendor approval has no time commitment
**Where:** `VendorPending.tsx` ~55 — no SLA in copy.

**Fix:** Concrete window in message + admin alert when pending past SLA.

### [P2] Mobile-money provider — ~~no manual override~~ **downgraded**
**Correction:** Manual **MTN / Airtel** toggle exists on the payment step (`BookingDrawer.tsx` ~634–643). Contact step auto-detects only; user selects provider before Pay. Not a checkout blocker.

**Optional:** Show provider picker on contact step when auto-detect fails (UX polish only).

### [P2] Orphaned booking-flow code — **partially wrong**
**Correction:** `ActivityBooking.tsx` **is routed** via `BookingFlow.tsx` at `/service/:slug/book/:category` — but primary activities UX uses the inline drawer (`bookingFlow.ts`).

**`VendorSetup.tsx`:** file no longer exists (stale claim).

**Fix:** Consolidate or delete `ActivityBooking.tsx` if no remaining entry points; document drawer as canonical for activities.

## Persona Red Flags

**Amara (diaspora tourist):** Pays, booking becomes `confirmed` — no Cancel in My Bookings. Must email support. *(Accurate — pending-only cancel.)*

**Joseph (vendor applicant):** Indefinite wait after signup with no timeframe. *(Accurate.)*

## Questions to Consider

- Is “free cancellation” policy or ahead-of-feature copy?
- Single cancellation entry point for drawer + full-page flows?
