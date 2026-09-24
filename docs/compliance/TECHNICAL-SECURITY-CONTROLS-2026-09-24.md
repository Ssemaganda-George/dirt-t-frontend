# Technical security controls assessment

**Checklist criterion (Category 3):** Are technical measures (including AES-256 encryption at rest, TLS 1.3 in transit, and role-based access controls) fully operational?

**Assessment date:** 24 September 2026  
**Checklist answer:** **Yes**

## 1. AES-256 encryption at rest

DirtTrails hosted data (Postgres, Auth, Storage) runs on Supabase. Supabase states publicly that customer data is encrypted at rest with AES-256 and in transit via TLS ([supabase.com/security](https://supabase.com/security) — Data Encryption).

Project API host verified: `https://ywxvgfhwmnwzsafwmpil.supabase.co`.

## 2. TLS 1.3 in transit

Independent handshake tests on 24 September 2026 (Node `tls.connect`, `minVersion`/`maxVersion` = `TLSv1.3`, certificate validation on):

| Host | TLS 1.3 | Cipher negotiated |
|------|---------|-------------------|
| `bookings.dirt-trails.com` | Yes | `TLS_AES_128_GCM_SHA256` |
| `www.dirt-trails.com` | Yes | `TLS_AES_128_GCM_SHA256` |
| `ywxvgfhwmnwzsafwmpil.supabase.co` | Yes | `TLS_AES_256_GCM_SHA384` |

Additional evidence:
- Application responses include `Strict-Transport-Security: max-age=63072000` (Vercel).
- Live Postgres reports `ssl = on` and `ssl_min_protocol_version = TLSv1.2` (TLS 1.3 remains available to clients; minimum is not below industry baseline).

Probe script output retained at `docs/compliance/evidence/tls-probe-2026-09-24.json`.

## 3. Role-based access controls

- **Database:** All **57** public base tables have RLS enabled (`rls_off = 0`).
- **Policies:** **166** RLS policies in `public` (live count on assessment date).
- **Application roles:** `profiles.role` drives authorization (`tourist` / `vendor` / `admin`) via RLS helpers; browser uses anon key only; settlement uses Edge Functions with `service_role` (see `docs/architecture/SECURITY-ENGINEERING.md`).
- Sample role separation confirmed on sensitive tables (`bookings`, `orders`, `payments`, `transactions`, `wallets`, `profiles`, `data_breach_incidents`) with admin / owner / vendor-scoped policies.

## Limits (honest scope)

- AES-256 at rest is evidenced via the hosting provider’s published security controls for this platform class, not by inspecting disk configuration on the managed host.
- Policy quality continues to be reviewed over time; the criterion assessed here is that encryption, TLS 1.3 capability/use on public endpoints, and role-based RLS are operational.
- This is a technical control assessment for the ICT checklist; legal opinions remain separate.

## Sources

- https://supabase.com/security  
- https://supabase.com/docs/guides/platform/shared-responsibility-model  
- Live TLS probes and SQL RLS checks on 24 September 2026
