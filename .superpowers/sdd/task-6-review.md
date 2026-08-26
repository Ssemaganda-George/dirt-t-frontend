# Task 6 Review: Lock MarzPay collect amount for quote bookings

### Spec verdict

- ✅ Spec compliant
- ⚠️ Justified extras (brief-required, not in the plan snippet): UUID parse moved before the amount gate; dummy `0` skipped when `paymentBookingId` is a valid UUID; post-quote leftover `if (!amount)`; card min/max deferred until after the quote overwrite.
- ⚠️ Cannot verify from diff: live `quotes` / `pricing_source = 'quote'` rows (Task 2 SQL). Until applied, a quote-priced booking 400s “Quote not found for booking” — fail-closed, not a silent client-amount charge.
- ⚠️ Function not deployed (brief: controller deploys after review).

### Global constraints (checked)

| Constraint | Result |
|---|---|
| Quote MarzPay amount from DB, never request body | ✅ Overwrite at `index.ts:203` before `parseInt` at `:372` / `:380` |
| Browser cannot set `payment_status = paid` | ✅ No booking writes |
| This function must not credit vendor wallets | ✅ No wallet / ledger mutation |
| Catalog `services.price` never updated | ✅ `services` not touched |
| Restaurants never get a payment-link collect path | ✅ No restaurant branch added |
| Non-quote collect paths unchanged except `let amount` | ✅ Client amount kept when `pricing_source !== "quote"`; extra bookings SELECT only |
| Quote branch before `parseInt` sent to MarzPay | ✅ `165–205` < `372`, `380`, `388` |
| Dummy `0` allowed only when `booking_id` is valid UUID; wallet/order still require amount | ✅ `111`; leftover `0` on non-quote booking rejected at `207` |

### Strengths

- Surgical: only `supabase/functions/marzpay-collect/index.ts` (`+69 / −7`). HIGH-1 order mismatch (`293–308`) untouched. Fulfillment worker not opened.
- `let amount = body.amount` with other fields still `const` (`101–102`). Quote overwrite is the only mutation.
- Dummy-0 path matches Task 5 `QuotePay` `amount: 0`: early gate is `!amount && !paymentBookingId` (`111`). Wallet top-up and order collects still 400 immediately.
- Post-quote `if (!amount)` (`207–212`) is the right extra: a non-quote booking + dummy 0 + MoMo would otherwise POST `0` to MarzPay (card would still fail min/max).
- Card 500–10_000_000: skipped when `paymentBookingId` is set (`152`), then applied to the **server** amount after overwrite (`214–222`). Non-quote card (wallet/order) keeps the original early check.
- Quote gate matches the plan snippet: missing quote → 400; blocked on expired / remaining ≤ 0 / cancelled / paid / expired / `deposit_paid && !balance_enabled`; else `amount = Math.min(collect_amount_ugx, remaining)`.
- Client `amount: 1` on a quote booking is replaced before any MarzPay payload. Honest report; line map in the report matches the file.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

None.

#### Minor (Nice to Have)

1. **Booking lookup is fail-open on query error**
   - File: `supabase/functions/marzpay-collect/index.ts:166–172`
   - Issue: `{ data: bookingRow }` ignores `error`. If the bookings SELECT fails, `pricing_source === "quote"` is skipped and a **non-zero** body amount is sent to MarzPay. Dummy `0` is still rejected at `207`, so the public pay page stays safe. An attacker who knows a quote `booking_id` and hits a transient lookup failure could charge the body amount.
   - Why it matters: The lock’s job is “never the request body” for quotes. Error path currently falls through to the body.
   - Fix: If `error`, return 500. Matches the quote-row path, which is already fail-closed (`!quoteRow` → 400). Plan snippet omitted this; not a brief miss.

2. **No in-flight dedup on quote/booking collects**
   - File: `index.ts:165–205` vs order HIGH-5 at `226–257`
   - Issue: `amount_paid_ugx` / `remaining` only move after Task 7. Double-click or refresh during `pending` can start two MarzPay collects for the same DB UGX. Worker `quote-overpay` (Task 7) protects the wallet, not the guest.
   - Why it matters: Plan gap, not a Task 6 miss. Order path already has HIGH-5; booking path never did.
   - Fix (later): Same pending/processing lookup on `booking_id` inside the quote branch. Out of this brief.

3. **`draft` is chargeable**
   - File: `index.ts:188–194`
   - Issue: Block list matches the snippet (`cancelled` / `paid` / `expired` / deposit without balance). Create RPC inserts `status = 'sent'`, so v1 is fine. A hand-edited `draft` with a `booking_id` would collect.
   - Fix: Add `quoteRow.status === "draft"` to `blocked` if draft should never hit MarzPay.

4. **No automated test**
   - Brief forbids other files. Amount-lock vs body `1` is verified by line order only (report is honest). Deno harness later; do not add a Vitest file in this task.

### Recommendations

- Before controller deploy: check `error` on the bookings SELECT (Minor 1). One return.
- Task 7 should assume two in-flight collects are possible until booking HIGH-5 exists.
- Diff encoding of `──` as `â"€` is a review-package artifact; working tree is fine.

### Assessment

**Task quality:** Approved

**Reasoning:** The collect function does the job the spec and brief asked for: quote bookings charge `Math.min(collect_amount_ugx, remaining)` from Postgres, dummy `0` from `/pay/:token` is allowed only with a valid UUID `booking_id`, card min/max runs on the server amount, and non-quote / wallet / order paths still require a client amount. No wallet credit, no `payment_status = paid`, no catalog price write, no restaurant path. Safe to proceed to Task 7; apply Minor 1 before this function goes live.
