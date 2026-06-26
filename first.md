# DirtTrails live UX audit — Shops, vendor onboarding, admin ops

## Mandatory setup (Superpowers)

Before ANY browsing, code reading, or reporting:

1. Invoke `using-superpowers` and follow it strictly.
2. Invoke `impeccable` and load `reference/critique.md`, `reference/polish.md`, `reference/heuristics-scoring.md`, and `reference/cognitive-load.md`.
3. Read project context: `CLAUDE.md`, `first.md`, and `PRODUCT.md` / `DESIGN.md` if present.

Do not skip skills because "this is just browsing." Skills govern HOW you audit.

## Browser access (required)

Use the **Claude browser extension** (Claude in Chrome) for all live-site interaction.

- Navigate, click, scroll, fill forms, and capture what you see on the real DOM.
- Take **screenshots at every friction point** (before/after critical actions).
- Test **mobile (375px)** and **desktop (1280px)** using DevTools device emulation or resize.
- Do **not** rely on codebase guesses for UI state — verify on https://bookings.dirt-trails.com/
- If the extension cannot reach a step (auth wall, iframe, payment SDK), document the exact blocker and what the user would see.

**Do not use Playwright unless the extension is unavailable.** Extension-first.

## Target

**Production site:** https://bookings.dirt-trails.com/

**Stack context (do not assume otherwise):** Vite · React · Supabase · MarzPay (MoMo). Restaurants = reservation-only, no payment. Shops = paid retail (buy / hire / experience). Marketplace agent model: UI must match ledger, vendor wallet, and fulfillment.

## Mission

Act as a Principal Engineer + Marketplace UX strategist. Run a **live, end-to-end exploratory audit** via the browser extension across all tracks below.

---

### Track A — Guest: buy from Shops (conversion path)

Complete as many real purchase attempts as possible. Document every drop-off.

**Route (adapt to live IA):**

1. Homepage → Shops (`/category/shops` or nav)
2. Browse → open 2–3 shop listings (mix **buy** vs **hire** if available)
3. Detail page: pricing, quantity, hire dates, CTA copy, trust signals
4. Cart / checkout → guest vs login → MarzPay / MoMo UI
5. Post-submit: confirmation, order reference, "what happens next"
6. Repeat key steps at **375px** and **1280px**

**Payment boundary:** Go as far as the UI allows. **Do not complete a live MoMo charge** — stop at the payment screen and record trust gaps (totals, fees, phone field, errors).

---

### Track B — Existing vendor dashboard

Log in as an **approved** vendor and compare vendor-facing truth vs guest checkout.

**Login URL:** https://bookings.dirt-trails.com/vendor-login?signup=false

- Email: `dinducatering@gmail.com`
- Password: `0754092850`

Visit at minimum: `/vendor`, `/vendor/bookings`, `/vendor/services`, `/vendor/transactions`, `/vendor/profile`, `/vendor/settings`.

Flag **guest vs vendor misalignment** (amounts, status labels, order visibility, wallet buckets).

---

### Track C — Admin dashboard

Log in as admin and audit operational surfaces that affect vendors, shops, and payouts.

**Login URL:** https://bookings.dirt-trails.com/login

- Email: `ssgeorge480@gmail.com`
- Password: `guide123`

After login, confirm redirect to `/admin` (or navigate there). Visit at minimum:

- `/admin` — dashboard, pending vendor alerts
- `/admin/vendors` or `/admin/businesses` — vendor list, pending filter, approve/reject flows
- `/admin/services` — pending service approvals (especially shops)
- `/admin/bookings` — order/booking visibility
- `/admin/finance` or wallet routes — vendor balances, release requests if visible

Document: clarity of pending queues, approve/reject UX, whether admin actions match what vendors see, and any dead ends or missing context when reviewing a new vendor application.

---

### Track D — Full vendor onboarding (signup → go-live)

Investigate the **entire new-vendor journey** end-to-end. Use a **fresh test email** you control (e.g. `+alias` on a mailbox you own) for signup — do **not** reuse the existing vendor or admin accounts for this track.

**Phase 1 — Vendor signup (vendor perspective)**

1. Open https://bookings.dirt-trails.com/vendor-login?signup=true
2. Complete all signup steps (typically: personal info → business details → password/terms)
3. Screenshot every step; note field labels, validation errors, required vs optional confusion
4. Submit and record: success message, email verification requirement, redirect target
5. If sent to `/vendor-pending`, audit that page: copy, refresh status, sign-out, mobile layout
6. Attempt to access `/vendor` before approval — document gate behavior

**Phase 2 — Admin approval (admin perspective)**

1. Log in as admin (Track C credentials) in a separate session or after sign-out
2. Find the new application in pending vendors (`/admin/vendors` or `/admin/businesses`, Pending filter)
3. Review what admin sees vs what vendor submitted — missing fields, no document upload, unclear business type?
4. Approve (or document reject flow if using a disposable test account you can discard)
5. Note latency: does vendor pending page update on refresh? Any email notification implied but missing?

**Phase 3 — Post-approval vendor activation (vendor perspective)**

Log back in as the **new test vendor** (after approval). Walk through everything needed to **go live with a shop listing**:

1. `/vendor` dashboard — first-run guidance, empty states, next-step CTAs
2. `/vendor/profile` — required profile fields, save feedback
3. `/vendor/services` — create a **shop** service (buy and/or hire if offered); note form length, image upload, pricing fields, listing type clarity
4. Service submission → pending state — what does vendor see while awaiting admin service approval?
5. `/vendor/availability` — relevant or confusing for shops?
6. `/vendor/transactions` — wallet empty state, pending vs available copy
7. After admin approves the test service (switch to admin again if needed): confirm listing appears on `/category/shops` and is bookable (link to Track A)

**Onboarding deliverable:** A **stage-by-stage funnel map** with drop-off points:

`Discover → Signup step 1 → 2 → 3 → Email verify? → Pending → Admin review → Approved → Profile → First service → Service pending → Service live → First order visible`

Flag **conceptual misalignment** where onboarding steps disagree with other categories (e.g. tours wizard vs shops form, restaurant zero-payment rules leaking into shop copy).

---

## Classification (every finding)

| Layer | Meaning |
|-------|---------|
| **Technical bug** | Broken behavior, console/network errors |
| **UX failure** | Works but confuses or slows conversion / activation |
| **Business-model gap** | UI contradicts marketplace rules (pay vs reserve, wallet state) |
| **Conceptual misalignment** | Flow inconsistent with sibling features (shops vs tours, vendor vs admin views) |

Impeccable drift tags when relevant: **missing token** · **one-off implementation** · **conceptual misalignment**

## Score (0–4 each)

- Nielsen 10 heuristics
- Cognitive load (>4 choices at one decision point)
- Emotional journey at pay / confirm / login / signup / pending approval
- Mobile: touch targets, overflow, readability
- AI-slop / generic marketplace tells

## Evidence per finding

- Screenshot reference (extension capture)
- **URL** + **viewport**
- **Role:** guest | vendor | admin
- **Category:** shops | onboarding | admin
- **Severity:** P0 · P1 · P2 · P3
- **Classification** + **risk:** Revenue | Trust | Payout integrity | Vendor experience | None
- **One concrete fix** (route, component, or copy — infer from repo if you have it)

## Deliverables

### 1. Executive summary (≤250 words)

Top issues across: shop conversion, vendor onboarding activation, admin ops. Split **"this week"** vs **strategic**.

### 2. Findings table

| # | Page | Issue | Class | Severity | Risk | Fix |
|---|------|-------|-------|----------|------|-----|

### 3. Funnel maps (Mermaid or ASCII)

- **Shop purchase:** Homepage → Category → Detail → Cart → Pay → Confirm
- **Vendor onboarding:** Signup → Pending → Admin approve → Profile → Service → Live listing

Mark bottlenecks on both.

### 4. Cross-role misalignment list

Guest checkout vs vendor dashboard vs admin records — anywhere the three views disagree.

### 5. Append to `issues.md` (project root, newest first)

For each P0/P1:

```markdown
## [YYYY-MM-DD] - [Brief Title]

**Context:** User role: X | Page: Y | Action: Z | Category: [shops | onboarding | admin]

**Classification:** [technical bug / UX failure / business-model gap]

**Analysis:** [root cause + risks]

**Recommended Fix:** [one concrete fix] (Priority: CRITICAL/HIGH/LOW)
```

### 6. Heuristic scorecard

| Heuristic | 0–4 | Worst live example |

## Rules

- Extension-verified observations only for UI claims.
- **Never paste credentials into `issues.md` or other repo files** — this file is the credential source for the audit session only.
- For Track D signup, use a disposable test email; clean up or leave rejected if you cannot delete the test account.
- One **complete** journey per track beats shallow page tours.
- DirtTrails-specific; no generic travel advice.
- Backend suspicion → note `DB CHECK needed` + suggested query.

## Success criteria

`issues.md` + P0 table are actionable for engineering: shop conversions, vendor activation rate, and admin approval friction addressed this week.
