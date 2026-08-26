# Task 8 report — smoke on Travel Tails

**Status:** DONE (after webhook/worker JWT fix)

## Passed

- Restaurant RPC: `create_quote_pay_link` on Luwombo → `{ success: false, error: "restaurants_have_no_payment_links" }`
- Quote RPC `search_path` now includes `extensions` so `gen_random_bytes` works
- Custom quote **DT-INV-T8-1000** collect 1000 UGX, catalog listing still 6750 USD
- Booking before pay: `pricing_source=quote`, `platform_fee=0`, `payment_status=pending`
- Real MarzPay Airtel 1000 UGX completed (first Airtel attempt failed; second succeeded)
- After settle: quote `paid` / `amount_paid_ugx=1000`, booking `confirmed`+`paid`, vendor pending **+940**, fulfillment job completed

## Incident

Pay page stayed on USSD because live `marzpay-webhook` required JWT (MarzPay callback 401) and the worker cron also 401'd. Redeployed webhook, payment-status, and fulfillment worker with `verify_jwt=false` (they use their own secrets). Payment-status now refreshes from MarzPay when the row is still processing.

Do not re-enable JWT on webhook or worker.
