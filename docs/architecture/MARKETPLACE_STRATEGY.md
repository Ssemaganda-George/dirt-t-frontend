# Dirt Trails — Marketplace Strategy & Settlement Fix

> **Last updated:** 2026-06-12  
> **Audience:** CEO, product, engineering, finance ops  
> **Context:** Follows technical audit in `MONEY_CYCLE.md` and senior engineer review of payment/settlement gaps.

---

## Executive summary

Dirt Trails is not suffering from “bad code.” It is suffering from **unfinished marketplace economics**. Engineering is ahead of business rules in some places and behind them in others.

**Core lesson from Booking.com, Airbnb, and Amazon Marketplace:** the ledger is the product. Everything else is UX on top of money truth.

**Existential risk today:** The platform quotes marketplace fees and shows vendor tiers, but the primary MarzPay happy path does not reliably collect platform revenue or credit vendor wallets. Vendors see confirmed bookings with stale balances until lazy reconciliation runs.

**North-star sentence for the team:**

> When MarzPay says paid, within 60 seconds the customer has proof of purchase, the vendor sees pending earnings, and Dirt Trails has recorded its fee — every time, auditable without opening the Transactions page.

---

## Table of contents

1. [Diagnosis: the real business problem](#1-diagnosis-the-real-business-problem)
2. [Business-model fixes (not code patches)](#2-business-model-fixes-not-code-patches)
3. [Operating model](#3-operating-model)
4. [Technical architecture aligned to business](#4-technical-architecture-aligned-to-business)
5. [Phased roadmap](#5-phased-roadmap)
6. [Uganda-specific advice](#6-uganda-specific-advice)
7. [Board one-slide summary](#7-board-one-slide-summary)
8. [Scorecard](#8-scorecard)
9. [What we got right (engineering)](#9-what-we-got-right-engineering)
10. [Critical flaws (validated against codebase)](#10-critical-flaws-validated-against-codebase)
11. [Fix priority matrix](#11-fix-priority-matrix)

---

## 1. Diagnosis: the real business problem

Dirt Trails is trying to be **three businesses at once** without declaring which one it is:

| Model | Meaning | Who holds customer money | When vendor gets paid |
|---|---|---|---|
| **Agency / marketplace** | Connect tourist ↔ vendor; take a fee | PSP (MarzPay) → platform allocates | After service or on schedule |
| **Merchant of record** | Customer buys “from Dirt Trails” | Platform (via PSP) | Platform pays vendors net of fee |
| **Lead gen / reservation** | Restaurant table, free hold | Nobody | N/A |

**Tech treats everything like a paid marketplace booking** (`confirmed` + `paid`), but **commercial rules differ by category** (restaurant, transport 2%+2%, tier commission, `fee_payer` splits). That mismatch is the business-model bug — not only a missing RPC.

### CEO decision (pick one primary model)

> **Dirt Trails is a marketplace agent:** we collect on behalf of vendors via mobile money, retain an agreed platform fee, and owe vendors the net amount subject to payout policy and refunds.

Everything else — wallets, commission, emails, support — flows from that sentence.

---

## 2. Business-model fixes (not code patches)

### A. One commercial policy per category

Booking.com does not negotiate fee logic per checkout screen. They use **vertical rules**:

| Category | Payment model | Platform fee | Payout trigger |
|---|---|---|---|
| **Events / tickets** | Prepay 100% | Fixed % or flat per tier | After event date or T+2 |
| **Hotels / lodges** | Prepay or deposit | % of room night | After check-in (or no-show window) |
| **Tours / activities** | Prepay | % | After service date |
| **Transport** | Prepay | **One published rule** (not hardcoded 2%+2% only in worker) | After trip marked complete |
| **Restaurant** | **No payment** → **Reservation** | Optional lead fee later | N/A |

**Action:** Publish a one-page **Commercial Policy** vendors sign at onboarding. Technology implements *that*, not three parallel fee engines.

---

### B. Simplify or eliminate `fee_payer` complexity

Current modes: `vendor` | `tourist` | `shared`.

**Problems:**

- Tourist trust (“why is checkout different on two similar tours?”)
- Vendor disputes (“I thought the customer paid the fee”)
- Finance (“what is gross vs net vs GMV?”)
- Engineering (splits stored at quote time but ignored at settlement)

**Mature marketplace pattern:**

- **Booking.com-style:** fee always visible as “service fee” OR absorbed in vendor net — **one default per market**, not per service.
- **Amazon-style:** customer sees one price; vendor sees one net payout line.

**Recommendation for Uganda mobile money:**

- **Default: tourist-visible service fee** (transparent, aligns with MoMo receipts).
- Vendors see: **Gross booking → Platform fee → Your earnings**.
- Admin override only for strategic partners — not a public matrix.

---

### C. Wallets are not bank accounts — define balance types

Today `wallets.balance` implies “money you can withdraw now.” Vendors will treat it as cash. Crediting on payment while service is weeks away creates **refund and no-show risk** without escrow.

**Industry pattern:**

```
Gross collected (GMV)
  − Platform fee
  − Refund reserve (optional %)
  = Vendor net earnings

Pending balance     → service not yet delivered
Available balance → eligible for withdrawal
Paid out            → sent to vendor MoMo/bank
```

**Suggested payout eligibility:**

| Category | Available when |
|---|---|
| Tickets | T+1 after event (or immediate if accepting higher risk) |
| Hotels / tours | T+1 after check-in or service date |
| Transport | After trip marked complete |

---

### D. Platform revenue is a P&L line, not a wallet accident

Vendor tiers (e.g. Bronze 15%) and overrides are good for **sales and segmentation**. If settlement does not enforce them, tiers are **marketing fiction**.

**CEO rule:** No tier goes live until finance can answer:

> “For booking X, show me: customer paid, platform earned, vendor earned, PSP fee, status.”

Until settlement is correct, **pause tier differentiation** or use one flat rate. Misaligned promises destroy marketplace trust faster than bugs.

---

### E. Restaurant / zero-payment flows need different status language

`confirmed` + `paid` must mean **money received and allocated**.

Restaurants should use:

- `reservation_confirmed` + `payment_not_required`

Otherwise ops, analytics, and reconciliation scripts produce false signals.

**Consider:** `requires_payment` boolean on `services` or a dedicated `reservation` status.

---

### F. Refunds and failures are a product

Mobile money in Uganda: reversals are painful, slow, sometimes impossible.

**Published policies needed:**

- Customer cancel before date → % refund
- Vendor cancel → full refund + penalty?
- MarzPay failed after ticket issued → manual playbook
- Duplicate webhook → never double-issue (idempotency — already strong technically)

**Business fix:** **Trust & Payments** owner (even 0.5 FTE) with weekly “stuck money” review: failed jobs, paid-no-ticket, refund queue.

---

## 3. Operating model

### Minimum roles

| Role | Owns |
|---|---|
| **Marketplace PM** | Category rules, refund policy, vendor comms |
| **Payments engineer** | PSP, webhooks, settlement RPC, idempotency |
| **Finance ops** | Weekly reconciliation: MarzPay ↔ DB ↔ vendor payouts |
| **Support lead** | Runbook: “I paid but no ticket” |

### Weekly reconciliation ritual (non-negotiable)

1. MarzPay settlement report (total collected)
2. Sum `payments.status = completed`
3. Sum **realized** `platform_fee` (ledger)
4. Sum vendor **available** liabilities
5. Failed `payment_fulfillment_jobs`
6. Withdrawals pending vs paid

If these do not tie within tolerance, **pause growth spend** until fixed.

### Metrics that matter

| Metric | Why |
|---|---|
| **Collect success rate** | MoMo UX quality |
| **Fulfillment success rate** | Paid → ticket/email within 5 min |
| **Platform take rate (realized)** | Settled, not quoted |
| **Vendor payout SLA** | Vendor trust |
| **Refund rate by category** | Risk pricing |
| **Support tickets / 100 bookings** | Product health |

---

## 4. Technical architecture aligned to business

Do **not** treat “add `update_wallet_balance_atomic` after v2” as the strategy. That patches a symptom.

### Build one thing: Settlement Service (single front door)

One idempotent function — DB RPC or internal module — invoked **only** from the fulfillment worker (and reconciliation backfill):

```
settle_payment({
  source_type: 'booking' | 'order',
  source_id,
  payment_reference,
  gross_amount,
  platform_fee,      // from snapshot on row
  vendor_net,        // from snapshot
  vendor_id,
  tourist_id,
  category,
  currency
})
```

It must atomically:

1. Insert ledger lines (gross, platform fee, vendor net) — **double-entry mindset**
2. Credit vendor **pending** wallet (not available until payout rules)
3. Credit platform revenue account
4. Be idempotent on `payment_reference`

**Retire parallel paths:** worker, `confirmOrderAndIssueTickets`, and lazy reconcile should all call **this**.

Deploy `process_payment_with_commission` from repo SQL **or** replace with `settle_payment` — but **one** implementation in production.

### Ledger > wallet display

Promote `transactions` toward immutable ledger events:

- Never mutate amounts; reverse with offsetting entries
- Wallet balances **derived** from ledger + payout state machine

### Separate fulfillment from settlement

| Job type | Responsibility |
|---|---|
| `payment_settlement` | Money only |
| `booking_fulfillment` | Emails, confirmations |
| `order_fulfillment` | Tickets, PDF, QR |

Settlement must succeed even if email fails.

### Category plugin interface (target)

```typescript
interface CategoryCommercialRules {
  requires_prepayment: boolean
  platform_fee_from_snapshot: boolean
  payout_eligible_at: (booking) => Date
  refund_policy_id: string
}
```

Transport stops being magic constants only in the worker.

---

## 5. Phased roadmap

### Phase 0 — Stop the bleeding (2–3 weeks)

**Business**

- Proactive vendor comms: payout display may lag; confirmed bookings are valid; withdrawals on stated SLA
- Freeze new tier promotions until settlement is correct
- Publish refund policy on site

**Tech**

- Deploy `process_payment_with_commission` or new `settle_payment` RPC
- Fulfillment worker calls it on every successful job
- Credit using **`vendor_payout` / `platform_fee`**, not gross `total_amount`
- Alert on `payment_fulfillment_jobs.status = failed`
- One-time backfill for historical paid bookings/orders with ledger but no wallet movement

**Outcome:** Every MarzPay success → correct ledger + wallet + platform fee.

---

### Phase 1 — Trust layer (4–6 weeks)

**Business**

- Publish vendor Commercial Policy PDF
- Standardize on one `fee_payer` mode (recommend tourist-visible fee)
- Rename restaurant flow to **Reservation**

**Tech**

- Pending vs Available wallet buckets
- Payout eligibility cron (pending → available by rules)
- Vendor statement: every line shows gross / fee / net

---

### Phase 2 — Scale layer (2–3 months)

**Business**

- Category-specific payout rules
- Scheduled vendor payout to MoMo (e.g. weekly batch)
- Finance hire or outsourced MarzPay reconciliation

**Tech**

- Split heavy order fulfillment from settlement queue
- PSP abstraction (MarzPay today; card later)
- Admin “money cockpit”: stuck payments, failed jobs, refunds

---

### Phase 3 — Growth layer

- Dynamic tiers tied to **realized** volume
- Cancellation products where market allows
- B2B / API — only after ledger is bulletproof

---

## 6. Uganda-specific advice

**Mobile money is checkout and churn.** Optimize USSD flow, clear amount on screen, retry UX, local-language payment errors.

**Do not promise instant vendor withdrawal** until:

- Refund reserve or payout delay exists
- Fraud review on first N bookings per vendor
- Payout KYC (phone matches business)

**15% Bronze default** — validate vs local OTAs and direct WhatsApp sales. Take rate must buy **demand** (traffic + trust + payments), not dashboard alone.

**MarzPay webhooks:** know PSP retry behavior; return 200 fast; never heavy work in webhook (enqueue — keep this).

---

## 7. Board one-slide summary

**Strengths:** Async payments, idempotent fulfillment, pricing snapshots, multi-vertical marketplace vision.

**Existential risk:** Platform quotes a fee but does not reliably collect or display it; vendor balances are not trustworthy on the happy path.

**Fix order:**

1. Declare marketplace agent model  
2. One settlement function  
3. Pending / available payouts  
4. Category commercial rules  
5. Weekly ops reconciliation  

**Until Phase 0 ships:** Treat automated platform revenue as **~0** in financial planning; reconcile manually. Do not scale paid acquisition assuming 15% take rate.

---

## 8. Scorecard

| Area | Rating | Note |
|---|---|---|
| Payment initiation | ✅ Solid | Clean, validated MarzPay collect |
| Webhook handling | ✅ Solid | Correct separation; enqueue only |
| Fulfillment queue | ✅ Good | Idempotency, retries |
| Wallet crediting | ❌ Broken on happy path | Lazy reconcile may heal some bookings later |
| Commission enforcement | ❌ Broken at fulfillment | May partially recover via reconcile for bookings |
| Pricing system design | ✅ Good | Snapshot approach correct |
| Email / notifications | ✅ Good | Clean separation |
| Legacy code hygiene | ⚠️ Risk | Two diverging settlement paths |
| Business model clarity | ⚠️ Risk | Three commercial models, one schema |

---

## 9. What we got right (engineering)

- **Async fulfillment queue** — `payment_fulfillment_jobs` with idempotency keys and retries; flaky webhooks do not double-issue tickets.
- **Webhook vs worker separation** — Webhook updates state and enqueues; worker owns fulfillment.
- **Pricing snapshot at booking time** — `commission_rate_at_booking`, `vendor_payout_amount`, etc. protect historical truth when tiers change.
- **Idempotency throughout** — In-flight payment dedup, job `idempotency_key`, skip-if-exists in worker.
- **Tourist wallet isolated from vendor wallets** — Correct separation of concerns.

---

## 10. Critical flaws (validated against codebase)

### Wallet crediting on happy path

Flow: MarzPay → webhook → queue worker → `create_transaction_atomic_v2`

Production `create_transaction_atomic_v2` wraps `create_transaction_atomic`, which **only inserts into `transactions`**. It does **not** call `update_wallet_balance_atomic`.

Vendor `wallets.balance` updates when:

- `process_payment_atomic` runs (legacy path)
- `WalletRepository.creditWallet` runs (reconciliation fallback)
- Vendor opens **Transactions** or anything calling `getWalletStats()` → `reconcileMissingPaymentTransactions()`

That is **eventually consistent if the vendor opens the right screen** — still broken-by-default.

### `process_payment_with_commission` not in production

Exists in `db/005_concurrency_controls.sql` but **not deployed** on Travel Tails (verified via Supabase). Code in `BookingRepository`, `OrderRepository`, `WalletRepository` still calls it.

### Commission stored but not enforced in fulfillment worker

Worker credits `booking.total_amount` (or transport hardcoded 2%+2%), not `vendor_payout_amount` / `platform_fee` from the booking or order row.

### Three settlement models

1. Tier / `get_effective_pricing` snapshots  
2. Transport hardcoded in worker  
3. Legacy RPC / reconciliation fallback  

### Dead code

`confirmOrderAndIssueTickets` in `OrderRepository.ts` — not called from current UI; ticket flow is queue-driven.

### Failed jobs operations gap

`max_attempts = 6` with backoff is good; need **alerts** and runbook for attempt 7+ (customer paid, no ticket/email).

---

## 11. Fix priority matrix

| Priority | Fix | Why |
|---|---|---|
| **P0** | Single settlement RPC used by worker **and** reconciliation | One money truth |
| **P0** | Worker calls settlement RPC, not bare `create_transaction_atomic_v2` | Fixes happy path |
| **P0** | Credit **`vendor_payout`** / **`platform_fee`**, not gross | Makes snapshots meaningful |
| **P1** | One-time backfill for paid bookings/orders with ledger but no wallet movement | Historical cleanup |
| **P1** | Alert on failed fulfillment jobs | Ops safety |
| **P2** | Remove or wire `confirmOrderAndIssueTickets` | Stop drift |
| **P2** | Restaurant → reservation status; `requires_payment` on services | Clean financial signals |
| **P2** | Align transport fees with commercial policy / pricing RPC | One pricing truth |

**Insufficient fix:** Only adding `update_wallet_balance_atomic` after v2 — would credit wallets but still ignore commission split and leave two implementations.

**Sufficient fix:** One idempotent `settle_payment` (or deployed `process_payment_with_commission`) using stored snapshots, invoked from worker only.

---

## Related documents

- [`MONEY_CYCLE.md`](./MONEY_CYCLE.md) — Technical money flow (as-is)
- [`../MARZPAY_SETUP.md`](../MARZPAY_SETUP.md) — MarzPay environment and webhook setup

---

## Implementation progress

Track fixes one feature at a time. Update this table as each ships.

| # | Feature | Status | Notes |
|---|---|---|---|
| **1** | **MarzPay settlement on happy path** | Shipped | Migration `20260612120000_deploy_process_payment_with_commission.sql` + worker `process-payment-fulfillment-queue` deployed |
| 2 | Historical wallet backfill | Shipped | Migration `20260612140000_wallet_credit_backfill.sql`: `backfill_wallet_credits_*` RPCs, `payout_meta.wallet_settlement` idempotency, worker + reconcile paths |
| 3 | Failed fulfillment job alerts | Shipped | `failure_alerted_at` column + `notify-fulfillment-job-failed` edge function; worker emails admins when job exhausts retries |
| 4 | Pending vs available wallet buckets | Shipped | Buckets + holds + cron release; vendors can request early release with reason, admin approves via `/admin/balance-release-requests` |
| 5 | Restaurant → reservation status | Shipped | `reserved` + `not_required` payment; settlement guards; BookingDrawer reservation flow; pg_cron `release_eligible_vendor_holds` |
| 6 | Consolidate / remove dead settlement paths | Shipped | Retired `confirmOrderAndIssueTickets`; reconcile uses `process_payment_with_commission` only; idempotent `book_tickets_atomic` |

---

*Strategy document. Implementation requires engineering sprint aligned with finance sign-off on Commercial Policy.*
