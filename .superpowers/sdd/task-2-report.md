# Task 2 Report: `quotes` table, RPCs, RLS

**Status:** DONE_WITH_CONCERNS  
**Commits:** none (per controller: do not git commit)  
**Applied to live:** no (per controller: write migration file only)

## What was implemented

Postgres migration `supabase/migrations/20260826120000_quote_payment_links.sql`:

- `CREATE EXTENSION IF NOT EXISTS pgcrypto` (required by `gen_random_bytes`)
- Extends `bookings.pricing_source` check to allow `'quote'` (and NULL)
- Table `public.quotes` with indexes, RLS, admin ALL + vendor SELECT-own
- RPCs: `next_quote_invoice_no`, `create_quote_pay_link`, `get_quote_pay_page`, `enable_quote_balance_link`, `cancel_quote_pay_link`
- Restaurant `category_id = 'cat_restaurants'` rejected with `restaurants_have_no_payment_links`
- Admin-only create/enable/cancel (`is_admin_user()`); anon execute only on `get_quote_pay_page`

## Live confirmations (read-only `execute_sql`, no DDL)

| Check | Result |
|---|---|
| `create_booking_atomic` overloads | 14-arg and **15-arg** both exist |
| 15-arg identity | `p_service_id uuid, p_vendor_id uuid, p_booking_date date, p_guests integer, p_total_amount numeric, p_tourist_id uuid, p_service_date date, p_currency text, p_special_requests text, p_guest_name text, p_guest_email text, p_guest_phone text, p_pickup_location text, p_dropoff_location text, p_pricing_base_amount numeric` |
| jsonb success key | **`booking_id`** (`RETURN jsonb_build_object('success', true, 'booking_id', v_booking)`) — matches `20260612180100_restaurant_reservation_status.sql` |
| `bookings_pricing_source_check` | exists; currently `tier` \| `override` only |
| `pgcrypto` | already installed; `IF NOT EXISTS` still in file |
| `is_admin_user()` | exists |

Positional call in `create_quote_pay_link` is 15 arguments, so Postgres resolves the 15-arg overload, not the 14-arg one.

## GRANT signature self-review

| Function | Argument list | GRANT/REVOKE signature | Match |
|---|---|---|---|
| `create_quote_pay_link` | uuid, uuid, text, text, text, jsonb, numeric, text, text, integer, integer, text, text, date, date, timestamptz | same | yes |
| `get_quote_pay_page` | text | text | yes |
| `enable_quote_balance_link` | uuid | uuid | yes |
| `cancel_quote_pay_link` | uuid | uuid | yes |
| `next_quote_invoice_no` | (none) | `()` | yes |

Execute grants:

- `create_quote_pay_link`, `enable_quote_balance_link`, `cancel_quote_pay_link`, `next_quote_invoice_no` → `authenticated` only; `REVOKE ALL … FROM PUBLIC, anon`
- `get_quote_pay_page` → `anon, authenticated` (only new RPC anon may execute)

Delta vs brief SQL: extra `REVOKE ALL ON FUNCTION public.next_quote_invoice_no() FROM PUBLIC, anon` so default PUBLIC execute does not leak invoice sequencing to anon.

## TDD / tests

SQL-only task. No Vitest. Migration **not** applied; no live `to_regclass('public.quotes')` verification.

## Files changed

| File | Action |
|---|---|
| `supabase/migrations/20260826120000_quote_payment_links.sql` | Created |

No npm packages. No other source files. No git commit.

## Self-review findings

1. **GRANT identities match CREATE FUNCTION argument lists exactly.**
2. **Restaurant halt is in the RPC** before insert/booking (`cat_restaurants` → `restaurants_have_no_payment_links`).
3. **Admin gate** is inside create/enable/cancel; non-admin authenticated callers get `{success:false, error:not_admin}` rather than a privilege error.
4. **`get_quote_pay_page` returns pay-page fields only** (no wallet/payout columns).
5. **15-arg `create_booking_atomic` call** matches live Travel Tails; return key `booking_id` confirmed.
6. **`pgcrypto` added** before `gen_random_bytes`.
7. **Quotes RLS:** no anon policy; vendors SELECT own `vendor_id`; admins ALL via `is_admin_user()`.
8. **Did not apply SQL to live** — brief Step 2/3 skipped per controller.

## Concerns

- **Not applied to Travel Tails.** Controller applies after review. Brief Step 2 (`to_regclass` / `pg_proc`) and Step 3 (restaurant create halt) are unverified on live.
- **`invoice_no` is not UNIQUE**; `next_quote_invoice_no` uses `COUNT(*)` and can collide under concurrent admin creates. Brief SQL has this; not changed.
- **Anon table privileges rely on RLS**, not `REVOKE … ON TABLE public.quotes FROM anon`. Default Supabase table grants may still list anon; with no anon policy, RLS denies row access. Public reads go through `get_quote_pay_page`.
- **`service_role` has no explicit EXECUTE** on admin RPCs after `REVOKE FROM PUBLIC`. Admin SPA uses `authenticated`. Later Edge Functions that need create/enable/cancel must be granted separately. `get_quote_pay_page` remains executable via PUBLIC default + anon/authenticated grants.
- **`p_collect_amount_ugx integer` is passed into numeric `p_total_amount` / `p_pricing_base_amount`** — Postgres coerces; amounts stay whole UGX.
- **Uncast `NULL` tourist/pickup/dropoff** is unambiguous because the call has 15 arguments (only one matching overload).
- **Commission snapshot in `create_booking_atomic` still runs**, then the quote path sets `platform_fee = 0` and `fee_payer = 'vendor'`. Wallet settlement of the charge is later tasks; restaurants never reach this RPC.

## Halt / integrity

No ledger, wallet, or MarzPay mutation in this file. Quote create inserts a **pending** booking via existing `create_booking_atomic` and tags `pricing_source = 'quote'`. Restaurant category cannot create a pay link.

## Task 2 Important findings fix (2026-08-26)

**Status:** DONE — validation gaps closed in migration file only (not applied to live; no commit).

**Changes in `create_quote_pay_link`:**

1. **Guest contact required** — After admin gate, normalize guest fields once (`trim` name/phone, `lower(trim)` email). If any normalized value is `''`, return `{success: false, error: 'guest_contact_required'}` before service lookup or insert.
2. **Vendor/service ownership** — Service SELECT now loads `category_id` and `vendor_id`. If `vendor_id IS DISTINCT FROM p_vendor_id`, return `{success: false, error: 'vendor_service_mismatch'}` before restaurant/amount checks.
3. **Reuse normalized guest vars** — INSERT into `quotes` and 15-arg `create_booking_atomic` call use `v_guest_name`, `v_guest_email`, `v_guest_phone` instead of inline trim/lower.
