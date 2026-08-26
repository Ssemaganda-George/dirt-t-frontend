# Task 7 Report: Worker settle this payment only, then bump quote totals

**Status:** DONE_WITH_CONCERNS  
**Commits:** none (per controller: do not git commit)  
**Deploy:** none (per controller: do not deploy)

## What was implemented

Surgical quote branch in `processBookingFulfillment` after restaurant skip + `assertMarzpayPaymentCompleted`. Non-quote `existingTx` / backfill / settle path is unchanged (wrapped in `else`). `marzpay-collect` not opened.

**Booking SELECT** now includes `pricing_source`.

**If `pricing_source === 'quote'`** (`processQuoteBookingFulfillment`):
1. Load payment by `reference`; `payAmount = Number(payment.amount)`. Missing or `payAmount <= 0` throws `quote-payment-missing-or-invalid`.
2. Load quote by `booking_id`. Missing throws `quote-not-found`.
3. `newPaid = quote.amount_paid_ugx + payAmount`. If a completed tx already exists for **this** `payment.reference` (+ `booking_id`), skip wallet credit and set `newPaid` from the sum of completed payments for the booking (idempotent catch-up; does not add the slice twice).
4. If `newPaid > agreed_total_ugx`, throw `quote-overpay` (before settle).
5. Else `settlePaymentWithCommission` with `totalAmount: payAmount` and `commissionAmount` = round(`payAmount * Number(booking.commission_rate_at_booking || 0)`, 2). Never `booking.total_amount` or `services.price`.
6. Quote: `amount_paid_ugx = newPaid`, `status` = `newPaid >= agreed_total_ugx ? 'paid' : 'deposit_paid'`, `balance_enabled = false`.
7. Booking: `total_amount = newPaid`, `commission_amount` = round(`newPaid * rate`, 2), `vendor_payout_amount = newPaid - commission_amount`, `status = 'confirmed'`, `payment_status = 'paid'`. No `deposit_paid` on bookings.
8. Existing `send-booking-emails` still runs after the if/else (same confirmation; no new template).

**Restaurants:** existing `booking-skips-settlement` throw (reserved / `not_required` / `cat_restaurants`) still runs **before** the quote branch.

**Locked rule:** after a successful collect, booking stays `confirmed` + `paid`. Quote row is `deposit_paid` vs `paid`. Worker credits this MarzPay slice only.

## Restaurant skip is before the quote branch — CONFIRMED

| Site | Lines | What |
|---|---|---|
| Restaurant skip | **234–240** | Throws `booking-skips-settlement` |
| Quote branch | **248–255** | `pricing_source === "quote"` only |
| Non-quote existingTx | **256–302** | Unchanged booking-id lookup |
| Emails | **305–326** | Shared after if/else |

234 < 248. A restaurant booking never reaches quote settlement.

## Self-review

1. Second quote collect looks up tx by **this** `payment.reference` (+ booking_id), not `.eq("booking_id", bookingId).maybeSingle()` alone.
2. Wallet credit is `payAmount`, not running `booking.total_amount` (poison value 999999 in tests is not passed to settle).
3. Non-quote path still uses booking-id `existingTx` / backfill / `resolveBookingCommission`.
4. Restaurants still throw skip-settlement; no quote path for `cat_restaurants`.
5. `payment_status` is never set back to `pending`. No invented `deposit_paid` on bookings.
6. `marzpay-collect` not modified in this task.

## Tests / typecheck

**RED:** stub threw `not implemented`; 8/8 failed for that reason.  
**GREEN:** implemented `processQuoteBookingFulfillment`.

**Command:** `npx vitest run src/tests/quoteFulfillmentWorker.test.ts`  
**Exit code:** 0  
**Output:** `✓ src/tests/quoteFulfillmentWorker.test.ts (8 tests)`

**Command:** `npx vitest run`  
**Exit code:** 0  
**Output:** `Test Files  6 passed (6)` / `Tests  54 passed (54)`

Coverage: deposit settle + `deposit_paid`; balance slice (not running total) + quote `paid`; skip settle when tx exists for this reference without double-counting; catch-up bump if wallet settled but quote not updated; `quote-overpay`; missing payment; `payAmount <= 0`; missing quote.

## Files changed

| File | Action |
|------|--------|
| `supabase/functions/process-payment-fulfillment-queue/index.ts` | Modified — `pricing_source` select; quote if-branch; non-quote else |
| `supabase/functions/process-payment-fulfillment-queue/quoteSettlement.ts` | Created — Deno-free orchestration so Vitest can import the same code the worker runs |
| `src/tests/quoteFulfillmentWorker.test.ts` | Created |

No npm packages. No git commit. Function **not** deployed (`supabase functions deploy` / MCP `deploy_edge_function` skipped). `marzpay-collect` not touched.

## Concerns

- **Sibling `quoteSettlement.ts`** — brief listed only `index.ts`. Extracted so Vitest can import without Deno URL modules. Deploy must upload the whole function folder (entrypoint + `quoteSettlement.ts`).
- **Idempotent `newPaid`:** on retry with an existing tx for this reference, totals come from the sum of completed `payments` rows, not a second `amount_paid_ugx + payAmount`. Happy path still uses spec increment.
- **Tx lookup requires `booking_id`.** If `process_payment_with_commission` stored a completed tx with null `booking_id`, the worker would miss it, call settle again (RPC would skip by `reference`), then increment quote totals as a first-time job.
- **Function not deployed** — production still uses the old booking-id `existingTx` skip until the controller deploys.
- **No live MarzPay / ledger check** in this task (Task 8 smoke). Wallet credit is still `settlePaymentWithCommission` / `process_payment_with_commission`.

## Fix (Important 1)

One `newPaid` formula on both branches: `otherPaid` = sum of completed `payments` for this `booking_id` excluding this `paymentRef`; `newPaid = otherPaid + payAmount`. Overpay only when `!existingTx && otherPaid + payAmount > agreed`. Settle only when `!existingTx`. Catch-up retry of deposit can write the sibling sum onto the quote; the second reference still settles `payAmount` and does not throw `quote-overpay`. Also: tx lookup by `reference` without `booking_id` (Minor 1); throw unless payment `status` is `completed` (Minor 2). No restaurant backfill.

**Command:** `npx vitest run src/tests/quoteFulfillmentWorker.test.ts`  
**Exit code:** 0  
**Output:** `✓ src/tests/quoteFulfillmentWorker.test.ts (9 tests)` — 9 passed (8 existing + catch-up-then-second-settle).
