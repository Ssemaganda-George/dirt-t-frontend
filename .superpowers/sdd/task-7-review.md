# Task 7 Review: Worker settles this MarzPay payment only, then bumps quote totals

### Spec verdict

- ✅ Spec compliant on the happy path (deposit slice, balance slice, skip-by-reference, restaurant skip, Locked rule)
- ⚠️ Justified extras: `quoteSettlement.ts` (brief listed only `index.ts`; needed so Vitest can import without Deno URL modules); idempotent `newPaid` from sum of completed `payments` instead of a second `amount_paid_ugx + payAmount`
- ⚠️ The idempotent extra is **not internally consistent** with the first-time increment (Important 1)
- ⚠️ Function not deployed (brief: controller deploys after review)

### Global constraints (checked)

| Constraint | Result |
|---|---|
| Never credit a vendor wallet more than completed MarzPay on that quote | ⚠️ Happy path yes (`totalAmount: payAmount`). Retry/parallel extras can skip a completed slice or under-count quote totals (Important 1–2) |
| Worker credits only this payment’s UGX (`payAmount`), not `booking.total_amount` on the second job | ✅ `quoteSettlement.ts:90–96`; poison `999999` is never passed to settle |
| Lookup tx by this `payment.reference`, not booking_id-only `maybeSingle` | ✅ `quoteSettlement.ts:53–60` (reference **and** `booking_id`) |
| After successful collect: booking `confirmed` + `payment_status` `paid`; `quotes.status` is `deposit_paid` vs `paid` | ✅ `quoteSettlement.ts:102–123`; `assertBookingPaidForSettlement` still runs first (`index.ts:242`) |
| Restaurants still throw `booking-skips-settlement` **before** the quote branch | ✅ `index.ts:234–240` then `248–255` |
| Catalog price never used | ✅ Quote path never calls `resolveBookingCommission` / `services.price` |
| Do not invent `deposit_paid` on `bookings.payment_status` | ✅ Booking write is `paid` only |
| Non-quote path unchanged | ✅ Existing `existingTx` / backfill / settle wrapped in `else` (`index.ts:256–302`) |

### Strengths

- Surgical: quote work is an `if (pricing_source === "quote")` after restaurant skip + MarzPay assert. Non-quote booking-id `existingTx` is untouched inside `else`. `marzpay-collect` not opened.
- Second collect cannot skip wallet because a *different* payment’s tx already exists for the booking — the bug the task exists to replace. Tx lookup is this `paymentRef` (+ `booking_id`), same idea as the order path.
- Wallet credit is `payAmount * rate`, booking totals are recomputed from `newPaid * rate`. Tests prove the 999999 running total is not settled, and the balance job credits 445000 not 890000.
- Locked rule is followed: worker does not set `payment_status` back to `pending`. Quote row carries `deposit_paid` vs `paid`. Emails stay the shared `send-booking-emails` after if/else (else-instead-of-early-return is the right shape).
- Fail-closed on missing payment, `payAmount <= 0`, missing quote, and `newPaid > agreed` **before** settle. Restaurant skip line order matches the report (234 < 248).
- Eight focused tests, including the two integrity cases that matter (slice vs running total; skip settle without double-counting when quote is already bumped). Honest report.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

1. **Idempotent `newPaid` sums every completed payment; first-time path increments. A retry can mark the quote paid and then `quote-overpay` the second settle.**
   - File: `supabase/functions/process-payment-fulfillment-queue/quoteSettlement.ts:68–81`
   - Issue: On `existingTx`, `newPaid` is `sum(payments where booking_id + completed)`. On `!existingTx`, `newPaid = quote.amount_paid_ugx + payAmount`. Sequence:
     1. Deposit job credits the wallet, then quote UPDATE fails → job retries in ≥1 minute.
     2. Quote still `sent` / `amount_paid_ugx = 0`, so Task 6 remaining is still the full collect (in-flight second collect is possible).
     3. Retry hits `existingTx`, writes `newPaid = sum(both completed slices)`, status `paid`, and **does not** settle the second reference.
     4. Second job uses the increment formula → `quote-overpay` → **never credits that completed MarzPay payment**.
   - Why it matters: Ledger/wallet no longer match completed MarzPay on that quote. The catch-up extra exists to avoid double-counting this slice; summing *sibling* slices poisons the first-time path. The catch-up test only has one payment (`quoteFulfillmentWorker.test.ts:246–304`).
   - Fix: Use **one** `newPaid` on both branches — `sum(completed payments for this booking)`. Keep `quote-overpay` as `quotePaid + payAmount > agreed` on `!existingTx` (this slice vs cap) if you want sequential double-full-collect to settle the first and reject the second. After catch-up has already written the sum, the second job must still settle `payAmount` for its own missing tx, not increment again.

2. **Claimed jobs run in parallel; quote increment is not serialized.**
   - File: `index.ts:731–733` (`Promise.allSettled(jobs.map(runJob))`) plus `quoteSettlement.ts:80` (`quotePaid + payAmount` with no row lock / CAS)
   - Issue: Two `booking_fulfillment` jobs for the same quote booking in one batch both read `amount_paid_ugx = 0`, both pass overpay, both `settlePaymentWithCommission(payAmount)`, both write `445000`. Quote under-reports; wallets equal the two MarzPay rows. Admin then sees `deposit_paid` and can enable a balance link for money already sitting in the vendor wallet.
   - Why it matters: Pre-Task 7, one booking had one payment, so parallel jobs were different bookings. Quote bookings are the first time two jobs share a `booking_id`. Task 6 already allows two in-flight collects for the same UGX.
   - Fix: Same as (1) — write `newPaid` from the completed-payment sum (both jobs write 890000), **or** `UPDATE quotes SET amount_paid_ugx = $new WHERE id = $id AND amount_paid_ugx = $old AND amount_paid_ugx + $pay <= agreed` **before** settle and abort on 0 rows. Do not settle until the quote row is claimed.

#### Minor (Nice to Have)

1. **Tx lookup requires `booking_id`**
   - File: `quoteSettlement.ts:53–60`
   - Issue: Plan line 695 asked for booking+reference (this is compliant). If `process_payment_with_commission` ever stored a completed tx with null `booking_id`, this lookup misses, the worker treats it as first-time, RPC skips by `reference`, and the increment formula bumps quote totals again. Worker itself always passes `bookingId`. Report already flags this.
   - Fix: Match the order path: `.eq("reference", paymentRef)` without requiring `booking_id`, or `(booking_id.eq(id) OR booking_id.is.null)`.

2. **Quote helper does not re-assert `payments.status === completed`**
   - File: `quoteSettlement.ts:32–41`
   - Issue: Worker calls `assertMarzpayPaymentCompleted` first (`index.ts:244`). Tests call the helper directly. A pending row with `amount > 0` would be treated as payable inside the extract.
   - Fix: Throw unless `String(payment.status).toLowerCase() === "completed"`.

3. **No backfill when a quote tx exists without `payout_meta.wallet_settlement`**
   - File: `index.ts:248–255` vs non-quote `269–279`
   - Issue: Brief says skip wallet if the tx exists. Non-quote path still backfills. Atomic RPC usually writes `wallet_settlement` in the same function; residual only if that write never landed.
   - Fix: Later, not this brief. Do not add backfill unless a real stuck quote tx shows up.

4. **`quoteSettlement.ts` is extra vs the brief file list**
   - Deploy must upload the whole `process-payment-fulfillment-queue/` folder (entrypoint + sibling). Report is honest. Fine.

### Recommendations

- Fix Important 1 before deploy. It is a three-line formula change plus one test: catch-up with a *second* completed payment row and no second tx must still call settle for that second reference and must not throw `quote-overpay`.
- That same formula change largely fixes Important 2 for the “both payments already completed” batch. A CAS/lock is the rest if two jobs still increment from a stale `amount_paid_ugx`.
- Do not treat the self-noted null-`booking_id` miss as the blocker; the mixed `newPaid` formulas are.
- Diff encoding of `—` as `â€"` is a review-package artifact; working tree `quoteSettlement.ts:1` is fine.

### Assessment

**Task quality:** Needs fixes

**Reasoning:** The worker does the job the brief locked: restaurants skip first, quote jobs credit `payAmount` not `booking.total_amount`, tx idempotency is by this payment’s reference, booking stays `confirmed`/`paid`, quote is `deposit_paid` vs `paid`, catalog price is unused, non-quote path is an `else`. Do not deploy until `newPaid` is a single formula (Important 1). As written, the catch-up extra can mark a quote `paid` from two MarzPay rows and then refuse to credit the second wallet.
