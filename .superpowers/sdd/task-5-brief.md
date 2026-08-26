### Task 5: Public pay page

**Files:**
- Create: `src/pages/QuotePay.tsx` (default export)
- Modify: `src/App.tsx` — public route (no `ProtectedRoute`)

**Do not commit.**

**Routing (follow this pattern, not a child of `path="/"`):**

```tsx
const QuotePay = lazy(() => import('./pages/QuotePay'))
...
<Route path="/pay/:token" element={<PublicLayout />}>
  <Route index element={<QuotePay />} />
</Route>
```

Place it near other public routes (e.g. after `/review/:token`).

### Task 3 contract

`getQuotePayPage(token)` from `src/repositories/QuoteRepository.ts` — works logged-out. Returns `null` if not found.

`QuotePayPage` fields: invoice_no, guest_name, line_items, agreed_total, display_currency, collect_amount_ugx, agreed_total_ugx, amount_paid_ugx, status, valid_until, balance_enabled, booking_id, service_title, notes, service_date.

Use `isQuoteCollectOpen` and `thisCollectUgx` from `src/lib/quotePayLink.ts` for the pay-form gate and UGX amount shown.

### Page behavior (copy verbatim)

1. Load via `useParams().token` → `getQuotePayPage(token)`
2. Not found / cancelled / expired (status expired/cancelled **or** `valid_until` in the past) → “This payment link is not available.”
3. `status === 'paid'` → “Already paid. Check your email.”
4. `status === 'deposit_paid' && !balance_enabled` → “Deposit received. DirtTrails will send the balance link.”
5. Else if collect is open (`isQuoteCollectOpen`) and `booking_id` is present: show invoice_no, guest_name, line items, agreed total + display_currency, **Pay UGX {thisCollectUgx(...)}**, **no booking fee line**, `MarzpayPaymentFields` from `src/components/payment/MarzpayPaymentFields.tsx`
6. Pay calls `initiateMarzpayCollect`. `MarzpayCollectPayload.amount` is required (`number`). Send `amount: 0` (dummy; Task 6 overwrites from DB). Also send `booking_id`, `description` (e.g. invoice no), `method` via `toMarzpayMethod`, and `phone_number` for mobile (use `normalizeMarzpayPhone` / `getMarzpayMobileValidationErrors` like other checkouts).
7. Watch with existing `useMarzpayCollect` (`src/hooks/useMarzpayCollect.ts`) **or** `watchMarzpayPayment` + `redirectMarzpayIfNeeded` — same pattern as `src/pages/Payment.tsx` / booking collect. Use `booking_id` + reference.
8. Success copy: “Payment received. Confirmation is on its way to your email.”

If collect is not open and none of the specific messages above apply → “This payment link is not available.”

Do not write `payment_status` or `bookings` updates from the browser. Do not show a booking-fee line. Do not use catalog price.

### UI

Keep it a simple public invoice card (white, max-w-lg, DirtTrails green `#61B82C` pay button). Guest does not log in. Missing token → not available.

### Tests

None required. Typecheck the files you touch (`npx tsc --noEmit --pretty false`).

### Do not

- Change `marzpay-collect` (Task 6)
- Change the fulfillment worker (Task 7)
- Add npm packages
- Call restaurant flows
