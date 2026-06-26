# Product Development Plan — Dirt Trails

| Week | Goal | Tasks | Status |
|------|------|-------|--------|
| **—** | **Platform foundation (pre-plan)** | Live marketplace at `bookings.dirt-trails.com`; marketing site at `dirt-trails.com`; multi-vertical listings (hotels, tours, transport, events, activities, restaurants); hero search + filters; guest checkout; fee breakdown in booking drawer; MarzPay MoMo (MTN/Airtel); vendor signup + dashboard; pricing snapshots + tier commission; webhook → fulfillment queue; confirmation emails / tickets | **Done** |
| **1** | No booking marked paid without MarzPay proof | Remove client-side settlement from `BookingRepository`; ignore client `payment_status: paid` on create; revoke `anon` execute on settlement RPCs; enable RLS on `wallets`, `transactions`, `bookings`, `profiles`; fix `profiles` RLS recursion (`20260617120000`); drop vendor debug policies (`20260612200000`); **apply migrations + redeploy frontend to production** | **In progress** — code + migrations in repo; production deploy not fully verified |
| **2** | Every MarzPay success settles correctly | Deploy `process_payment_with_commission` (`20260612120000`); worker calls it on fulfillment (`process-payment-fulfillment-queue`); credit **vendor net + platform fee** from booking snapshot (not gross); `settlement_requires_paid_status` guard; QA full booking + event order flows | **In progress** — worker wired in code; RPC migration exists; end-to-end prod proof still needed |
| **3** | Past and future money rows reconcile | Run wallet/ledger backfill (`20260612140000`); alerts on failed fulfillment jobs (`20260612150000`); vendor FAQ on pending balances; RLS on `orders`, `order_items`, `tickets` (still open per audit) | **Remaining** — backfill + alerts migrations ready; `orders`/`tickets` RLS open |
| **4** | Supply: bookable inventory for demos | Onboard 5+ vendors end-to-end; listing photos/copy; admin approval SLA; list on homepage/category pages; leverage MIIC / SafariIntel partner intros | **Remaining** — business/ops work |
| **5** | Tourist trust at checkout | Checkout funnel events (search → listing → pay → paid); improve MoMo error/retry UX; diaspora phone-format testing; confirmation email + ticket deliverability check | **Remaining** — partial UX exists (fee transparency, MoMo toggle done); analytics not instrumented |
| **6** | Marketing claims match product | Wire `cancelBooking` for confirmed bookings within policy **or** update drawer copy; add cancellation one-liner on `ServiceDetail` for tours/activities/transport; webhook-only `paid` when `payments.status = completed` (audit #5) | **Remaining** — cancel only works for `pending` today; copy promises free cancellation on paid |
| **7** | Vendors trust the dashboard | Pending vs available buckets live (`20260612160000` + `WalletRepository`); vendor statement shows gross / fee / net on Transactions page; payout release cron (`20260612180200`); vendor approval SLA on `VendorPending` + admin alert | **In progress** — DB + repo support pending/available; UI polish + SLA copy still open |
| **8** | Measure and demo (Startup Hatch) | Funnel report; target 10 paid consumer bookings; pitch deck with real numbers; align `dirt-trails.com` payment/settlement claims with live product; pilot sustainability line on confirmation (carbon/offset) | **Remaining** |

---

## Quick summary

| | Count |
|--|-------|
| **Done** | Core marketplace, MarzPay, vendor portal, fulfillment queue, most settlement/security fixes **in repo** |
| **In progress** | Weeks 1–2 deploy to production; Week 7 wallet UX |
| **Remaining** | Weeks 3–6, 8 — RLS on orders/tickets, cancellation, supply sprint, analytics, Hatch demo metrics |

---

## Copy-paste table (empty Status column for your form)

| Week | Goal | Tasks |
|------|------|-------|
| — | Platform foundation | Marketplace live; MarzPay; listings; checkout; vendor dashboard; fulfillment queue |
| 1 | Trusted paid state | Client settlement removed; RLS on money tables; migrations applied to prod |
| 2 | Settlement happy path | `process_payment_with_commission` in prod; worker credits vendor net + platform fee |
| 3 | Reconcile money + secure orders | Ledger backfill; failed-job alerts; RLS on `orders` / `tickets` |
| 4 | Supply activation | 5–15 vendors live with bookable listings; approval SLA |
| 5 | Checkout conversion | Funnel analytics; MoMo retry UX; confirmation email reliability |
| 6 | Honest cancellation + paid rules | Self-service cancel or fix copy; webhook-only paid audit |
| 7 | Vendor wallet clarity | Pending vs available UI; gross/fee/net statement; payout release |
| 8 | Hatch demo + metrics | 10 paid bookings; funnel report; brand ↔ product alignment |
