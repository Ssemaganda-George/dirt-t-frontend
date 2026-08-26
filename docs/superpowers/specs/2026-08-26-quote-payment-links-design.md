# Quote payment links

**Date:** 2026-08-26  
**Status:** Approved 2026-08-26 — implement from the plan in `docs/superpowers/plans/`  
**Integrity:** Touches MarzPay, `bookings`, `payments`, vendor wallets, and emails. Do not ship until this spec is approved.

## Problem

DirtTrails often agrees a price on WhatsApp (invoice DT-INV-2026-003: $242). Catalog listings stay at the real price and checkout adds a booking fee and mixed currencies (RWF on screen, UGX on the phone). The client should pay **the bargained figure** via a link, get confirmation emails, and appear as a booking — without changing the van/hotel list price.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Who creates the link | Admin only |
| Amount on the link | Admin picks: full / 50% deposit / custom amount |
| Attach to | Existing listing **or** custom line items (still hung on a listing — `bookings.service_id` is NOT NULL) |
| Who is paid | Vendor wallet, platform commission on **this charge** |
| Currency | Admin picks display currency; MarzPay always collects **UGX** |
| Tourist booking fee on the link | **Zero** — the agreed number is the number |
| Restaurants | No payment links (reservation-only) |

## What it is not

- Not a discount code on the public checkout (fees would leak back in).
- Not a catalog price change.
- Not a restaurant payment.
- Not client-set amounts. The collect Edge Function must charge the **stored UGX amount**, not whatever the browser posts.

## User flow

### Admin (create)

Path: `/admin/quotes` → **New pay link**.

1. Guest: name, email, phone (required — guest booking rule).
2. Vendor (required).
3. Listing (required). Catalog price is shown as a hint only; it is **not** used.
4. Mode: **This listing** (one line: listing title × qty) **or** **Custom invoice** (line items: description, qty, unit price). Example: “Sheron Hotel — 6 nights $27” + “Pick-up & drop-off $80”.
5. Agreed total (from line items, editable).
6. Charge type: full / 50% deposit / custom (custom must be > 0 and ≤ agreed total).
7. Display currency (USD / UGX / RWF) for the invoice look.
8. **UGX to collect** (required). This is what MarzPay and the USSD prompt use. Admin types it (e.g. $242 → `890000`). No silent FX.
9. Service date / nights / notes / valid-until (default 30 days).
10. Save → copy `https://bookings.dirt-trails.com/pay/{token}` → WhatsApp to the client.

### Client (pay)

Public page `/pay/:token`. No login.

Shows: DirtTrails, invoice number, guest name, line items, agreed total in display currency, **Pay UGX X** as the only charge, no booking fee, MarzPay MTN/Airtel.

Expired / already paid / cancelled → clear message, no collect.

On success: same booking emails as today (`send-booking-emails`). Thank-you on the page.

### Deposit then balance

One quote row can have **two links** (or one link reused after deposit):

- First collect = deposit UGX. Booking is created/confirmed for **that** amount. Wallet credit = that amount minus commission.
- Quote shows `amount_paid` vs `agreed_total`. Admin clicks **Create balance link** for the remainder.
- Second collect = remaining UGX. A **second payment** on the same booking; wallet credit = that second amount minus commission. Booking `total_amount` becomes sum of completed payments. `payment_status` = `paid` only when sum ≥ agreed UGX collect.

**Never credit a wallet more than MarzPay has completed for that quote.**

## Data

New table `quotes` (name in DB: `quotes`):

- `id`, `invoice_no` (e.g. `DT-INV-2026-003` or auto `DT-Q-2026-004`)
- `token` unique, unguessable
- `vendor_id`, `service_id` (required)
- `guest_name`, `guest_email`, `guest_phone`
- `line_items` jsonb `[{ description, qty, unit_price, amount }]`
- `agreed_total`, `display_currency`
- `charge_type` `full | deposit | custom`
- `collect_amount_ugx` (this link’s MarzPay amount)
- `agreed_total_ugx` (full job in UGX, for deposit math)
- `amount_paid_ugx` default 0
- `valid_until`, `notes`, `service_date`, `end_date`
- `booking_id` nullable until first successful pay (or set when pending booking is created)
- `status` `draft | sent | deposit_paid | paid | expired | cancelled`
- `created_by` admin profile id
- `created_at`, `updated_at`

RLS: admin all; vendor SELECT own `vendor_id`; anon **no** table access. Public page reads via a **SECURITY DEFINER** RPC `get_quote_by_token(token)` returning only what the pay page needs (no payout fields).

Booking:

- Created as **guest booking** (`is_guest_booking`, name/email/phone).
- `total_amount` = UGX collected **so far** (starts as this link’s `collect_amount_ugx`).
- `currency` = `UGX`.
- `platform_fee` = 0.
- `pricing_source` = `quote` (add to check constraint; `pricing_reference_id` = quote id).
- `commission_amount` = `total_amount * rate`, `vendor_payout_amount` = `total_amount - commission` (existing checks).
- After a balance payment, recompute those three from the new total (same identities).

Pending booking may be created when the link is saved (holds the row for MarzPay `booking_id`) or on first collect. Prefer **create pending booking when the link is saved** so `marzpay-collect` already has a `booking_id`.

## Payments

Reuse: `marzpay-collect` → `marzpay-webhook` → `process-payment-fulfillment-queue` → `send-booking-emails`.

Changes:

1. Collect: if booking `pricing_source = quote`, **ignore client `amount`**; use `quotes.collect_amount_ugx` (or remaining balance UGX).
2. Worker: restaurants still skip; quote bookings settle like other paid bookings.
3. Balance payment: new `payments` row, same `booking_id`; worker credits the **delta** only (this payment amount), then updates booking totals.

## Emails

First successful payment: existing booking confirmation to guest + vendor.

Balance payment: same channel, subject/body note “balance received”.

## Admin list

`/admin/quotes`: invoice no, guest, vendor, listing, agreed vs collected UGX, status, copy link, expire, create balance link.

Vendors see the booking on their normal bookings page (agreed price, not catalog). They do not create links in v1.

## Halt rules (unchanged)

- Do not mark paid without a completed MarzPay payment.
- Do not settle restaurants.
- Do not let the SPA set `payment_status = paid`.
- Ledger credit = completed payments only.

## Out of scope (v1)

- Auto FX from USD to UGX
- Client login / tourist wallet
- Vendor-created links
- PDF invoice generation
- Changing catalog prices
