# Task 5 Report: Public pay page

**Status:** DONE_WITH_CONCERNS  
**Commits:** none (per controller: do not git commit)

## What was implemented

Logged-out client pay page at `/pay/:token`. No `ProtectedRoute`. Collect amount is dummy `0` (Task 6 overwrites from DB). No `payment_status` / `bookings` writes from the browser.

**`src/pages/QuotePay.tsx`** (default export)
- Load: `useParams().token` → `getQuotePayPage(token)`
- Missing token / not found / RPC throw / cancelled / expired (`status` expired/cancelled **or** `valid_until` past) / collect closed / missing `booking_id` → “This payment link is not available.”
- `status === 'paid'` → “Already paid. Check your email.” (checked before expiry so a paid quote past `valid_until` still shows already-paid)
- `status === 'deposit_paid' && !balance_enabled` → “Deposit received. DirtTrails will send the balance link.”
- Else if `isQuoteCollectOpen` and `booking_id`: invoice card with invoice_no, guest_name, line items, agreed total + display_currency, **Pay UGX {thisCollectUgx}**, no booking-fee line, `MarzpayPaymentFields`
- Pay: `useMarzpayCollect.pay` → `initiateMarzpayCollect` with `amount: 0`, `booking_id`, `description` = invoice_no, `method` via `toMarzpayMethod`, mobile `phone_number` via `normalizeMarzpayPhone`; field gate uses `getMarzpayMobileValidationErrors`
- Watch: same hook (`watchMarzpayPayment` + `redirectMarzpayIfNeeded` internally) with `booking_id` + reference
- Success: “Payment received. Confirmation is on its way to your email.”
- UI: white `max-w-lg` card, `#61B82C` pay button

**`src/App.tsx`**
- `const QuotePay = lazy(() => import('./pages/QuotePay'))`
- Public route after `/review/:token` (not a child of `path="/"`):

```tsx
<Route path="/pay/:token" element={<PublicLayout />}>
  <Route index element={<QuotePay />} />
</Route>
```

## Tests / typecheck

None required.

**Command:** `npx tsc --noEmit --pretty false`  
**Exit code:** 0  
**Output:** (no errors)

IDE lints on touched files: none.

Browser: no Vite server was running; did not start one. `/pay/:token` not clicked through.

## Self-review

1. Guest does not log in; route has no `ProtectedRoute`.
2. Collect UI amount is `thisCollectUgx`; POST amount is dummy `0`.
3. No booking-fee line; catalog price unused.
4. No browser writes to `payment_status` or `bookings`.
5. Paid / deposit-received copy take precedence over generic unavailable (including past `valid_until` on a paid quote).
6. `marzpay-collect` and fulfillment worker untouched.

## Files changed

| File | Action |
|------|--------|
| `src/pages/QuotePay.tsx` | Created |
| `src/App.tsx` | Lazy public `/pay/:token` under `PublicLayout` |

No npm packages. No git commit.

## Concerns

- **Dummy `amount: 0`** will likely be rejected by current `marzpay-collect` until Task 6 overwrites from `quotes.collect_amount_ugx`.
- **Live `get_quote_pay_page` RPC** may not be applied yet (Task 2 migration). Until then the page shows “This payment link is not available.”
- **No browser pass** — not-available / invoice / pay / success states not exercised in the UI.
- **`booking_id` required for the form.** A sent quote with a null booking (should not happen if Task 2 creates pending booking at save) shows not-available rather than a pay form.

## Fix (review follow-up)

**Issue:** On `/pay/:token`, `PublicLayout` still showed `MobileBottomNav` and `PlanTripFab`. Checkout already hid the bottom nav.

**Change:** In `src/components/PublicLayout.tsx`, added `!location.pathname.startsWith('/pay/')` to the `MobileBottomNav` hide condition (same list as checkout) and conditionally skip `<PlanTripFab />` on `/pay/` paths.

**Command:** `npx tsc --noEmit --pretty false`  
**Exit code:** 0  
**Output:** (no errors)
