# DirtTrails Platform — UX Audit & Fix Record

Audit date: 2026-05-29  
Audited by: Claude Code (full codebase read + UX/technical review)

---

## AUDIT SUMMARY

A pre-launch audit was performed covering:
- Vendor onboarding flow (`/vendor-login`)
- Booking / checkout / payment flows
- Frontend architecture and code quality
- Mobile UX and conversion blockers

Issues were rated: **Critical → Medium → Quick Win**

---

## CRITICAL ISSUES — FIXED ✅

### C1. No step progress indicator on vendor signup
**File:** `src/pages/VendorLogin.tsx`  
**Problem:** Vendors had no indication of how many steps remained or which step they were on. Users were likely clicking "Back" expecting a browser back action and exiting the entire form.  
**Fix:** Added a 3-step progress indicator (dots with labels: Your Details / Business / Security) that shows completed ✓, current (active ring), and upcoming (gray) states.

---

### C2. Step 2 vendor onboarding too heavy — business description required
**File:** `src/pages/VendorLogin.tsx`  
**Problem:** Step 2 required 8 fields including a full paragraph business description textarea. This is where abandonment spikes — asking vendors to write marketing copy before they've seen the product.  
**Fix:** Business description is now optional (label updated, `required` attribute removed, validation check removed). Vendors can complete it later in their dashboard profile.

---

### C3. "Home city" as required field in vendor signup
**File:** `src/pages/VendorLogin.tsx`  
**Problem:** Step 1 required a personal home city for a business signup. No major marketplace asks this upfront. It confused the B2B onboarding intent and added unnecessary friction.  
**Fix:** Home city is now optional (label updated, validation check removed).

---

### C4. Business type dropdown missing major categories
**File:** `src/pages/VendorLogin.tsx`  
**Problem:** Only 5 options — Hotel, Restaurant, Transport, Activity, Other. Tour operators, shops, event venues, and spas had to pick "Other", making business-type analytics useless.  
**Fix:** Expanded to 9 options — added Tour Operator / Safari, Shop / Retail, Event Venue, Spa / Wellness.

---

### C5. VendorPending "Go to Dashboard" button invisible
**File:** `src/pages/VendorPending.tsx`  
**Problem:** The approved-vendor "Go to Business Dashboard" button used `bg-primary-600` — an undefined Tailwind class. It rendered as a white button with white text (invisible). Approved vendors had no visible way to enter their dashboard.  
**Fix:** Changed to `bg-green-600 hover:bg-green-700` (standard Tailwind). "Return to Home" button also changed from `bg-primary-600` to `bg-gray-900`.

---

### C6. VendorPending page is a dead end — no way to refresh status
**File:** `src/pages/VendorPending.tsx`  
**Problem:** After signup, vendors land on a waiting page with no mechanism to check their approval status without logging out and back in. The page also had a `focus:ring-primary-500` class (undefined) on the Sign Out button.  
**Fix:**  
- Added `handleRefreshStatus()` function that queries the `vendors` table directly via Supabase and updates the displayed status.  
- Added "Check Approval Status" button (only shown when status is `pending`), with loading state.  
- Auto-reloads if newly approved status is detected.  
- Fixed Sign Out button focus ring to `focus:ring-gray-500`.  
- Added `supabase` import and `useState` import.

---

### C7. `alert()` calls on the critical payment path
**Files:** `src/pages/Checkout.tsx`, `src/pages/Payment.tsx`  
**Problem:** 8 native browser `alert()` calls in the checkout and payment flows. Browser alerts are OS-styled (off-brand), block the page thread, look suspicious during payment on mobile (show the domain URL), and exposed internal error text including `SCHEMA_MIGRATION_PENDING` directly to users.  
**Fix:** All `alert()` calls replaced with inline error state (`submitError` / `paymentError`). Errors render as styled red banner inside the page (near the action button). The `SCHEMA_MIGRATION_PENDING` internal message was removed — replaced with "Unable to save your details. Please check your connection and try again."

**Specific replacements:**
- `Checkout.tsx`: 3 alert() calls → `setSubmitError()`; error banner shown above "Next" button
- `Payment.tsx`: 5 alert() calls → `setPaymentError()`; `setPaymentError(null)` clears on new pay attempt; error banner shown above "Pay with Mobile Money" button

---

### C8. Internal technical copy shown to customers
**Files:** `src/pages/Checkout.tsx:486`, `src/pages/Payment.tsx:601`  
**Problem:** "Loading platform fees from your vendor tier…" was displayed to customers while pricing loaded. "Vendor tier" is internal admin terminology. It caused confusion and anxiety for buyers.  
**Fix:** Changed to "Calculating total…" in both files.

---

### C9. Checkout progress bar — "Details" step marked as completed while user is on it
**File:** `src/pages/Checkout.tsx`  
**Problem:** The 3-step progress header showed both Tickets ✓ and Details ✓ while the user was actively filling out the Details page. Marking the current step as "done" is misleading and breaks the user's understanding of where they are.  
**Fix:** "Details" step (step 2) now renders with an active ring style (`border-2 border-blue-600 bg-white text-blue-600` with "2") instead of the completed ✓ style. This correctly communicates "you are here."

---

### C10. Payment progress bar — "Payment" step shown as inactive gray while user is on it
**File:** `src/pages/Payment.tsx`  
**Problem:** The Payment step (step 3) showed a gray circle with "3" even when the user was on the payment page — the exact opposite of the intent.  
**Fix:** "Payment" step on the Payment page now uses active ring style (`border-2 border-blue-600 bg-white text-blue-600`) and the label is colored blue.

---

### C11. "Credit/Debit Card (coming soon)" with Visa/MC/Amex/Discover logos
**File:** `src/pages/Payment.tsx`  
**Problem:** Showing card logos next to "coming soon" text is the worst of both worlds — international users see Visa/Mastercard/Amex logos, expect to pay by card, discover they can't, and feel misled. This is a conversion killer for international tourists.  
**Fix:** The entire card section (radio button, "coming soon" notice, and all card SVG logos) was removed. The `cardNoticeVisible` state logic remains as dead code but is harmless.

---

### C12. Payment spinner oversized on mobile
**File:** `src/pages/Payment.tsx`  
**Problem:** The loading spinner inside the Pay button was `h-10 w-10` (40×40px) on mobile — larger than the button's text, making the button look broken during processing.  
**Fix:** Changed to `h-5 w-5` across all breakpoints.

---

### C13. Countries array duplicated across 5 files (~1000 lines of dead weight)
**Files:** `src/pages/VendorLogin.tsx`, `src/pages/Checkout.tsx`, `src/pages/HotelBooking.tsx`, `src/pages/ActivityBooking.tsx`, `src/pages/TransportBooking.tsx`  
**Problem:** An identical 211-entry countries array (country code + name + flag) was copy-pasted into every booking page. One correction requires finding and updating every copy.  
**Fix:**  
- Created `src/lib/countries.ts` with exported `COUNTRIES` array and `Country` interface.  
- Removed the inline arrays from all 5 files.  
- All files now import `{ COUNTRIES }` from `../lib/countries`.

---

## MEDIUM ISSUES — FIXED ✅

| # | Issue | Status |
|---|-------|--------|
| M1 | Vendor welcome email + admin notification fired before email verification | ✅ Fixed |
| M2 | BookingFlow re-fetches service already loaded in ServiceDetail | ✅ Fixed |
| M4 | Currency conversion rates hardcoded | ✅ Fixed — Frankfurter API live rates |
| M5 | PaymentPage success dialog nested inside pricing row JSX | ✅ Fixed |
| M6 | No auth gate before booking | ✅ Closed — guest booking is intentional |
| M8 | Sequential `for...of await` for pricing fetch in Checkout | ✅ Fixed — Promise.all |
| M7 | No order expiry mechanism | ✅ Fixed — edge function + pg_cron migration |

**M1 detail:** `sendVendorSignupEmail` and `notifyAdminNewAccount` calls removed from `signUp()`. Both now fire exclusively in `handleVendorPostVerify` which only runs after `email_confirmed_at` is set. Fake/typo emails no longer trigger admin notifications.

**M2 detail:** `BookingFlow.tsx` rewrote from raw `useState`/`useEffect`/`getServiceBySlug` to `useServiceDetailQuery(slug)`. Same React Query key `['service', slug]` that `ServiceDetail.tsx` populates — navigating from detail to booking is now a cache hit, zero network round trip.

**M4 detail:** Created `src/lib/currencyRates.ts` — fetches `https://api.frankfurter.app/latest?from=UGX&to=...` on app start, caches in-memory for 4 hours, falls back to static rates if API is down. `convertCurrency()` in `utils.ts` now reads from this cache via `getRate()`. `initCurrencyRates()` called in `main.tsx` before render.

**M5 detail:** Success dialog (`{paymentSuccess && ...}`) extracted from inside the pricing card JSX and moved to the root of the Payment page return — now a true page-level overlay rendered at the correct z-index.

**M7 detail:** Created `supabase/functions/expire-abandoned-orders/index.ts` — updates orders where `status NOT IN ('paid','completed','expired')` AND `created_at < now() - 2h` to `status='expired'`. Deployed via CLI (`supabase functions deploy`). pg_cron job ID 7 scheduled via Supabase SQL Editor (`cron.schedule('expire-abandoned-orders', '0 * * * *', ...)`), calling the function via `net.http_post` every hour.

**M8 detail:** `fetchCalculations` in `Checkout.tsx` now runs all `calculatePaymentForAmount` calls concurrently via `Promise.all`. Each extra ticket type used to add ~300ms sequentially; now all resolve in parallel.

## MEDIUM ISSUES — PENDING 🔄

| # | Issue | File | Priority |
|---|-------|------|----------|
| M3 | `TransportBooking.tsx` is 161KB — must be split | ✅ Fixed (Session 7) |
| M9 | Realtime pricing override subscription on every checkout load | `Checkout.tsx` | Low |

---

## QUICK WINS — FIXED ✅

| # | Fix | Status |
|---|-----|--------|
| Q1 | Auto-detect MTN/Airtel from phone prefix (077x/078x = MTN, 070x/075x = Airtel) | ✅ Fixed |
| Q2 | Add cancellation policy / refund policy section to Checkout | ✅ Fixed |
| Q3 | Add "Secure checkout" trust badge near Pay button | ✅ Fixed |
| Q5 | Fix `getFieldClass` and `getSelectClass` in VendorLogin — identical functions, merge them | ✅ Fixed |

**Q1 detail:** `Payment.tsx` phone `onChange` now strips to local digits, reads 2-digit prefix, auto-sets `mobileProvider` to `'MTN'` (76/77/78/39/46/31) or `'Airtel'` (70/74/75/20/50). Provider label also updated to show "auto-detected — tap to change."

**Q2+Q3 detail:** Compact grey notice box with lock icon added above the Pay/Next button in both `Checkout.tsx` and `Payment.tsx`. Wording: "Secure checkout" / "Secure payment via MarzPay" + 24hr free cancellation policy with support email link.

**Q5 detail:** `getSelectClass` was byte-for-byte identical to `getFieldClass` — removed, all call sites updated to use `getFieldClass`.

## QUICK WINS — FIXED (SESSION 2) ✅

| # | Fix | Status |
|---|-----|--------|
| Q6 | Fix "Order not found" error pages | ✅ Fixed |
| Q7 | Remove `// @ts-ignore` in Checkout realtime channel cleanup | ✅ Fixed |

**Q6 detail:** `Checkout.tsx` and `Payment.tsx` "Order not found" branches now render a centred, styled error page with emoji, heading, explanatory message, and a "Go back" button.

**Q7 detail:** `channel` was already typed as `any` so `@ts-ignore` was dead weight — removed both comments.

## QUICK WINS — FIXED (SESSION 3) ✅

| # | Fix | Status |
|---|-----|--------|
| Q4 | Add localStorage draft-save for vendor signup form | ✅ Fixed |

**Q4 detail:** `VendorLogin.tsx` now saves all non-sensitive signup fields to `localStorage` key `dt_vendor_signup_draft` on every change (signup mode only, never passwords). On mount, restores saved values. Draft is cleared on successful signup and on `resetForm()`. Zero new dependencies.

---

## TRANSPORT BOOKING AUDIT — FIXED (SESSION 4) ✅

Full professional audit of `TransportBooking.tsx` (was 3,032 lines / 161KB).

| # | Issue | Status |
|---|-------|--------|
| TB1 | Local 211-country array duplicated from `src/lib/countries.ts` | ✅ Fixed |
| TB2 | Local `convertCurrency` with hardcoded stale rates matrix | ✅ Fixed |
| TB3 | Local `formatAmount` + `formatCurrencyWithConversion` duplicating utils.ts | ✅ Fixed |
| TB4 | 2 `console.log` debug statements in production render | ✅ Fixed |
| TB5 | 5 `alert()` calls in `validateCurrentStep` (same pattern as C7) | ✅ Fixed |
| TB6 | Payment phone input missing MTN/Airtel auto-detect (unlike Payment.tsx) | ✅ Fixed |
| TB7 | `alert()` on PDF download failure + clipboard copy | ✅ Fixed |

**TB1 detail:** Removed the 211-entry local `countries` array (lines 64–274 original). Added `import { COUNTRIES } from '../lib/countries'`. Updated `filteredCountries` reference. Identical `{code, name, flag}` format — drop-in replacement, zero call-site changes.

**TB2+TB3 detail:** Removed local `convertCurrency` (14-currency hardcoded rates matrix, stale), `formatAmount`, and `formatCurrencyWithConversion` from inside the component body. Added `import { convertCurrency, formatCurrencyWithConversion } from '../lib/utils'`. All ~20 call sites now use live Frankfurter-API-backed rates via the shared module. The utils.ts `formatCurrencyWithConversion` defaults to UGX target — identical behavior to the removed local version.

**TB4 detail:** Removed `console.log('TransportBooking - service:', service)` and `console.log('TransportBooking - service.vendor_id:', service.vendor_id)` from component body.

**TB5 detail:** Added `stepError` state. `validateCurrentStep` now calls `setStepError(null)` on entry and `setStepError('...')` instead of `alert('...')` for all 5 validation branches. Error banner renders above the "Pay with Mobile Money" button in the navigation area. Fixed `const start = ...` hoisted declaration bug by wrapping case 1 in a block scope (`case 1: { ... }`).

**TB6 detail:** Payment phone `onChange` now strips digits, extracts local prefix, and calls `handleInputChange('mobileProvider', 'MTN')` (76/77/78/39/46/31) or `handleInputChange('mobileProvider', 'Airtel')` (70/74/75/20/50) — matching the auto-detect logic already in `Payment.tsx`.

**TB7 detail:** PDF download catch block: `alert(...)` → `setDownloadError(...)`, error message shown inline near the download button. Clipboard copy: `alert('Booking reference copied')` → visual `referenceCopied` state; button text shows "Copied!" for 2 seconds.

**Net result:** File reduced from 3,032 → 2,787 lines (−245 lines of dead weight). All 7 `alert()` calls removed. Currency rates now live. Zero new dependencies.

---

## BOOKING FLOW UX AUDIT — FIXED (SESSION 5) ✅

Full booking flow audit covering HotelBooking, ActivityBooking, and Checkout.

| # | Issue | Status |
|---|-------|--------|
| HB1 | `useState(2)` in HotelBooking skips Step 1 (date selection) entirely | ✅ Fixed |
| HB2 | `paymentMethod: 'card'` default in HotelBooking — card never available | ✅ Fixed |
| HB3 | Disabled card radio option still rendered in HotelBooking payment step | ✅ Fixed |
| HB4 | 9 `alert()` calls across HotelBooking payment and validation paths | ✅ Fixed |
| HB5 | Local 211-country array duplicated from `src/lib/countries.ts` | ✅ Fixed |
| HB6 | Local `convertCurrency`, `formatAmount`, `formatCurrencyWithConversion` with hardcoded rates | ✅ Fixed |
| HB7 | No guests/rooms inputs on Step 1 — buried in Step 2 after date selection | ✅ Fixed |
| HB8 | `handleBack` condition `> 2` prevented going back from Step 1 | ✅ Fixed |
| HB9 | Payment phone missing MTN/Airtel auto-detect | ✅ Fixed |
| AB1 | `paymentMethod: 'card'` default in ActivityBooking — card never available | ✅ Fixed |
| AB2 | `cardNoticeVisible` dead state + card notice logic | ✅ Fixed |
| AB3 | 7 `alert()` calls across ActivityBooking payment and validation paths | ✅ Fixed |
| AB4 | Full fake card form (card number, expiry, CVV inputs) — dead UI | ✅ Fixed |
| AB5 | Card payment radio option still rendered | ✅ Fixed |
| AB6 | Local 211-country array duplicated from `src/lib/countries.ts` | ✅ Fixed |
| AB7 | Local `convertCurrency`, `formatAmount`, `formatCurrencyWithConversion` with hardcoded rates | ✅ Fixed |
| AB8 | Payment phone missing MTN/Airtel auto-detect | ✅ Fixed |
| AB9 | `paymentMethod === 'card'` in button disabled condition — would always block | ✅ Fixed |
| CK1 | Local 211-country array duplicated from `src/lib/countries.ts` | ✅ Fixed |
| CK2 | Local `convertCurrency`, `formatAmount`, `formatCurrencyWithConversion` with hardcoded rates | ✅ Fixed |
| CK3 | 4 `alert()` calls in Checkout quantity update and buyer info save paths | ✅ Fixed |

**HB1 detail:** `useState(2)` → `useState(1)`. Step 1 (date selection) was permanently skipped; users were dropped onto Step 2 without selecting check-in/check-out dates.

**HB2+AB1 detail:** `paymentMethod: 'card'` → `'mobile'` in both files. Card is not functional — defaulting to it would block payment entirely for every booking.

**HB3+AB5 detail:** Disabled card radio option removed from both HotelBooking (the `opacity-50 cursor-pointer` "Credit/Debit Card — Coming soon" label) and ActivityBooking (radio + `cardNoticeVisible` notice). Also removed `cardNoticeVisible` state, `handlePaymentMethodChange` card branch, and AB9's disabled button condition.

**HB4+AB3+CK3 detail:** All remaining `alert()` calls replaced with `setPaymentError()` / `setCheckoutError()` inline state. Error banners render as `bg-red-50 border-red-200` boxes above the action buttons. `setPaymentError(null)` called at start of successful validation path.

**HB5+AB6+CK1 detail:** Local `countries` arrays (211 entries each, ~210 lines per file) removed. `import { COUNTRIES } from '../lib/countries'` added. All `countries.filter`/`countries.find` references updated to `COUNTRIES.filter`/`COUNTRIES.find`.

**HB6+AB7+CK2 detail:** Local `convertCurrency`, `formatAmount`, `formatCurrencyWithConversion` functions removed (3 functions × 50 lines = 150 lines removed per file). `import { formatCurrencyWithConversion } from '../lib/utils'` added — live Frankfurter API rates.

**HB7 detail:** Guests and Rooms number inputs added to Step 1 (alongside date pickers). Previously hidden until Step 2 — users couldn't set occupancy before seeing pricing.

**HB8 detail:** `handleBack` condition `currentStep > 2` → `currentStep > 1`. With `useState(1)` start, the old condition prevented navigating back from Step 1 (would never be > 2).

**HB9+AB8 detail:** Payment phone `onChange` now auto-detects MTN (76/77/78/39/46/31) and Airtel (70/74/75/20/50) prefixes and sets `mobileProvider` automatically — same pattern as `Payment.tsx` and `TransportBooking.tsx`.

**Net result:** ~430 lines of dead code removed across 3 files (3 local countries arrays + 3 sets of stale currency functions + fake card forms + dead states). Zero `alert()` calls remain in any booking file. All booking flows start from Step 1. TypeScript: 0 errors.

---

## NOT FIXED — REQUIRES FULL IMPLEMENTATION

| # | Issue | Notes |
|---|-------|-------|
| NF1 | `TourBooking.tsx`, `RestaurantBooking.tsx`, `FlightBooking.tsx` are placeholders | Need full implementation — any live tour/restaurant/flight service routes here get a broken experience |
| NF2 | Live currency exchange rates | ✅ Fixed (Session 4) — Frankfurter API, see M4 |
| NF3 | Vendor pre-launch service drafting during pending period | Product decision required |
| NF4 | Inline booking drawer on ServiceDetail | Significant UX rework |

---

## FILES CHANGED IN THIS FIX SESSION

| File | Changes |
|------|---------|
| `src/lib/countries.ts` | **CREATED** — shared countries data (extracted from Checkout.tsx) |
| `src/pages/VendorLogin.tsx` | Progress indicator, optional fields, COUNTRIES import, expanded business types, merged duplicate getFieldClass/getSelectClass, localStorage draft-save/restore |
| `src/pages/VendorPending.tsx` | Fixed invisible button, added refresh status, fixed Sign Out ring class |
| `src/pages/Checkout.tsx` | Fixed progress bar, copy, alert()→inline errors, COUNTRIES import, secure checkout + cancellation policy notice, Promise.all pricing |
| `src/pages/Payment.tsx` | Removed card section, fixed spinner, fixed progress bar, copy, all alert()→inline errors, auto-detect MTN/Airtel, secure payment + cancellation notice, success dialog moved to root |
| `src/lib/currencyRates.ts` | **CREATED** — Frankfurter API live rate fetcher with 4h in-memory cache and static fallback |
| `src/lib/utils.ts` | `convertCurrency` now uses live rates via `getRate()` from currencyRates |
| `src/main.tsx` | Calls `initCurrencyRates()` on app start |
| `src/pages/BookingFlow.tsx` | Replaced manual fetch with `useServiceDetailQuery` — serves from React Query cache |
| `src/contexts/AuthContext.tsx` | Vendor welcome email + admin notification deferred to post-email-verification |
| `supabase/functions/expire-abandoned-orders/index.ts` | **CREATED** — expires stale unpaid orders older than 2 hours |
| `supabase/migrations/20260530120000_schedule_expire_abandoned_orders.sql` | **CREATED** — pg_cron schedule for expire-abandoned-orders, runs hourly |
| `src/pages/TransportBooking.tsx` | Removed 245 lines: local countries array, local convertCurrency (stale rates), local formatAmount, local formatCurrencyWithConversion; added imports from shared modules; removed console.log; alert()→inline stepError/downloadError/referenceCopied; MTN/Airtel phone auto-detect |
| `src/pages/HotelBooking.tsx` | Fixed useState(2)→(1); paymentMethod→'mobile'; removed card radio; 9 alert()→paymentError; local countries array removed (COUNTRIES import); stale currency functions removed (formatCurrencyWithConversion import); guests/rooms inputs added to Step 1; handleBack condition fixed; MTN/Airtel phone auto-detect |
| `src/pages/ActivityBooking.tsx` | paymentMethod→'mobile'; removed cardNoticeVisible state; removed fake card form + card radio; 7 alert()→paymentError; local countries array removed (COUNTRIES import); stale currency functions removed (formatCurrencyWithConversion import); MTN/Airtel phone auto-detect; disabled condition cleaned |
## BOOKING FLOW UX AUDIT — SESSION 6 (2026-05-30) ✅

Follow-up from conversion audit: one-page ticket checkout, service-booking mobile UX, DB verification.

| # | Issue | Status |
|---|-------|--------|
| BF1 | Two-page ticket checkout (Checkout → Payment) adds friction | ✅ Fixed |
| BF2 | Guest order columns assumed missing — blocked guest checkout docs | ✅ Verified in DB |
| BF3 | ActivityBooking: no step progress indicator | ✅ Fixed |
| BF4 | Activity/Hotel/Transport: pay CTA scrolls off-screen on mobile | ✅ Fixed |
| BF5 | Hotel: logged-in users still see redundant name/email fields | ✅ Fixed |
| BF6 | Payment.tsx dead `cardNoticeVisible` state | ✅ Fixed |
| BF7 | Duplicate pricing/payment logic across Checkout + Payment | ✅ Fixed — shared hook |
| BF8 | Transport journey wizard visible by default | ✅ Fixed (Session 8 — wizard removed entirely; was collapsed in Session 5) |
| BF9 | Transport: no logged-in contact skip, sticky pay CTA, or step indicator | ✅ Fixed (Session 9) |

**BF1 detail:** Merged ticket checkout into a single page at `/checkout/:orderId`. New `src/hooks/useOrderPaymentFlow.ts` handles MarzPay collect, realtime watch, and success state. Checkout shows tickets + buyer details + **Pay {total} with Mobile Money** on one screen. Progress simplified to **Tickets → Pay** (2 steps). Legacy `/checkout/:orderId/payment` redirects to checkout (donation/reference flows still use Payment.tsx).

**BF2 detail:** Verified via Supabase MCP on Travel Trails project — `public.orders` has `guest_name`, `guest_email`, `guest_phone` (all `text`, nullable). No migration required. `MOBILE_CHECKOUT_ACTION_REQUIRED.md` is obsolete for schema; guest checkout failures should be investigated as RLS/network, not missing columns.

**BF3 detail:** ActivityBooking renders Date → Details → Pay step indicator with active/completed states.

**BF4 detail:** ActivityBooking, HotelBooking, and TransportBooking use `fixed bottom-0` pay bars on mobile with backdrop blur; pages get `pb-28` bottom padding so content is not hidden behind CTAs.

**BF5 detail:** Hotel step 2 hides Full Name and Email inputs when `loggedInReady`; shows green “Signed in as …” banner instead. Pay button no longer blocked when profile fields are prefilled.

**BF6 detail:** Removed unused `cardNoticeVisible` and card notice JSX from Payment.tsx.

**BF7 detail:** Extracted `useOrderPaymentFlow` hook; Checkout calls `payOrder()`. Payment page redirects order checkouts to unified Checkout.

**BF9 detail:** TransportBooking matches Activity/Hotel mobile UX: `loggedInReady` hides name/email with signed-in banner; pay button respects prefilled profile; sticky bottom pay bar on mobile (`pb-28`); Details → Pay step dots; payment failures show inline `stepError` (not full-page redirect); Try Again clears `bookingError`.

**Prior session (same branch) also delivered:** single full name field, phone at checkout, Promise.all pricing, customer-friendly fee copy, Activity date prefill + logged-in skip contact step, real booking receipt, hotel room type in special_requests, Transport card UI removed + journey collapsed, ServiceDetail inline order errors.

---

## STILL OPEN — DEFERRED

| # | Issue | Notes |
|---|-------|-------|
| SO1 | Tour/Restaurant/Flight dedicated booking flows | Still wrap ActivityBooking |
| SO2 | Transport essential-fields-only (remove journey wizard entirely) | ✅ Fixed (Session 8) — wizard, map modals, Nominatim geocoding removed; 1,176 lines |
| SO3 | Scoped blocked-dates API | ✅ Fixed (Session 10) — `fetchVendorBlockedDates` scoped by vendor + date window |
| SO4 | Payment-before-booking race | Activity/Hotel/Transport charge before `createBooking` |
| SO5 | Inline booking drawer on ServiceDetail | NF4 — product/UX project |
| SO6 | Split TransportBooking.tsx | ✅ Fixed (Session 7 / M3) |
| SO7 | Dedicated `room_type` column on bookings | Stored in `special_requests` for now |

---

## TRANSPORT BOOKING SPLIT — SESSION 7 (2026-05-30) ✅

M3 completed: `TransportBooking.tsx` split from 2,733 → 1,985 lines (−748 lines, −27%).

| # | Change | Detail |
|---|--------|--------|
| M3a | Pure utility functions extracted to `src/lib/transportUtils.ts` | `FUEL_ERROR_PCT`, `calculateDays`, `calculateHours`, `estimateFuel`, `haversineKm`, `computeEstimatesFromDistance` |
| M3b | Image gallery extracted to `src/components/TransportImageGallery.tsx` | Self-managed `currentIndex` state, swipe gestures, prev/next arrows, thumbnail grid |
| M3c | Booking receipt extracted to `src/components/TransportBookingReceipt.tsx` | jsPDF download, `referenceCopied` state, design token constants, `SimilarServicesCarousel` |
| M3d | Dead case 2 in `renderStepContent` removed (~200 lines) | Was unreachable: `if (bookingConfirmed)` exits before `renderStepContent` is called |
| M3e | Stale state removed: `downloadError`, `referenceCopied`, `currentImageIndex`, `selectedImage` | Owned by child components now |
| M3f | Dead `useEffect` for `setSelectedImage` removed | `selectedImage` no longer exists in TransportBooking |

**Net result:** 3 new files created. TransportBooking.tsx reduced by 748 lines. TypeScript: 0 errors.

---

## TRANSPORT JOURNEY WIZARD REMOVAL — SESSION 8 (SO2) ✅

Removed the optional journey design wizard from the transport booking flow entirely.

| # | Change | Detail |
|---|--------|--------|
| SO2a | Journey UI removed | Set-off / stop-overs / destination tabs, map picker, city list, return-option radios, fuel estimates |
| SO2b | Modals removed | `CityPickerModal`, `MapModal` no longer imported or rendered |
| SO2c | Geocoding removed | Nominatim search, debounced autocomplete, coordinate waypoints, route anomaly checks |
| SO2d | Booking payload simplified | `special_requests` is user text only; no `trip_*` or `journey_*` fields sent on new bookings |
| SO2e | Essential fields kept | Dates/times, passengers, driver option, pickup/drop-off (with driver), special requests textarea, contact, mobile money pay |

**Net result:** `TransportBooking.tsx` 1,985 → 1,176 lines (−809 lines, −41%). TypeScript: 0 errors.

---

## TRANSPORT MOBILE UX PARITY — SESSION 9 (BF9) ✅

Closed the Session 6 gap left open on Transport after Activity/Hotel were updated.

| # | Change | Detail |
|---|--------|--------|
| BF9a | `loggedInReady` | Hide name/email when signed in; green banner; validation + disabled state skip redundant fields |
| BF9b | Sticky mobile CTA | Fixed bottom **Pay with Mobile Money** bar; `pb-28` on main container |
| BF9c | Step indicator | Details → Pay progress dots (emerald theme) |
| BF9d | Inline payment errors | Recoverable MarzPay failures use `stepError` in sticky bar, not full-page `bookingError` |
| BF9e | Guest fields | `guest_*` omitted when `user` is set (was `profile` check) |

---

## SCOPED BLOCKED DATES — SESSION 10 (SO3) ✅

Hotel and Transport no longer fetch the entire `bookings` table on load.

| # | Change | Detail |
|---|--------|--------|
| SO3a | Shared helper `src/lib/blockedDates.ts` | `fetchVendorBlockedDates`, `buildBlockedDatesSet`, category name parser |
| SO3b | Query scoped server-side | `vendor_id`, `status != cancelled`, date window overlap (~30d back / 730d ahead) |
| SO3c | `end_date` included in select | Fixes prior query that omitted `end_date` (multi-day blocks were incomplete) |
| SO3d | Hotel + Transport wired | Both pages use shared helper instead of duplicated full-table logic |

**Net result:** One vendor-scoped query per booking page load. TypeScript: 0 errors.

---

## FILES CHANGED — SESSION 10 (SO3)

| File | Changes |
|------|---------|
| `src/lib/blockedDates.ts` | **CREATED** — vendor-scoped blocked date fetch + calendar expansion |
| `src/pages/HotelBooking.tsx` | Replaced full-table bookings scan with `fetchVendorBlockedDates` |
| `src/pages/TransportBooking.tsx` | Same |
| `AUDIT_FIXES.md` | Session 10 record (this section) |

---

## FILES CHANGED — SESSION 9 (BF9)

| File | Changes |
|------|---------|
| `src/pages/TransportBooking.tsx` | loggedInReady UX, sticky pay CTA, step dots, inline payment errors |
| `AUDIT_FIXES.md` | Session 9 record (this section) |

---

## FILES CHANGED — SESSION 8 (SO2)

| File | Changes |
|------|---------|
| `src/pages/TransportBooking.tsx` | Removed journey wizard UI, map/city modals, Nominatim geocoding, journey state & booking fields |
| `AUDIT_FIXES.md` | Session 8 record (this section) |

---

## FILES CHANGED — SESSION 7 (M3)

| File | Changes |
|------|---------|
| `src/lib/transportUtils.ts` | **CREATED** — pure booking math: days/hours/fuel/haversine/distance-to-estimates |
| `src/components/TransportImageGallery.tsx` | **CREATED** — image carousel with swipe, arrows, thumbnail strip |
| `src/components/TransportBookingReceipt.tsx` | **CREATED** — booking confirmed receipt: PDF download, copy reference, similar services |
| `src/pages/TransportBooking.tsx` | Removed 748 lines: utility functions, gallery JSX, receipt JSX, dead case 2, stale state |

---

## FILES CHANGED — SESSION 6

| File | Changes |
|------|---------|
| `src/hooks/useOrderPaymentFlow.ts` | **CREATED** — shared MarzPay collect + watch + order patch logic |
| `src/pages/Checkout.tsx` | One-page checkout: pay on same screen, 2-step progress, success modal → tickets |
| `src/pages/Payment.tsx` | Redirect order checkout to `/checkout/:id`; removed cardNoticeVisible |
| `src/pages/ActivityBooking.tsx` | Step progress UI; sticky mobile CTA; logged-in step-2 validation fix |
| `src/pages/HotelBooking.tsx` | Hide contact fields when logged in; sticky mobile CTA |
| `AUDIT_FIXES.md` | Session 6 audit record (this section) |
