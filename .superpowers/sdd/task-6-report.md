# Task 6 Report: Lock collect amount for quote bookings

**Status:** DONE_WITH_CONCERNS  
**Commits:** none (per controller: do not git commit)  
**Deploy:** none (per controller: do not deploy)

## What was implemented

Surgical patch to `supabase/functions/marzpay-collect/index.ts` only. Fulfillment worker untouched. Catalog `services.price` is never read. No restaurant collect path added. HIGH-1 order amount-mismatch logic unchanged.

**`let amount`**
- `amount` is no longer destructured as `const` from `body`.
- `let amount = body.amount`; other fields stay `const` destructure.

**Dummy 0 from Task 5 `/pay/:token`**
- Early `if (!amount)` now skips when `paymentBookingId` is a valid UUID, so public-page `amount: 0` reaches the quote branch.
- Wallet top-up and order collects still reject a falsy amount at that gate (`!amount && !paymentBookingId`).
- After the quote branch, a second `if (!amount)` rejects leftover dummy 0 on **non-quote** booking collects (mobile money would otherwise POST 0 to MarzPay).

**Card min/max (500–10_000_000)**
- Early card min/max runs only when `!paymentBookingId` (wallet / order — same as today).
- When `paymentBookingId` is set, min/max is deferred until **after** the quote overwrite, then applied to the (server) amount.

**Quote branch (after supabase client, before MarzPay HTTP)**
- Inserted immediately after `createClient` (line 163), before order-scoped guards and before MarzPay `parseInt`.
- If `pricing_source === "quote"`: load quote by `booking_id`; 400 if missing; block expired / remaining ≤ 0 / cancelled / paid / expired / deposit_paid without `balance_enabled`; else `amount = Math.min(collect_amount_ugx, remaining)`.
- Client `amount` is ignored when `pricing_source === "quote"`.
- Non-quote bookings skip the overwrite and keep the client amount.

## Quote branch is before MarzPay HTTP parseInt — CONFIRMED

Read of `supabase/functions/marzpay-collect/index.ts` after the patch:

| Site | Lines | What |
|---|---|---|
| Quote branch | **165–205** | Loads booking + quote; overwrites `amount` from DB |
| Post-quote amount gate | 207–212 | Rejects leftover dummy 0 |
| Deferred card min/max | 214–222 | 500–10_000_000 on **server** amount |
| Order HIGH-1 mismatch | 293–308 | Unchanged; still uses `amount` vs `orders.total_amount` |
| MarzPay card `parseInt` | **372** | `amount: parseInt(String(amount), 10)` |
| MarzPay MoMo `parseInt` | **380** | `amount: parseInt(String(amount), 10)` |
| MarzPay HTTP | 388 | `fetch(.../collect-money)` |
| Payments insert fallback `parseInt` | 441 | `amountData.raw ?? parseInt(String(amount), 10)` |

165 < 372, 380, 388, 441. Quote overwrite happens first. Body amount 1 on a quote booking is replaced by DB UGX before any MarzPay payload is built.

## Self-review

1. Non-quote booking still uses client amount (`pricing_source !== "quote"` → no overwrite).
2. Quote booking with body amount 0 or 1 still charges `Math.min(collect_amount_ugx, remaining)` from DB.
3. Wallet / order still require a truthy amount (no `paymentBookingId`).
4. Order amount-mismatch (HIGH-1) untouched.
5. No wallet credit in collect (worker is Task 7).
6. Restaurants: no new collect path; quote RPCs already exclude them.
7. Fulfillment worker not opened for edit.

## Tests / typecheck

No new test file (brief: modify `index.ts` only). Plan verification is a local read of the function, not a Vitest run.

**Verification:** Read `supabase/functions/marzpay-collect/index.ts` after the patch. Quote branch at 165–205; MarzPay `parseInt` at 372 and 380; HTTP at 388.

**Command:** none (Deno Edge Function; no local test harness for this file in the brief).

## Files changed

| File | Action |
|------|--------|
| `supabase/functions/marzpay-collect/index.ts` | Modified |

No npm packages. No git commit. Function **not** deployed (`supabase functions deploy` / MCP `deploy_edge_function` skipped).

## Concerns

- **No automated test** — amount-lock is not covered by Vitest. A quote booking with body `1` vs DB UGX is verified by code order only.
- **Extra bookings SELECT on every booking_id collect** (hotels/tours/etc., not only quotes). Plan snippet requires `if (paymentBookingId)` then lookup `pricing_source`. Cheap, but it is a new round-trip on the existing booking collect path.
- **Post-quote `if (!amount)`** is a small extra vs the plan snippet. Needed so a non-quote booking + dummy 0 + mobile money cannot reach MarzPay. Card path would still fail min/max; MoMo would not.
- **Live `quotes` table** may not be applied on every environment. Quote collect then 400s “Quote not found for booking” until Task 2 SQL is applied.
- **Function not deployed** — production/staging still uses the old collect until the controller deploys.
- **`collect_amount_ugx` / remaining not integer-validated** beyond MarzPay min/max for card. MoMo still sends `parseInt` of the DB value with no 500 floor in this function (same as today’s booking MoMo path).

## Fix

Bookings SELECT for `pricing_source` now destructures `error`; on query failure returns HTTP 500 `{ error: "..." }` instead of falling through to client `amount`. Quote-row missing still 400s. No other behavior changed; not deployed or committed.
