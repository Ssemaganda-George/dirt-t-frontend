### Task 7: Worker — settle this payment only, then bump quote totals

**Files:**
- Modify: `supabase/functions/process-payment-fulfillment-queue/index.ts` inside `processBookingFulfillment` only (plus the booking SELECT to include `pricing_source`).

**Do not commit. Do not deploy.** Controller deploys after review.

**Integrity halt:** Never credit a vendor wallet more than this completed MarzPay payment. Never settle `booking.total_amount` as if it were the whole quote on the second job. Restaurants already throw `booking-skips-settlement` — do not add a quote path that runs for `cat_restaurants`.

### Plan contradiction — use the Locked rule

The plan has two payment_status notes. **Govern with the Locked rule (plan lines 693–695):**

After a successful collect: booking `status = 'confirmed'` and `payment_status = 'paid'` (webhook already does this). `quotes.status` is `deposit_paid` vs `paid`. `booking.total_amount` grows with each completed payment. Worker credits **only `payAmount`** (this payment’s UGX), never the running booking total.

Do **not** set `payment_status` back to `pending` after a completed slice (`assertBookingPaidForSettlement` requires `paid` + `confirmed`).

### Current bug to replace (quote bookings only)

Today `existingTx` is loaded with `.eq("booking_id", bookingId)` and `.maybeSingle()` — a **second** quote collect would see the first transaction and skip wallet credit for the balance, or error if two rows exist.

For `booking.pricing_source === 'quote'`, **do not** use that booking-id-only branch.

### After `assertMarzpayPaymentCompleted` and loading `booking`:

Add `pricing_source` to the booking select (~line 219).

If `booking.pricing_source === 'quote'`:

1. Load payment by `reference` (`paymentRef`); `payAmount = Number(payment.amount)`. If missing or `payAmount <= 0`, throw.
2. Load quote by `booking_id`. If missing, throw.
3. `newPaid = quote.amount_paid_ugx + payAmount`. If `newPaid > quote.agreed_total_ugx`, throw `quote-overpay`.
4. Lookup `transactions` by **this** `payment.reference` (and booking_id if the column is set) — same idea as order path `.eq("reference", paymentRef)`. If a completed payment tx already exists for this reference, **skip wallet credit** (idempotent).
5. Else `settlePaymentWithCommission` with `totalAmount: payAmount` and `commissionAmount` = round(`payAmount * Number(booking.commission_rate_at_booking || 0)`, 2). Pass existing `reference: paymentRef`.
6. Update quote: `amount_paid_ugx = newPaid`, `status` = `newPaid >= agreed_total_ugx ? 'paid' : 'deposit_paid'`, `balance_enabled = false`.
7. Update booking: `total_amount = newPaid`, `commission_amount` = round(`newPaid * rate`, 2), `vendor_payout_amount = newPaid - commission_amount`, `status = 'confirmed'`, `payment_status = 'paid'`.
8. Send `send-booking-emails` as today (same confirmation; no new template). Then **return** — do not fall through to the non-quote `existingTx` branch.

Non-quote bookings: leave the existing `existingTx` / backfill / settle path unchanged.

Do not invent a `deposit_paid` value on `bookings.payment_status`.

### Do not

- Change `marzpay-collect` further
- Credit wallets from `services.price` or `booking.total_amount` on quote jobs
- Run restaurant bookings through the quote branch
