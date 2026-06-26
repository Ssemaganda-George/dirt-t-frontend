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

# Live UX Audit — Tracks A/B/C/D (2026-06-26)

Browser-verified via Claude in Chrome. All claims confirmed on https://bookings.dirt-trails.com/

---

## [2026-06-26] — Business details from Step 2 signup form not stored in admin-visible fields

**Context:** User role: vendor (new signup) | Page: /vendor-login?signup=true | Action: complete 3-step signup | Category: onboarding

**Classification:** Technical bug

**Analysis:** Step 2 of vendor signup collects business name, business type, city, address, phone. After submission the admin's "Business Details" panel shows only Name (personal), Email, Phone ("Not provided"), Role, Status, Joined. No business data surfaces — including the phone number explicitly entered (+256 700123456). Admin cannot make an informed approval decision. Root cause: step 2 form data likely writes to a `business_profiles` or `vendor_profiles` table that the admin panel does not query, or the data isn't being persisted at all. DB CHECK needed: `SELECT * FROM profiles WHERE email = 'vierycalliper+dirtaudit@gmail.com'; SELECT * FROM vendors WHERE email ILIKE '%dirtaudit%'; SELECT * FROM businesses WHERE user_id = (SELECT id FROM auth.users WHERE email ILIKE '%dirtaudit%');`

**Recommended Fix:** Surface all business detail fields in the admin approval panel; verify that step 2 `POST` is writing to the correct table with a FK to `auth.users`. (Priority: CRITICAL)

---

## [2026-06-26] — Post-signup screen shows "Business Sign In" as dominant heading with immediate login form

**Context:** User role: vendor (new signup) | Page: /vendor-login?signup=true (post-submit) | Action: complete signup | Category: onboarding

**Classification:** UX failure / conceptual misalignment

**Analysis:** After successful signup the page renders a "Business Sign In" h1 with a pre-filled login form. The success message (green banner) is visually subordinate. New vendors immediately attempt login and fail because email is not yet verified. Two separate approval gates (email verification + admin approval) are compressed into one vague sentence ("being prepared") with no timeline. No redirect to /vendor-pending. No explicit "what happens next" step list.

**Recommended Fix:** On successful signup redirect to `/vendor-pending` with a step map: (1) Verify email → (2) Wait for admin review (typically N days) → (3) Access dashboard. Remove the sign-in form from the success state entirely. (Priority: CRITICAL)

---

## [2026-06-26] — Hidden booking fee (UGX 10,800) not shown until booking summary panel

**Context:** User role: guest | Page: /category/shops → product detail → booking widget | Action: initiate purchase | Category: shops

**Classification:** UX failure / business-model gap

**Analysis:** "Booking fee" of UGX 10,800 (~5.4% surcharge on a UGX 200,000 item) first appears in the Booking Summary panel after clicking "Check Availability & Book". It is never shown on the product detail page, the category page, or anywhere prior to the checkout step. Guests see UGX 200,000 until they click through to the summary where total becomes UGX 210,800. This is a conversion killer and a trust violation — analogous to airline "fees" that appear at checkout.

**Recommended Fix:** Display total price inclusive of booking fee on product detail page inside the booking widget (alongside or below the base price). The fee can be itemized in a tooltip. (Priority: CRITICAL)

---

## [2026-06-26] — Category page shows HIRE price, product page shows BUY price — sticker shock

**Context:** User role: guest | Page: /category/shops → product detail | Action: browse → open listing | Category: shops

**Classification:** UX failure / business-model gap

**Analysis:** Shop category page shows "From UGX 40,000" (the Hire price). Product detail page shows the BUY price at UGX 200,000 — a 5× difference. Guests who follow the standard intent of "buying" an item experience immediate price sticker shock. The "From" label implies the lowest available price, but it actually shows the price for a different listing type (Hire). No explanation of buy vs hire pricing model appears on the category page.

**Recommended Fix:** On category cards for shop listings, either (a) show BUY price as primary with HIRE shown as secondary/badge, or (b) show a price range "UGX 40,000–200,000" with a "hire / buy" label. The current implementation uses `listing_type = hire` as the "from" price source — fix the price-selection logic. (Priority: CRITICAL)

---

## [2026-06-26] — Vendor ledger Total Revenue ≠ Total Earned (~UGX 607K gap)

**Context:** User role: vendor | Page: /vendor/transactions | Action: view financial summary | Category: vendor dashboard

**Classification:** Technical bug

**Analysis:** Vendor dashboard shows Total Revenue: UGX 1,646,649.54 and Total Earned: UGX 1,039,967 — a gap of approximately UGX 606,682. Commission at Bronze tier (6%) on UGX 1,646,649 = ~UGX 98,799, leaving ~UGX 1,547,850 net. Total Earned of UGX 1,039,967 is ~37% less than expected net — the gap is not explained by commission. Also: Admin finance page shows Total Revenue = Net Revenue (both UGX 1,974,455.43), with Platform Fees at UGX 92,068 (4.66% effective rate vs 6% stated). Numbers across roles don't reconcile. DB CHECK needed: `SELECT sum(amount) as total, sum(vendor_amount) as vendor_earned, sum(platform_fee) as commission FROM transactions WHERE vendor_id = (SELECT id FROM vendors WHERE email = 'dinducatering@gmail.com');`

**Recommended Fix:** Reconcile wallet balance, transaction ledger, and dashboard totals. Ensure vendor-facing Total Earned reflects credited wallet amount. Fix currency formatting to remove decimal places from UGX amounts. (Priority: HIGH)

---

## [2026-06-26] — Admin's own vendor account in pending queue (self-approval conflict)

**Context:** User role: admin | Page: /admin/businesses → Pending filter | Action: review vendor applications | Category: admin

**Classification:** Business-model gap

**Analysis:** Admin account (ssgeorge480@gmail.com) has a SEPARATE vendor account (ugandaquantum@gmail.com / "Ssemaganda George") sitting in the Pending queue since 23 May 2026. The admin sees their own vendor application in the list with "Approve" and "Reject" actions available — they can self-approve. No guard exists preventing the admin from approving their own application. This is a marketplace integrity violation.

**Recommended Fix:** Add a backend check in the vendor approval RPC: if `approving_admin_user_id = vendor_user_id` (or same email domain), block the approval and surface an alert requiring a secondary admin. (Priority: HIGH)

---

## [2026-06-26] — Ghost vendor pending for 4+ months with no admin alert or aging signal

**Context:** User role: admin | Page: /admin/businesses → Pending filter | Action: review vendor applications | Category: admin

**Classification:** UX failure

**Analysis:** "Test Vendor / Test Business" (test-vendor-1770691790...) has been in Pending state since 10 February 2026 — 4+ months. No aging badge, no overdue alert, no escalation trigger visible in the admin panel. The pending queue has no SLA enforcement. A vendor who applied 4 months ago has received zero response and has zero visibility into their application status.

**Recommended Fix:** Add an "overdue" badge (e.g., amber → red after 7/30 days) on pending vendor cards in admin. Send automated email to vendor after 48h with no action. Surface count of "pending >7 days" on admin dashboard. (Priority: HIGH)

---

## [2026-06-26] — "Continue to Your Details" booking CTA hidden below fold

**Context:** User role: guest | Page: product detail page → booking widget | Action: initiate checkout | Category: shops

**Classification:** UX failure

**Analysis:** On the product detail page, clicking "Check Availability & Book" opens a booking summary panel. The primary CTA "Continue to Your Details" is rendered below the fold of this panel and is not visible without scrolling. No visual indicator (shadow, arrow, scroll hint) communicates that more content and a CTA exist below. Guests who don't scroll never reach checkout.

**Recommended Fix:** Ensure "Continue to Your Details" is always visible in the booking summary panel viewport — either pin it to the panel bottom, or add a visible scroll cue (gradient + chevron). (Priority: HIGH)

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
