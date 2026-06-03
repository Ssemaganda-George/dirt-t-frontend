# DirtTrails: Architecture & Postgres Migration Audit Prompt

Copy everything below the line into a **new Cursor chat**. Attach this repo as context. Ensure these skills are available and will be invoked first:

- **using-superpowers** — load before any exploration; follow skill checklists with TodoWrite where applicable
- **improve-codebase-architecture** — deep modules, testability, ports & adapters; follow its phased process (explore → candidates → user picks → designs → RFC issues)
- **supabase-postgres-best-practices** — schema, indexes, RLS replacement strategy, connection pooling on Railway; cite rule categories (`query-`, `conn-`, `security-`, `schema-`, etc.)

Optional context files to @-mention: `src/lib/database.ts`, `src/lib/supabaseClient.ts`, `supabase/migrations/`, `supabase/functions/`, `package.json`, `PRODUCT.md`.

**Save output:** When the audit is complete, copy [`docs/architecture/AUDIT_TEMPLATE.md`](docs/architecture/AUDIT_TEMPLATE.md) to `docs/architecture/audit-YYYY-MM-DD.md` (today's date), fill every section, and save. Do not overwrite `AUDIT_TEMPLATE.md`. See [`docs/architecture/README.md`](docs/architecture/README.md).

---

## PROMPT (copy from here)

You are auditing **DirtTrails** (`dirt-t-frontend`) to prepare a migration from **Supabase (PostgREST + Auth + Storage + Edge Functions + RLS)** to **self-hosted Postgres on Railway**, with a **testable, deep-module architecture**.

### Mandatory first steps

1. Invoke **using-superpowers** and obey it (skill check before exploration; TodoWrite for any skill checklists).
2. Invoke **improve-codebase-architecture** and follow its process structure.
3. Invoke **supabase-postgres-best-practices** for all database/schema/RLS/query review.

Do not propose code changes in this pass unless I ask — this is an **evaluation and migration blueprint** pass.

### Background (current stack)

- Vite + React SPA; data access mostly via `@supabase/supabase-js` from the browser
- Monolithic data layer: `src/lib/database.ts` (~7,900 lines, ~100 exported functions)
- Schema/migrations: `supabase/migrations/*.sql`
- Serverless logic: `supabase/functions/*` (payments, emails, webhooks, queues)
- Direct `supabase` usage also in: `AuthContext`, booking pages, `imageUpload`, hooks, admin/vendor pages
- No traditional ORM; atomic flows use Postgres RPCs (e.g. `create_booking_atomic`)
- React Query used in some places; most pages import `database.ts` directly

### Target end state

- **Postgres on Railway** as the system of record
- **Testable boundaries**: deep modules with small public interfaces; integration tests at module boundaries; local Postgres substitute where possible (e.g. test container or PGLite)
- **No Supabase client in UI** for production DB access — browser should talk to **our API**, not PostgREST/anon key patterns
- Preserve product behavior (bookings, wallets, tiers, messaging, reviews, payments/MarzPay)

### Phase 1 — Inventory & coupling map (explore organically)

Produce a structured report:

#### A. Supabase surface area (migration blockers)

| Surface | Where used | Migration note |
|--------|------------|----------------|
| PostgREST (`from`, `select`, `insert`) | … | → API + SQL/ORM on server |
| `supabase.rpc(...)` | … | → stored procs or app transactions |
| RLS policies | migrations / implied | → app-layer authz or DB roles |
| `supabase.auth` | … | → Railway-compatible auth (specify options) |
| `supabase.storage` | … | → S3/R2/Railway volume/etc. |
| Edge Functions | `supabase/functions/` | → Railway services / workers / cron |
| Realtime (if any) | … | … |
| Service role in frontend | `serviceClient.ts` | **security risk** — flag |
| Env vars | `VITE_SUPABASE_*` | → server-only secrets |

#### B. Code architecture friction (improve-codebase-architecture lens)

- Shallow vs deep modules; where `database.ts` forces callers to know Postgres/Supabase details
- Duplicate types (`src/types/index.ts` vs `database.ts`)
- Files that bypass the data layer and call `supabase` directly
- Domain clusters: bookings, services, auth, messages, wallet/payments, reviews, visitor tracking, admin, vendor
- What is **in-process**, **local-substitutable**, **remote-owned (ports)**, **true external (mock)** per the skill’s dependency categories

#### C. Postgres health (supabase-postgres-best-practices lens)

Review migrations and hot paths in `database.ts`:

- Missing/partial indexes, N+1 patterns, `select *`, pagination
- Transaction boundaries vs RPCs — what must stay atomic
- RLS → how authorization would move (middleware, row checks, DB roles)
- Connection pooling for Railway (PgBouncer, pool size, serverless vs long-lived)
- Security rules that change when RLS is removed from PostgREST

### Phase 2 — Deepening candidates (do NOT design interfaces yet)

Present a **numbered list** of architectural deepening opportunities. Per **improve-codebase-architecture**, for each include:

- **Cluster** (files/modules)
- **Why coupled**
- **Dependency category** (1–4)
- **Test impact** (what boundary tests would replace shallow tests)

End with: **“Which candidates should we explore first?”** — but still give your **recommended priority order** for the Railway migration.

### Phase 3 — Target architecture (migration-ready)

Propose a **layered target layout** (adjust names to fit repo conventions):

```
src/
  domain/           # types + pure rules (no I/O)
  ports/            # interfaces: DatabasePort, AuthPort, StoragePort, PaymentPort, EmailPort
  adapters/
    postgres/       # query implementation (Drizzle | Kysely | pg — pick one with rationale)
    http/           # API client for browser
  api/              # NEW: Node/Hono/Fastify on Railway (or separate repo)
  lib/              # thin re-exports or retire database.ts gradually
```

Include:

1. **Browser boundary** — what the SPA may import; forbid direct DB drivers
2. **API boundary** — route groups mirroring domains; auth middleware; error shape
3. **Data boundary** — repository pattern vs query service; how to split `database.ts` (suggested file tree with ~10–15 modules)
4. **Auth strategy** — replace Supabase Auth (compare: Lucia, Auth.js, custom JWT, Clerk, etc.) with **one recommendation** for this codebase
5. **Edge Functions → Railway** — map each function in `supabase/functions/` to deployment type (HTTP worker, queue consumer, cron)
6. **Testing pyramid**
   - Unit: domain + pure helpers
   - Integration: adapters against Railway Postgres test instance / Docker / PGLite
   - API contract tests
   - E2E: keep minimal; what to defer

### Phase 4 — Migration roadmap (phased, low risk)

Ordered phases with **exit criteria** and **rollback**:

| Phase | Scope | Exit criteria |
|-------|--------|---------------|
| 0 | … | … |
| 1 | Introduce ports + API skeleton; no behavior change | … |
| 2 | Move read paths off PostgREST | … |
| 3 | Move writes + RPCs | … |
| 4 | Auth + storage | … |
| 5 | Edge functions | … |
| 6 | Decommission Supabase | … |

Call out **strangler fig** opportunities (e.g. one domain at a time: bookings first).

### Phase 5 — Immediate “week 1” actions

Top **10 concrete tasks** (small PRs), e.g.:

- Generate or consolidate DB types
- Extract `bookings` module from `database.ts`
- Add `DatabasePort` + in-memory fake for tests
- Remove `VITE_SUPABASE_SERVICE_ROLE_KEY` from frontend
- Docker Compose for local Postgres matching Railway

### Deliverables format

1. **Executive summary** (≤ 15 bullets)
2. **Risk register** (severity: auth, payments, data loss, downtime)
3. **Coupling map** (table + mermaid diagram)
4. **Deepening candidates** (numbered)
5. **Target architecture** (diagram + folder tree)
6. **Migration phases** (table)
7. **Week 1 task list**
8. **Open questions** for me to decide (ORM choice, monorepo vs split API repo, auth vendor)

### Constraints

- Minimize scope per PR; no big-bang rewrite
- Prefer **ports & adapters** over mocking Supabase everywhere
- Flag any pattern that **cannot** work on Railway-hosted Postgres without a backend
- Be opinionated; recommend one auth approach and one server-side query layer
- Cite file paths and line ranges when pointing at problems
- If Supabase MCP is available, use it only to **read** schema/policies — do not mutate production

**Output file (required):** Copy `docs/architecture/AUDIT_TEMPLATE.md` → `docs/architecture/audit-YYYY-MM-DD.md`, complete all sections with findings, and write the file before finishing.

Start Phase 1 now.

---

## After the audit chat

When you pick a deepening candidate from Phase 2, start a **follow-up chat** with:

> Continue the DirtTrails architecture audit. Candidate #N: [name]. Follow improve-codebase-architecture Steps 4–7: frame problem space, spawn 3+ interface designs, recommend one, create GitHub RFC issue. Save to `docs/architecture/rfc-candidate-N-short-name.md` using `docs/architecture/RFC_TEMPLATE.md`.

## Notes for you (human)

- Run this on a clean branch; commit `docs/architecture/audit-YYYY-MM-DD.md` when done (template: `docs/architecture/AUDIT_TEMPLATE.md`).
- Deep-dive one candidate → `docs/architecture/RFC_TEMPLATE.md` → `rfc-candidate-N-name.md`.
- Railway will need: Postgres plugin, optional Redis for sessions/queues, separate API service for secrets.
- Biggest lift is usually **Auth + Edge Functions + RLS**, not moving SQL tables.
