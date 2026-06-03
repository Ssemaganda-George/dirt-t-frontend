# Architecture audits (Supabase → Railway Postgres)

This folder holds **migration and architecture audit** outputs. Use them as the single source of truth when planning refactors and PRs.

## Running an audit

1. Open [`RAILWAY_MIGRATION_ARCHITECTURE_AUDIT_PROMPT.md`](../../RAILWAY_MIGRATION_ARCHITECTURE_AUDIT_PROMPT.md) in the repo root.
2. Start a **new Cursor chat**, invoke the three skills listed there, and paste the prompt.
3. Ask the agent to **write the completed audit** to a dated file (see below).

## Output naming

| File | Purpose |
|------|---------|
| [`AUDIT_TEMPLATE.md`](./AUDIT_TEMPLATE.md) | Empty structure — do not edit for real findings |
| `audit-YYYY-MM-DD.md` | One full audit per run (e.g. `audit-2026-06-03.md`) |
| `rfc-candidate-N-short-name.md` | Optional deep-dive after you pick a Phase 2 candidate |

Copy `AUDIT_TEMPLATE.md` → `audit-YYYY-MM-DD.md`, then fill every section. Commit the dated file when the audit is done.

## Agent instruction (add to your chat)

```
When the audit is complete, copy docs/architecture/AUDIT_TEMPLATE.md to
docs/architecture/audit-YYYY-MM-DD.md (today's date), fill all sections with
your findings, and save the file. Do not overwrite AUDIT_TEMPLATE.md.
```

## Staying on Supabase (current phase)

Follow [`ARCHITECTURE.md`](./ARCHITECTURE.md) for layer rules while still on Supabase. Railway migration is deferred until architecture checks pass (`npm run build`, `npm run test`).

## Related docs

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — layer rules and import conventions
- [`audit-2026-06-03.md`](./audit-2026-06-03.md) — migration audit (future)
- [`../MIGRATIONS.md`](../MIGRATIONS.md) — how DB migrations are applied today
- [`../../RAILWAY_MIGRATION_ARCHITECTURE_AUDIT_PROMPT.md`](../../RAILWAY_MIGRATION_ARCHITECTURE_AUDIT_PROMPT.md) — full audit prompt
