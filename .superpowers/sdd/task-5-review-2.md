# Task 5 Re-Review: Public pay page (after PublicLayout chrome fix)

### Spec Compliance

- ✅ Spec compliant
- ⚠️ Justified deviation (unchanged): paid / deposit-received copy is checked **before** expiry (`QuotePay.tsx:141–147`), so a paid quote past `valid_until` still says “Already paid. Check your email.” The brief lists expired → unavailable first; the implemented order is the right product behavior.
- ⚠️ Cannot verify from diff: live `get_quote_pay_page` RPC (Task 2 migration). Until applied, the page correctly shows “This payment link is not available.”
- ⚠️ Cannot verify from diff: browser click-through (static review). Dummy `amount: 0` will not complete a real MarzPay collect until Task 6.

The uncommitted `App.tsx` hunks also include Task 4’s `Quotes` lazy import and `path="quotes"` admin route. Those are outside Task 5 and are not scored here.

### PublicLayout chrome fix — verified

The prior Important issue is **resolved**. On paths starting with `/pay/`:

| Element | Condition | Location |
|---------|-----------|----------|
| `MobileBottomNav` | Hidden — added `!location.pathname.startsWith('/pay/')` alongside existing checkout/scan/service hides | `PublicLayout.tsx:538–547` |
| `PlanTripFab` | Hidden — wrapped in `{!location.pathname.startsWith('/pay/') && <PlanTripFab />}` | `PublicLayout.tsx:549` |

For route `/pay/:token`, `location.pathname` is `/pay/<token>`, which satisfies `startsWith('/pay/')`. Both chrome elements are suppressed. This matches the checkout hide pattern requested in the first review.

Header and desktop footer still render on `/pay/` — that was not in scope of the fix and is acceptable for a branded public invoice page.

### Strengths (unchanged)

- Routing matches the brief: lazy default-export `QuotePay`, sibling of `/review/:token`, not a child of `path="/"`, `PublicLayout` + index, no `ProtectedRoute` (`App.tsx:169–171`).
- Load path: `useParams().token` → `getQuotePayPage(token)`; missing token, `null`, and RPC throw → unavailable copy.
- Verbatim copy constants; pay-form gate uses `isQuoteCollectOpen` and `thisCollectUgx`; POST amount is dummy `0`; UI amount is `thisCollectUgx`.
- Invoice card: invoice_no, guest_name, line items, agreed total + `display_currency`, **Pay UGX {collect}**, no booking-fee line, no catalog price.
- Payment wiring: `MarzpayPaymentFields`, `getMarzpayMobileValidationErrors`, `useMarzpayCollect` (internal `toMarzpayMethod`, `normalizeMarzpayPhone`, `initiateMarzpayCollect`, `watchMarzpayPayment`, `redirectMarzpayIfNeeded`).
- No browser writes to `payment_status` or `bookings`. No restaurant flow. `marzpay-collect` and fulfillment worker untouched. No new packages. No commit.
- UI: white `max-w-lg` card, `#61B82C` pay button. Fetch effect cancelled on token change.
- Typecheck: `npx tsc --noEmit --pretty false` exit 0 (report + re-verified).

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

None. The PublicLayout bottom nav / FAB conversion leak from the first review is fixed.

#### Minor (Nice to Have)

- `isLinkExpired` duplicates expiry/cancel checks already inside `isQuoteCollectOpen` (`QuotePay.tsx:19–23`, `quotePayLink.ts:60–67`). After paid / deposit-received branches, `!isQuoteCollectOpen(quote) || !quote.booking_id` is sufficient.
- `service_title`, `notes`, and `service_date` on `QuotePayPage` are unused. Brief step 5 does not require them.
- Empty `onFailed: () => {}` is fine (hook sets error); pre-existing `watchMarzpayPayment` timeout behavior is not unique to this page.
- Dummy `amount: 0` and missing RPC are Task 6 / Task 2 dependencies, not Task 5 defects.

### Assessment

**Task quality:** Approved

**Reasoning:** Task 5 implements the public pay page to the brief. The sole Important issue from the first review — marketplace chrome on the WhatsApp pay surface — is correctly fixed. No Critical or Important items remain. Remaining notes are Minor or cross-task dependencies.
