# DirtTrails — Security (engineering)

Technical companion to [`SECURITY.md`](./SECURITY.md) (the non-technical shareable). Last updated 2026-08-24.

The browser is untrusted. The **anon key + Row Level Security** is the public API. **Paid state and wallet mutation are server-only** (MarzPay webhook + fulfillment worker using `service_role`). **Restaurants never enter that money path.**

```
Tourist / vendor / admin SPA
        │  VITE_SUPABASE_ANON_KEY only
        ▼
Supabase Auth (JWT) ──► Postgres RLS ──► public catalog + own rows
        │
        │  Edge Functions (service_role, secrets)
        ▼
MarzPay  ──webhook secret──►  payments.paid  ──queue secret──►  tickets / emails / ledger
```

`ProtectedRoute` is UX, not authorization.

## Identity and roles

| Piece | Where it lives | What it may decide |
|---|---|---|
| Supabase Auth user | `auth.users` | Session, email/phone proof, JWT `sub` |
| Profile role | `profiles.role` (`tourist` / `vendor` / `admin`) | Real authorization via RLS helpers |
| Vendor approval | `profiles.status = 'approved'` | Vendor portal access in the SPA |
| JWT `user_metadata` | Auth | **Must not** be used for authz |

Single auth entry: `src/services/AuthService.ts`. Client uses the **anon** key only (`src/lib/supabaseClient.ts`).

Role helpers: `auth_user_role()`, `is_admin_user()`, `is_vendor_user()` (`20260617120000_fix_profiles_rls_recursion.sql`).

## RLS (intended)

| Table | Client access | Mutation path |
|---|---|---|
| `profiles` | Own row; vendors can read others; admins all | User update own; admin insert/update |
| `vendors` | Own vendor row | Vendor / admin RPCs |
| `wallets` | Vendor own; admin all. No client write | RPC / `service_role` |
| `transactions` | Own tourist or vendor; admin all. Read-only | Settlement RPCs / worker |
| `bookings` | Vendor updates own; admin all | Atomic create, webhook, admin |

Key migrations: `20260612210000_enable_rls_money_tables.sql`, `20260612200000_security_vendor_rls_settlement_grants.sql`, `20260617120000_fix_profiles_rls_recursion.sql`.

`createBooking` strips `payment_status: paid`. `patch_booking_after_create` rejects paid.

## Open surfaces

- `bookings` public SELECT `USING (true)`
- `orders` / `tickets` RLS still listed as remaining
- Webhook/worker secrets skipped if env empty
- `verify-password` tries password against all vendor/admin emails
- Restaurant exclusion is status strings (`reserved` / `not_required`), not a hard category constraint

Live Travel Tails RLS was not re-queried on 2026-08-24 (MCP on a different org).

Full narrative, halt conditions, and file index: previously in SECURITY.md; use this file plus `issues.md` and `MONEY_CYCLE.md`.
