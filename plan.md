# MarzPay Card Payments — Implementation Plan (ponytail revision)

> **Goal:** Card checkout for diaspora travelers via MarzPay `method: "card"` + redirect.
>
> **Ponytail rule:** Ship the smallest path that collects money. Everything else waits until Checkout proves it works.

---

## Ponytail audit of the original plan

What the first plan got right: reuse `marzpay-collect` → `marzpay-webhook` → fulfillment queue. No new edge functions. No Stripe.

What it over-built:

| Original plan | Ponytail cut | Why |
|---------------|--------------|-----|
| New `payments.payment_method` column + CHECK constraint | **Delete.** Use existing `provider = 'card'` | Column already exists; mtn/airtel today, card tomorrow |
| `PaymentMethodPicker.tsx` shared component | **Delete for v1.** Inline two radios in Checkout | One consumer doesn't need a component |
| `redirectToMarzpayCardGateway()` helper | **Delete.** `window.location.assign(url)` inline | One-liner wrapper |
| `stashCardPaymentReference()` + sessionStorage | **Delete.** Put `orderId` in return URL | URL is the state |
| GET handler on `marzpay-webhook` | **Defer.** Card `callback_url` = frontend return URL | Webhook POST stays on dashboard URL; add GET redirect only if sandbox proves it's needed |
| `return_url` in `metadata` | **Delete.** Build return URL at collect time from `order_id`/`booking_id` | No extra JSON to read back |
| `marzpay_method` in metadata | **Delete.** Redundant with `provider` | |
| 15–20 frontend files in v1 | **3 files v1**, rest copy-paste after proof | YAGNI |
| Update 3 doc files | **1 file:** `docs/MARZPAY_SETUP.md` | |
| `payOrderWithCard()` separate export | **Delete.** One `payOrder({ method })` param | |
| Phase 10 elaborate test matrix | **3 checks:** one card E2E, one MoMo regression, one SQL | |

**Kept (not lazy to skip):** nullable `phone_number`, webhook `payment_method` fix, fulfillment worker RPC fix, ledger SQL verify. Money paths don't get YAGNI'd.

---

## v1 scope (ship this first)

```
Backend:  1 migration + 3 edge function edits
Frontend: marzpayApi.ts + Checkout.tsx + useOrderPaymentFlow.ts
Optional: thin PaymentReturn page ONLY if booking flows need it before BookingDrawer
```

**Deferred until v1 works:** BookingDrawer, Hotel/Tour/Transport/Activity/Flight/Shop pages, Wallet, Donate, Offset, Payment.tsx card wiring, shared picker component, MONEY_CYCLE.md update.

---

## Prerequisites (ops)

- [ ] MarzPay Card Payments subscription active (UG or GLOBAL)
- [ ] `MARZPAY_API_CREDENTIALS` works for card collect
- [ ] `APP_URL` secret set to production frontend
- [ ] One sandbox card transaction to confirm: webhook POST still hits `marzpay-webhook` when `callback_url` is a frontend URL

---

## Step 1 — Database (one migration)

**File:** `supabase/migrations/<timestamp>_payments_nullable_phone.sql`

```sql
-- ponytail: no payment_method column; provider='card' is enough
ALTER TABLE public.payments
  ALTER COLUMN phone_number DROP NOT NULL;
```

That's the whole migration. `provider` already stores mtn/airtel; set `'card'` for card payments.

---

## Step 2 — `marzpay-collect` (extend, don't fork)

**File:** `supabase/functions/marzpay-collect/index.ts`

Add `method?: 'mobile_money' | 'card'` (default `mobile_money`).

| method | phone | MarzPay body | callback_url |
|--------|-------|--------------|--------------|
| `mobile_money` | required (+256) | `{ amount, phone_number, country, reference, description, callback_url }` | webhook URL (unchanged) |
| `card` | omit | `{ amount, method: 'card', country, reference, description, callback_url }` | frontend return URL (see below) |

**Card callback_url** (built server-side, not from client):

```typescript
// ponytail: derive return URL from linked entity, not metadata/sessionStorage
const appBase = APP_URL.split(',')[0].trim()
const returnUrl = paymentOrderId
  ? `${appBase}/checkout/${paymentOrderId}/payment?reference=${reference}`
  : paymentBookingId
  ? `${appBase}/payment/return?reference=${reference}&booking_id=${paymentBookingId}`
  : `${appBase}/payment/return?reference=${reference}`
```

Insert:

```typescript
{
  phone_number: method === 'card' ? null : formattedPhone,
  provider: method === 'card' ? 'card' : (mtn|airtel),
  // ...rest unchanged
}
```

Return `redirect_url` from `marzpayData.data.redirect_url` to frontend. Use as-is.

All existing guards (dedup, rate limit, amount match, inventory) stay — card goes through same gate.

---

## Step 3 — `marzpay-webhook` (two-line fix + optional GET)

**File:** `supabase/functions/marzpay-webhook/index.ts`

**POST (required):** Replace hardcoded `payment_method: "mobile_money"` on orders:

```typescript
const paymentMethod = payment.provider === 'card' ? 'card' : 'mobile_money'
// orders.update({ ..., payment_method: paymentMethod })
```

Select `provider` in the payment lookup query (add to `.select()`).

**GET (defer):** Only add if sandbox shows MarzPay redirects browser to webhook URL instead of frontend `callback_url`. If needed, ~10 lines: read `reference` from query → 302 to `${APP_URL}/payment/return?reference=`.

Card webhooks may have `phone_number: null` — already fine.

---

## Step 4 — `process-payment-fulfillment-queue` (pass provider through)

**File:** `supabase/functions/process-payment-fulfillment-queue/index.ts`

In `settlePaymentWithCommission`, before RPC call:

```typescript
// ponytail: one lookup, map provider → RPC enum
const { data: pay } = await supabase
  .from('payments')
  .select('provider')
  .eq('reference', params.reference)
  .maybeSingle()
const paymentMethod = pay?.provider === 'card' ? 'card' : 'mobile_money'
```

Replace both hardcoded `p_payment_method: "mobile_money"` with `paymentMethod`.

---

## Step 5 — Frontend API

**File:** `src/lib/marzpayApi.ts`

```typescript
export type MarzpayCollectResult = {
  reference: string
  redirect_url?: string
}

export async function initiateMarzpayCollect(payload: {
  amount: number
  method?: 'mobile_money' | 'card'
  phone_number?: string
  description: string
  user_id?: string
  booking_id?: string
  order_id?: string
}): Promise<MarzpayCollectResult>
```

Parse `data.redirect_url` from collect response. No helper functions. Callers do:

```typescript
const { reference, redirect_url } = await initiateMarzpayCollect({ ... })
if (redirect_url) {
  window.location.assign(redirect_url)
  return
}
// else: existing MoMo watch flow
```

**Callers to update:** `useOrderPaymentFlow.ts`, `Payment.tsx` (when wired later). Other pages use raw `fetch` — untouched in v1.

---

## Step 6 — Checkout (only UI surface in v1)

**Files:** `src/pages/Checkout.tsx`, `src/hooks/useOrderPaymentFlow.ts`

1. Add `paymentMethod` state: `'mobile_money' | 'card'`
2. Inline two radios (MoMo / Visa-Mastercard) — no shared component
3. MoMo selected: existing phone + MTN/Airtel validation
4. Card selected: skip phone validation; show one line: "You'll be redirected to secure checkout"
5. `payOrder({ ..., method: paymentMethod })`:
   - card → collect with `method: 'card'`, redirect on `redirect_url`
   - momo → unchanged watch flow

**Return path for tickets:** MarzPay redirects to `/checkout/:orderId/payment?reference=...`. `Payment.tsx` **already watches `?reference=`** (donation flow). User lands there after card payment; existing Realtime + poll handles completion → redirect to `/tickets/:orderId`.

No new route needed for ticket checkout v1.

---

## Step 7 — Payment return page (only if needed for bookings)

**File:** `src/pages/PaymentReturn.tsx` (~50 lines)

Only needed when card launches on booking pages (BookingDrawer v2). Watches `?reference=` via existing `useMarzpayPaymentWatch`, redirects on success using `?booking_id=` query param.

**Route:** `/payment/return` in `App.tsx`

Skip entirely if v1 is Checkout-only.

---

## v2 rollout (after one successful card payment)

Copy the Checkout pattern into each surface. No abstraction until the third copy:

1. `BookingDrawer.tsx` (highest booking volume)
2. Individual booking pages (same inline radios + collect branch)
3. `Wallet.tsx`, `Donate.tsx`, `OffsetCheckout.tsx`
4. `Payment.tsx` legacy route

---

## Testing (3 checks, not 20)

1. **Card E2E:** Checkout → redirect → complete on MarzPay → lands on `/checkout/:id/payment?reference=` → tickets issued
2. **MoMo regression:** Checkout MoMo still completes (unchanged path)
3. **Ledger SQL:**

```sql
SELECT p.reference, p.provider, p.status, t.payment_method
FROM payments p
LEFT JOIN transactions t ON t.reference = p.reference
WHERE p.reference = '<test_ref>';
```

Expect `provider = 'card'` and `t.payment_method = 'card'`.

---

## Implementation order

```
1. Migration (nullable phone)
2. marzpay-collect card branch
3. marzpay-webhook provider → payment_method
4. fulfillment worker provider → RPC
5. marzpayApi.ts return type
6. Checkout.tsx + useOrderPaymentFlow.ts
7. One sandbox card payment
8. v2 surfaces only after step 7 passes
```

**Estimated v1 scope:** 1 migration, 3 edge functions, 3 frontend files. ~200 lines net.

---

## Risk flags

| Risk | Mitigation |
|------|------------|
| Payout integrity | Fix fulfillment worker hardcode (Step 4); SQL verify after test |
| Webhook doesn't fire when callback_url is frontend | Sandbox test in prerequisites; fallback: set callback_url back to webhook + add GET handler |
| HelpCenter claims cards work but only Checkout has it | Acceptable briefly; fix copy or ship Checkout first |

---

## Out of scope (unchanged)

Restaurants (no payment). Stripe/Flutterwave. Apple Pay. Admin analytics split. MarzPay card wallet withdrawal ops (finance manual process).

---

## Open question (one, not five)

**Does MarzPay POST the webhook to the dashboard URL when card `callback_url` is a frontend URL?** One sandbox transaction answers it. Everything else follows from the result.

---

## File checklist (v1 only)

- [ ] `supabase/migrations/<timestamp>_payments_nullable_phone.sql`
- [ ] `supabase/functions/marzpay-collect/index.ts`
- [ ] `supabase/functions/marzpay-webhook/index.ts`
- [ ] `supabase/functions/process-payment-fulfillment-queue/index.ts`
- [ ] `src/lib/marzpayApi.ts`
- [ ] `src/hooks/useOrderPaymentFlow.ts`
- [ ] `src/pages/Checkout.tsx`
- [ ] `docs/MARZPAY_SETUP.md` (card section only)

**Skipped for v1:** PaymentMethodPicker, CardPaymentReturn (unless bookings), payment_method column, sessionStorage, redirect helper, 12 booking/wallet pages, MONEY_CYCLE.md.

---

*Ponytail revision: same money path, half the files, no speculative abstractions.*
