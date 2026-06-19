# 8-Week MVP Roadmap — Dirt Trails

*Template: Week → Goal → Deliverable*

| Week | Goal | Deliverable | Status |
|------|------|-------------|--------|
| **—** | **MVP foundation shipped** | Consumer marketplace live on `bookings.dirt-trails.com` with search, multi-vertical listings, MarzPay checkout, vendor portal, and automated fulfillment queue | **Done** |
| **1** | Stop untrusted paid state | Production deploy where only MarzPay/webhook can set `paid`; RLS live on `wallets`, `transactions`, `bookings`, `profiles`; vendor PII no longer publicly readable | **In progress** |
| **2** | One settlement door | Every successful payment credits ledger + vendor pending wallet + platform fee from booking snapshot (auditable payment reference) | **In progress** |
| **3** | Money history healed + ops safe | Historical paid bookings backfilled; failed fulfillment jobs alert within 24h; RLS enabled on `orders` and `tickets` | **Remaining** |
| **4** | Supply ready to sell | ≥5 vendors with live, bookable listings; vendor approval SLA published; demo-ready inventory on homepage/categories | **Remaining** |
| **5** | Checkout converts diaspora tourists | Instrumented funnel (search → pay → paid); improved MoMo failure/retry UX; reliable booking confirmation email/ticket | **Remaining** |
| **6** | Trust matches marketing | Working self-service cancellation within policy **or** updated copy; cancellation visible on listing pages; webhook-only paid rule verified | **Remaining** |
| **7** | Vendors trust earnings | Dashboard shows pending vs available balance; each transaction line shows gross / fee / net; automated hold-release schedule documented | **In progress** |
| **8** | Startup Hatch proof point | ≥10 paid consumer bookings; funnel + settlement audit report; bootcamp demo aligned with [dirt-trails.com](https://www.dirt-trails.com) claims | **Remaining** |

---

## By status

| Status | Weeks |
|--------|-------|
| **Done** | Foundation (pre-week 1) |
| **In progress** | 1, 2, 7 |
| **Remaining** | 3, 4, 5, 6, 8 |

---

## Copy-paste table (for Startup Hatch form)

| Week | Goal | Deliverable |
|------|------|-------------|
| — | MVP foundation shipped | Live marketplace, MarzPay checkout, vendor portal, fulfillment queue |
| 1 | Stop untrusted paid state | Webhook-only paid; RLS on core money tables; vendor data secured |
| 2 | One settlement door | Ledger + vendor wallet + platform fee on every MarzPay success |
| 3 | Money history healed + ops safe | Backfill complete; job-failure alerts; orders/tickets RLS |
| 4 | Supply ready to sell | 5+ vendors with live listings; approval SLA live |
| 5 | Checkout converts tourists | Funnel instrumented; MoMo UX improved; confirmations reliable |
| 6 | Trust matches marketing | Cancellation product or copy fixed; paid rules audited |
| 7 | Vendors trust earnings | Pending/available wallets; gross/fee/net statements; payout schedule |
| 8 | Startup Hatch proof point | 10 paid bookings; metrics report; demo-ready pitch |
