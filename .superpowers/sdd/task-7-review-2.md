# Task 7 Re-Review: Worker settles this MarzPay payment only (after newPaid formula fix)

### Spec verdict

- ✅ Spec compliant — quote branch credits `payAmount` only, bumps quote/booking totals from completed payments, tx idempotency by reference, Locked rule, restaurant skip first, non-quote path unchanged
- ⚠️ Justified deviation: brief step 3 lists `quote.amount_paid_ugx + payAmount`; implementation uses `otherPaid + payAmount` (sum of completed `payments` excluding this reference). Equivalent on first slice (`otherPaid = 0`); correct on retry/parallel/catch-up. This was the required Important 1 fix
- ⚠️ Justified extra: `quoteSettlement.ts` sibling module (brief listed only `index.ts`; needed for Vitest without Deno URL imports). Deploy must upload the whole function folder
- ⚠️ Function not deployed (brief: controller deploys after review)

### Fix verification (Important 1 + Minors 1–2)

| Requirement | Result | Evidence |
|---|---|---|
| One formula: `newPaid = otherPaid + payAmount` | ✅ | `quoteSettlement.ts:73–80` — `otherPaid` sums completed `payments` for `booking_id` excluding `paymentRef`; no branch uses `quote.amount_paid_ugx + payAmount` |
| Overpay only when `!existingTx` | ✅ | `quoteSettlement.ts:83–85` — `if (!existingTx && otherPaid + payAmount > agreed)` |
| Settle only when `!existingTx` | ✅ | `quoteSettlement.ts:89–100` — `settlePaymentWithCommission` gated on `!existingTx`; wallet credit is `payAmount`, commission `payAmount * rate` |
| Second job after catch-up still settles | ✅ | Test `still settles the second payment after catch-up wrote both payment sums onto the quote` — deposit retry (existing tx) writes `890000`/`paid` without settle; balance job then settles `445000` for `balanceRef`, no `quote-overpay` |
| Tx lookup by `reference` without requiring `booking_id` (Minor 1) | ✅ | `quoteSettlement.ts:56–62` — `.eq("reference", paymentRef)` only |
| Reject non-completed payment rows (Minor 2) | ✅ | `quoteSettlement.ts:43–45` — throws unless `payment.status === "completed"` |

### Global constraints (checked)

| Constraint | Result |
|---|---|
| Never credit vendor wallet more than this completed MarzPay payment | ✅ Settle passes `totalAmount: payAmount` only; idempotent skip when tx exists for this reference |
| Second quote collect credits balance slice, not running `booking.total_amount` | ✅ Poison `999999` never passed to settle; balance test asserts `445000` |
| Tx lookup by this `payment.reference`, not booking-id-only `maybeSingle` | ✅ Reference-scoped lookup; non-quote booking-id path untouched in `else` |
| Locked rule: booking `confirmed` + `payment_status` `paid`; quote `deposit_paid` vs `paid` | ✅ `quoteSettlement.ts:102–123`; no `pending` or invented `deposit_paid` on bookings |
| Restaurants throw `booking-skips-settlement` **before** quote branch | ✅ `index.ts:234–240` then `248–255` |
| Catalog price never used on quote path | ✅ No `resolveBookingCommission` / `services.price` in quote branch |
| Non-quote path unchanged | ✅ `index.ts:256–302` |
| `marzpay-collect` not modified | ✅ |

### Important 2 (parallel jobs) — mitigated

First review flagged parallel `booking_fulfillment` jobs reading stale `quote.amount_paid_ugx`. With the unified payment-sum formula, both jobs derive `newPaid` from completed `payments` rows, not the quote row. When two slices are already `completed`, both write the same total (`890000`) and each settles its own `payAmount` if no tx for that reference. Residual same-reference double-settle is bounded by RPC reference idempotency (pre-existing). Optional CAS on quote row remains a Minor hardening, not a deploy blocker.

### Strengths

- Surgical quote `if` after restaurant skip + MarzPay assert; non-quote `else` preserves backfill/settle behavior
- Fail-closed: missing/invalid payment, non-completed status, missing quote, overpay before settle
- Nine focused tests including deposit, balance slice, skip-by-reference, catch-up bump, catch-up-then-second-settle, overpay, and error paths
- Re-verified: `npx vitest run src/tests/quoteFulfillmentWorker.test.ts` — 9/9 passed

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

None. Important 1 (mixed `newPaid` formulas / catch-up poisoned second settle) is resolved. Important 2 (parallel increment from stale quote) is mitigated by the payment-sum formula.

#### Minor (Nice to Have)

1. **No quote-path backfill when tx exists without `payout_meta.wallet_settlement`** — same as first review; brief says skip if tx exists; atomic RPC normally writes meta in one shot. Do not add unless a real stuck quote tx appears.
2. **`quoteSettlement.ts` extra vs brief file list** — deploy must include sibling module; report is honest.
3. **Optional CAS on quote update** — belt-and-suspenders if two jobs race before both payment rows are visible; not observed in tests or brief scope.

### Assessment

**Task quality:** Approved

**Reasoning:** The newPaid fix applies one formula on all paths, gates overpay and settle on `!existingTx`, and the new catch-up-then-second-settle test proves the deposit retry cannot block the balance wallet credit. Minors 1–2 from the first review are applied. Restaurants skip first, wallet credit is slice-only, Locked rule holds, non-quote path is unchanged. Safe for controller deploy of the full `process-payment-fulfillment-queue/` folder (entrypoint + `quoteSettlement.ts`).
