# Task 5 Review: Public pay page

### Spec Compliance

- ✅ Spec compliant
- ⚠️ Justified deviation: paid / deposit-received copy is checked **before** expiry (`QuotePay.tsx:141–147`), so a paid quote past `valid_until` still says “Already paid. Check your email.” The brief lists expired → unavailable first. The implemented order is the right product behavior.
- ⚠️ Cannot verify from diff: live `get_quote_pay_page` RPC (Task 2 migration; implementer notes it may not be applied yet). Until then the page correctly falls through to “This payment link is not available.”
- ⚠️ Cannot verify from diff: browser click-through (no Vite run; this review is static). Dummy `amount: 0` will not complete a real MarzPay collect until Task 6.

The uncommitted `App.tsx` hunks also include Task 4’s `Quotes` lazy import and `path="quotes"` admin route (`App.tsx:53`, `App.tsx:324`). Those are outside Task 5 and are not scored here.

### Strengths

- Routing matches the brief exactly: lazy default-export `QuotePay`, sibling of `/review/:token`, not a child of `path="/"`, `PublicLayout` + index, no `ProtectedRoute` (`App.tsx:96`, `App.tsx:169–171`).
- Load path is `useParams().token` → `getQuotePayPage(token)`; missing token, `null`, and RPC throw all map to the unavailable copy (`QuotePay.tsx:37`, `QuotePay.tsx:67–91`, `QuotePay.tsx:133–135`).
- Verbatim copy constants: unavailable, already paid, deposit received, success (`QuotePay.tsx:14–17`).
- Pay-form gate uses Task 3 helpers: `isQuoteCollectOpen` and `thisCollectUgx` (`QuotePay.tsx:149`, `QuotePay.tsx:153`). Form requires `booking_id`. Collect UI amount is `thisCollectUgx`; POST amount is dummy `0` (`QuotePay.tsx:113–114`).
- Invoice card shows invoice_no, guest_name, line items, agreed total + `display_currency`, **Pay UGX {collect}**, no booking-fee line, no catalog price (`QuotePay.tsx:160–183`).
- Payment wiring matches other booking collect pages: `MarzpayPaymentFields`, `getMarzpayMobileValidationErrors` / `isMobileUiMethod` field gate, `useMarzpayCollect.pay` which internally `toMarzpayMethod` + `normalizeMarzpayPhone` + `initiateMarzpayCollect` + `watchMarzpayPayment` + `redirectMarzpayIfNeeded` (`QuotePay.tsx:49–59`, `QuotePay.tsx:102–119`, `QuotePay.tsx:185–202`).
- No `payment_status` / `bookings` writes from the browser. No restaurant flow. `marzpay-collect` and the fulfillment worker untouched. No new packages. No commit.
- UI: white `max-w-lg` card, `#61B82C` pay button (`QuotePay.tsx:157–158`, `QuotePay.tsx:214`). Fetch effect is cancelled on token change (`QuotePay.tsx:61–100`).

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

1. **Marketplace chrome sits on the WhatsApp pay surface**
   - File: `src/components/PublicLayout.tsx:538–548` (triggered by Task 5’s `/pay/:token` route)
   - Issue: Checkout already hides `MobileBottomNav` (`/^\/checkout\/[^/]+(\/payment)?$/`). `/pay/:token` does not. `PlanTripFab` also renders. A logged-out guest opening an invoice link gets header, footer, bottom nav, and a competing FAB on the only conversion screen that matters for this feature.
   - Why it matters: DirtTrails had zero confirmed bookings in three months. This page exists to close a bargained WhatsApp invoice. A “Plan a trip” FAB over the green Pay button is a conversion leak, not chrome polish.
   - Fix: Hide `MobileBottomNav` and `PlanTripFab` when `location.pathname.startsWith('/pay/')`, same exception checkout already has. PublicLayout wrapper can stay.

#### Minor (Nice to Have)

- `isLinkExpired` duplicates expiry/cancel checks already inside `isQuoteCollectOpen` (`QuotePay.tsx:19–23`, `quotePayLink.ts:60–67`). After the paid / deposit-received branches, `!isQuoteCollectOpen(quote) || !quote.booking_id` is enough.
- `service_title`, `notes`, and `service_date` are on `QuotePayPage` but unused. Line items usually cover “what is this,” but a one-line title/date under the invoice number would help a guest confirm the WhatsApp deal. Brief step 5 does not require them.
- Empty `onFailed: () => {}` (`QuotePay.tsx:58`) is fine (hook already sets the error), but a 120s `watchMarzpayPayment` timeout leaves `processing` true with no `onFailed` (pre-existing hook). Guest would refresh; until Task 6, a second collect could start. Not unique to this page.
- Diff artifact only: `review-task-5-uncommitted.diff` mojibake (`Ã—`, `Processingâ€¦`). Working tree `QuotePay.tsx:167` and `:216` are the correct `×` / `…` characters.

### Assessment

**Task quality:** Approved (fix PublicLayout hide before this URL goes to a real guest)

**Reasoning:** Task 5 implements the public pay page to the brief: route, contracts, verbatim copy, dummy amount 0, MarzPay fields/hook, and no browser payment writes. The one issue worth fixing before WhatsApp-ing a live token is suppressing PublicLayout’s bottom nav and PlanTripFab on `/pay/:token`. Dummy collect and missing RPC are Task 6 / Task 2, not this page.
