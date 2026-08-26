### Task 6: Lock collect amount for quote bookings

**Files:**
- Modify: `supabase/functions/marzpay-collect/index.ts` only

**Do not commit. Do not deploy.** Controller deploys after review.

**Integrity:** This is MarzPay collect. Do not change non-quote paths except making `amount` a `let` so quote bookings can overwrite it. Catalog `services.price` is never read. Restaurants never reach this via quote RPCs; still do not add a restaurant collect path.

### Required change

`amount` is currently destructured as `const` from `body` (line 101). Change to `let amount = body.amount` (keep the other fields as they are).

**Dummy 0 from Task 5:** `if (!amount)` at ~line 104 treats `0` as missing. Quote pay page sends `amount: 0`. Fix: if `booking_id` is a valid UUID, do **not** reject missing/zero amount here — the quote branch will set `amount` from the DB. Wallet top-up and order collects still require a truthy amount.

Card min/max check (~lines 150–156) currently runs **before** supabase exists. For quote bookings, that check would reject dummy 0. Skip the card min/max check when `paymentBookingId` is set **until after** the quote overwrite; then apply min/max to the **server** amount (500–10_000_000). Non-quote card collects keep today's behavior.

After `paymentBookingId` is known **and** the supabase service client exists (after line 160), **before** MarzPay HTTP, insert the plan snippet verbatim in spirit:

```ts
if (paymentBookingId) {
  const { data: bookingRow } = await supabase
    .from("bookings")
    .select("id, pricing_source, payment_status, status")
    .eq("id", paymentBookingId)
    .maybeSingle()

  if (bookingRow?.pricing_source === "quote") {
    const { data: quoteRow } = await supabase
      .from("quotes")
      .select("status, valid_until, collect_amount_ugx, agreed_total_ugx, amount_paid_ugx, balance_enabled, booking_id")
      .eq("booking_id", paymentBookingId)
      .maybeSingle()

    if (!quoteRow) {
      return new Response(JSON.stringify({ error: "Quote not found for booking" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    const remaining = Math.max(0, quoteRow.agreed_total_ugx - quoteRow.amount_paid_ugx)
    const expired = quoteRow.valid_until && new Date(quoteRow.valid_until).getTime() < Date.now()
    const blocked =
      expired ||
      remaining <= 0 ||
      quoteRow.status === "cancelled" ||
      quoteRow.status === "paid" ||
      quoteRow.status === "expired" ||
      (quoteRow.status === "deposit_paid" && !quoteRow.balance_enabled)

    if (blocked) {
      return new Response(JSON.stringify({ error: "This payment link cannot be charged" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    amount = Math.min(quoteRow.collect_amount_ugx, remaining)
  }
}
```

Verify: quote branch sits **before** `parseInt(String(amount), 10)` sent to MarzPay (~lines 310, 318, 379). Client `amount` is ignored when `pricing_source === "quote"`.

Do not change order amount-mismatch logic (HIGH-1). Do not credit wallets here.

Self-review: non-quote booking still uses client amount; quote booking with body amount 1 still charges DB UGX.
