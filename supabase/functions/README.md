Supabase Edge Functions for booking reconciliation and reporting

Files:
- `report-booking-issue/index.ts` — accepts POST payloads with `bookingId`/`booking_id`, `issueType`, and `details`. Inserts a row into the `booking_issues` audit table using the Supabase REST API and the `SERVICE_ROLE` key from environment.
- `reconcile-booking/index.ts` — accepts admin-led reconciliation actions and inserts an audit row into `booking_issues`. If `RECONCILE_SECRET` is set, the function requires `x-reconcile-token` header to match.

Deploy (supabase CLI):

1. Install supabase CLI: https://supabase.com/docs/guides/cli
2. Set environment variables for the function runtime (recommended in project or via the Supabase dashboard):

  - `SUPABASE_URL` (your Supabase URL)
  - `SUPABASE_SERVICE_ROLE_KEY` (service role key)
  - `RECONCILE_SECRET` (optional secret for reconcile endpoint)

3. From this repository root, deploy functions:

  ```bash
  supabase functions deploy report-booking-issue --project-ref <project-ref>
  supabase functions deploy reconcile-booking --project-ref <project-ref>
  ```

4. Ensure the SQL migration `db/011_add_transactions_and_process_payment_and_issues.sql` is applied to your database (via `supabase db push` or your migration tooling).

Notes:
- These function stubs intentionally do minimal work: they write audit rows so admins can review issues and reconciliations. For robust reconciliation, implement server-side logic that calls payment gateways, verifies webhooks, and creates idempotent transaction records.
