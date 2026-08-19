# AI Trip Planner — Design

**Status:** design, not built
**Date:** 2026-08-19
**Goal chosen:** convert the 23,258 app visits that produced 20 bookings
**Autonomy chosen:** plan → instant book + pay

---

## 1. The constraint that shapes everything

Before designing, I queried the live DB. This is what the planner would actually
have to compose from:

| Category | Approved | Priced | Has location | Notes |
|---|---|---|---|---|
| Shops | 25 | 25 | 24 | All one Ntinda supermarket. Retail, not travel. |
| Transport | 13 | 8 | 13 | All Kampala/Entebbe local |
| Tours | 9 | 9 | **1** | 8 have `location = NULL`, 1 has `duration_days` |
| Activities | 8 | 1 | **0** | No location at all |
| Hotels | 2 | 2 | 2 | Entebbe, Muyenga |
| Restaurants | 1 | 1 | 1 | Kireka |

**Bookable multi-day travel inventory outside Kampala: roughly one Bwindi tour.**

A trip planner that composes itineraries purely from this catalog will return
"Day 2: nothing available" for essentially every request. That is not a prompt
problem and no model fixes it.

So the design does not treat the catalog as the itinerary. It treats the
catalog as the *bookable subset* of an itinerary, and makes the gap productive.

---

## 2. Core mechanic — two kinds of slot

Every slot the planner emits is exactly one of two kinds.

```
Day 3 — Bwindi
  ├─ 07:00  BOOKABLE  Gorilla trekking permit      service_id: 8f2a…   UGX 2,400,000
  ├─ 13:00  WISH      Lunch at Buhoma community    no vendor           "Request this"
  └─ 19:00  WISH      Overnight, Bwindi lodge      no vendor           "Request this"
```

**BOOKABLE** — carries a real `services.id` that is `status = 'approved'`.
Priced by the database. Goes into checkout.

**WISH** — a real place or experience DirtTrails has no vendor for. Renders as
proper itinerary content (what it is, why it's there, rough cost band) with a
single CTA: *Request this*. That writes a demand row.

### Why this is the right shape, not a workaround

1. **The traveler gets a complete, credible trip on day one**, instead of a
   three-item list that reads like a broken site. Credibility is the conversion
   blocker at 23k visits → 1 confirmed booking.
2. **Every WISH click is a priced demand signal**, timestamped and geolocated.
   "Forty-one people asked for a Bwindi lodge this month" is the single best
   vendor-acquisition pitch DirtTrails can hold — and it is generated for free
   by traffic that currently bounces.
3. **It self-corrects as inventory lands.** Onboard a Bwindi lodge and the slot
   silently flips from WISH to BOOKABLE with zero planner changes. That is the
   answer to "inventory growth is uncertain": the design works at both ends.

WISH rows land in a new table modelled on `safari_inquiries` (which already has
`countries`, `activities`, `days`, `budget`, `adults`, `children`, `rooms`).
Reuse that shape; do not invent a new inquiry schema.

---

## 3. The money boundary — non-negotiable

> **The model never emits a number that becomes a charge.**

The model's only pricing-relevant output is a `service_id`. Everything else is
recomputed server-side.

```
model output  →  { service_id, date, guests }        ← ids and intent only
                          ↓
server pass   →  re-fetch service from DB
                 reject if missing / not 'approved' / vendor inactive
                 recompute price via existing PricingService
                          ↓
user sees     →  DB-derived price, always
```

`src/services/PricingService.ts` and `service_fees_settings` stay the single
source of truth. `customerTotalFromUnitPricingCalc`,
`applyFeePayerSplitFromPlatformFee`, and `vendorTierCommissionRateForDb` are
called exactly as the existing checkout calls them. Do not reimplement fee math
inside the planner — a second pricing path is how ledger drift starts.

A hallucinated `service_id` therefore cannot mis-price anything. It can only
cause the slot to be dropped, which is a rendering outcome, not a financial one.

---

## 4. Architecture

Four pieces. One new table, one new edge function, one new page, one reused
checkout.

### 4.1 Catalog goes in the prompt, not behind a search tool

55 approved services with title, category, location, price, duration, and
`tour_highlights` is roughly 3–4k tokens. **That fits in the prompt.**

So phase 1 has **no tool calls at all**. The whole catalog is a cached system
prompt block; the model picks ids from a list it can see in full. This removes
the entire tool-loop, its latency, and its failure modes.

```ts
system: [
  { type: 'text', text: PLANNER_INSTRUCTIONS },
  { type: 'text', text: catalogText, cache_control: { type: 'ephemeral' } },
]
```

Cache the catalog block; it changes only when a vendor is approved. Claude Opus 5
has a 512-token cache minimum, so a 3k-token catalog caches comfortably and
costs ~0.1× on every subsequent plan.

<!-- ponytail: full catalog in-prompt. Swap to a search_inventory tool when
     approved services exceed ~500, or when the catalog block stops fitting
     alongside the conversation. Not before. -->

### 4.2 Edge function `trip-planner`

Nineteen edge functions already exist; this is the established pattern. Deno,
so `npm:@anthropic-ai/sdk`.

```ts
const response = await client.messages.create({
  model: 'claude-opus-5',
  max_tokens: 16000,
  thinking: { type: 'adaptive' },
  output_config: {
    effort: 'medium',
    format: { type: 'json_schema', schema: TRIP_PLAN_SCHEMA },
  },
  system: [...],
  messages: [{ role: 'user', content: tripRequest }],
})
```

Notes on the API surface (verified against the current reference):

- `claude-opus-5` — thinking is **on by default**; `max_tokens` caps thinking
  plus response together, so 16000 is the floor, not a generous number.
- `temperature` / `top_p` / `budget_tokens` are **rejected with a 400**. Do not
  add them.
- `effort: 'medium'` is deliberate. Opus 5 is unusually strong at low/medium and
  this is a constrained selection task, not open-ended reasoning. Sweep it
  against real plans before settling.
- `output_config.format` with a JSON schema replaces any prefill-and-parse
  approach; assistant prefills 400 on this model.
- Handle `stop_reason === 'refusal'` before reading `content`.

### 4.3 Schema

```jsonc
{
  "title": "5 days: Kampala, Bwindi gorillas",
  "days": [{
    "day": 1,
    "date": "2026-09-14",
    "location": "Entebbe",
    "slots": [{
      "kind": "bookable",          // or "wish"
      "service_id": "uuid",        // bookable only — the ONLY id the model emits
      "time": "14:00",
      "guests": 2,
      "why": "Airport-side, short transfer after a long flight",

      "wish_title": "…",           // wish only
      "wish_category": "hotels",   // wish only — drives the vendor-demand report
      "wish_cost_band": "mid"      // wish only — never a number
    }]
  }]
}
```

`additionalProperties: false` and a full `required` list on every object — the
API requires it for structured outputs.

### 4.4 Storage — one table

```sql
create table trip_plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users,      -- null for guests
  visitor_id    text,                            -- ties to visitor_sessions
  request       jsonb not null,                  -- what the traveler asked for
  plan          jsonb not null,                  -- reconciled plan, DB prices
  status        text not null default 'draft',   -- draft | booked | abandoned
  created_at    timestamptz not null default now()
);
alter table trip_plans enable row level security;
```

RLS: owner reads own rows; anon reads by `visitor_id` only; **admin-only write
outside the edge function**. No vendor role gets read access — a plan reveals
which competitors were selected.

One table. No `trip_plan_slots`, no `trip_plan_versions`. The plan is a
document and is read as a whole every single time.

---

## 5. Checkout — where I have to stop and flag

`orders` / `order_items` exist but `order_items` keys on `ticket_type_id`. It is
the **event-ticket** cart and cannot hold services. `bookings` is strictly one
service per row.

So a 5-day trip with 4 bookable slots across 3 vendors is **4 bookings and
potentially 3 vendor payouts from one traveler intent**. That is the ledger
question, and per the project rules I am flagging it rather than picking:

### Option A — sequential, reuse everything (recommended for phase 1)

Each bookable slot checks out through the **existing** single-service flow
(`createBookingAtomicRpc` → `marzpay-collect` → `marzpay-webhook` →
`process-payment-fulfillment-queue`). The plan page walks the traveller through
them one at a time with a progress bar.

- Zero new payment code. Zero new ledger paths. Existing reconciliation,
  existing fulfilment queue, existing `vendor_balance_holds`.
- Honest failure mode: leg 3 fails, legs 1–2 stand as real confirmed bookings.
  Nothing is orphaned and nothing needs unwinding.
- Cost: 4 MoMo PIN prompts. Real friction — but a traveler who completes 2 of 4
  is still 2 more confirmed bookings than the platform has managed in 3 months.

### Option B — single collection, fan out (phase 2)

One MarzPay collection for the trip total, then split into per-vendor bookings
via the fulfilment queue.

**Do not build this until these are answered:**

1. One `payments` row now maps to N `bookings`. `bookings.payment_reference` is
   scalar — does it become a trip reference, or does a join table appear?
2. If leg 2's capacity is gone at fan-out time after money is collected, what
   refunds it, and against which ledger entry?
3. Commission is earned per completed booking. A trip-level collection has to
   split commission across vendors at different `vendor_tiers` — which rate
   applies, and is it snapshotted at collection or at fan-out?
4. `payment_fulfillment_jobs` currently assumes one job per payment. Multi-leg
   makes partial failure a first-class state that has no representation today.

Answer 1–4 before a line of code. Getting this wrong breaks payout integrity,
which is worse than shipping option A.

**Recommendation: ship A, instrument the drop-off between legs, and let that
data decide whether B is worth its ledger complexity.**

---

## 6. Capacity

`service_capacity` has 82 rows: `(service_id, service_date, reserved)`. Check it
during the server reconciliation pass and mark a slot `unavailable` before the
traveler ever sees a price. Do **not** hold capacity at plan time — a plan is a
quote, not a reservation, and speculative holds on 55 listings would strangle
the catalog.

Capacity is taken where it is taken today: inside `createBookingAtomicRpc`.

---

## 7. Restaurants

The single restaurant listing is reservation-only. If a restaurant appears in a
plan it is **always** rendered as a reservation slot, never a bookable one — no
price, no checkout, no wallet touch, no ledger entry, ever. Enforce this in the
reconciliation pass by category, not by prompt instruction: a model told not to
price restaurants will eventually price a restaurant.

```ts
if (svc.category_id === RESTAURANTS) slot.kind = 'reservation'  // hard rule, not a hint
```

---

## 8. What this actually buys

| Metric | Today | What the planner changes |
|---|---|---|
| Visits → booking | 23,258 → 20 | Complete trips instead of a 3-item catalog |
| Confirmed bookings | 1 | Reuses the one checkout path that has ever worked |
| Vendor pipeline | ad-hoc | Every WISH click is a ranked, priced demand row |
| Inventory gaps | invisible | Become the acquisition roadmap |

The vendor-demand report is the part most likely to be undervalued and is
probably worth more than the itineraries. It is one grouped query:

```sql
select wish_category, wish_title, count(*) as demand, min(created_at), max(created_at)
from trip_wish_requests
group by 1, 2
order by demand desc;
```

That is the vendor pitch deck, generated by traffic that currently leaves.

---

## 9. Build order

1. **`trip_plans` table + RLS.** Verify no vendor/guest role can read it.
2. **`trip-planner` edge function.** Catalog in prompt, structured output,
   reconciliation pass. Ship it returning plans only — no checkout.
3. **Plan page.** Renders BOOKABLE and WISH slots. WISH CTA writes a demand row.
   *At this point the vendor-acquisition engine is live and earning, with zero
   payment surface touched.*
4. **Wire BOOKABLE slots to the existing single-service checkout** (option A).
5. **Instrument.** Plans generated → slots viewed → leg 1 started → leg 1 paid →
   leg 2 started. The drop-off between legs is the entire argument for or
   against option B.
6. **Revisit option B** only with that data and answers to §5.

Steps 1–3 carry no ledger risk and can ship independently. Step 4 is where the
existing payment path gets reused — not extended.

---

## 10. Open questions for you

1. **Guest planning.** Can an anonymous visitor generate a plan, or is auth
   required first? Auth-gating kills the top of funnel; not gating means paying
   Anthropic for bot traffic. Recommendation: allow guests, rate-limit by
   `visitor_id` against `visitor_sessions` (1,321 rows, already tracked).
2. **Cost ceiling.** At `effort: 'medium'` with a cached catalog a plan is a few
   cents. At 23k visits it is not nothing. Cap plans per visitor per day.
3. **Do WISH slots get sent to admin as leads immediately**, or batched into a
   weekly vendor-gap report? `inquiry_notification_queue` already exists for the
   first.
4. **Tours have no location.** 8 of 9 tour listings have `location = NULL` and
   all 8 activities have none. The planner cannot place them on a map or a day.
   This is a 20-minute data fix that raises the quality ceiling of every plan
   more than any prompt tuning will. Worth doing before step 2.

---

## Unrelated but blocking-adjacent

Supabase advisors flag **14 tables with RLS disabled**, including `orders`,
`order_items`, `tickets`, and `ticket_types` — anyone with the anon key can read
or modify every row. That is live payment data. The planner adds `trip_plans` to
a schema that already has this hole. I have not changed anything; enabling RLS
without policies would block all access, so it needs deliberate policies per
table. Flagging it because it is more urgent than this feature.
