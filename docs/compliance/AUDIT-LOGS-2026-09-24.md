# Audit logs and access controls — engineering evidence

**Checklist criterion (Category 1):** Does the platform maintain system-level audit logs and access controls to prevent and trace electronic fraud under the Computer Misuse Act, 2011?

**Assessment date:** 24 September 2026  
**Engineering answer:** **Yes** (product controls). Legal/ops retention policy review remains with counsel.

## Controls shipped

1. **Login IP capture fixed** — `auth.sessions` stores `ip` (not `ip_address`). `log_login_history()` now copies `NEW.ip` into `login_history.ip_address`.
2. **Immutable change audit** — table `security_change_audit` with AFTER INSERT/UPDATE/DELETE triggers on `bookings`, `orders`, `payments`, `transactions`, `wallets`, `vendors`, `profiles`. Sensitive vendor payout fields and raw payment webhook payloads are stripped before storage.
3. **Access** — RLS: admins only can read `security_change_audit`. Admin UI: `/admin/security-change-audit`.
4. **Prior RLS work** — public tables RLS-enabled; sensitive catalog vs private row policies as previously evidenced.

## Limits

- Historical `login_history` rows remain without IP (pre-fix). New sessions capture IP going forward.
- No SIEM product is claimed; this is Postgres audit + RLS.
- Central retention/alerting SLAs for legal are in the legal handoff pack.
