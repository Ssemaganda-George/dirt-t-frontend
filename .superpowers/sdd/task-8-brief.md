# Task 8: Smoke on Travel Tails (no fake paid)

**Files:** none (manual)

- [ ] Admin `/admin/quotes` creates DT-INV-style custom lines, UGX collect 1000 (or real test amount)
- [ ] Open `/pay/{token}` logged out — total is UGX only, no booking fee
- [ ] Confirm `bookings.pricing_source = quote`, `platform_fee = 0`, `payment_status = pending` before pay
- [ ] After a real MarzPay test pay: `payments.status = completed`, quote `amount_paid_ugx` matches, vendor wallet increased by payout not by catalog price
- [ ] Restaurant listing rejected by RPC
- [ ] Browser POST to collect with `amount: 1` on a quote booking still charges DB UGX

If ledger total ≠ wallet sum after the test, **HALT** — do not ship.

Do not fake `payment_status = paid`. Do not change catalog `services.price`.
