# Architecture re-evaluation (post-consolidation)

| Field | Value |
|-------|--------|
| **Date** | 2026-06-03 |
| **Commit** | `0e0bb277` |
| **Prior audit** | `audit-2026-06-03.md` |
| **Skills** | using-superpowers, improve-codebase-architecture (lens) |

## Scorecard (Supabase phase — not migration-ready yet)

| Area | Before | Now | Notes |
|------|--------|-----|-------|
| Data layer shape | `database.ts` barrel → 16 repos | Unchanged | Still correct split |
| Service layer | `BookingService` duplicated Supabase | **Fixed** — re-exports `BookingRepository` | |
| Wallet credits | `lib/creditWallet` | **In `WalletRepository`** | Barrel kept |
| Payment watch DRY | 6+ copy-paste blocks | **`watchMarzpayPayment`** in 6 booking UIs | Checkout still separate |
| Pure domain | types/ only | **`domain/tierRules.ts`** | Small but right pattern |
| Layer docs | audit only | **`ARCHITECTURE.md`** | Enforce in PRs |
| Direct `supabase` in UI | ~90 files | **~88 files** | Still main gap vs ARCHITECTURE.md |
| `lib/database` imports | ~85 files | **~82 files** | Acceptable legacy barrel |
| Tests | none | Vitest + 1 test file | Not required yet per team |
| i18n | broken (missing file) | **Builds** — ~35 keys | Full catalog may be lost |
| API secrets | `VITE_` service role fallback | **Removed** | |
| Build | — | **`npm run build` passes** | |

**Verdict:** Architecture is **materially better** for staying on Supabase. **Not ready** for Railway cutover (no API, no ports, auth/payments still in browser).

## What improved since first audit

1. Single booking-cancel path: `BookingService` → `BookingRepository`.
2. Shared MarzPay listener: `hooks/watchMarzpayPayment.ts`.
3. Documented layers in `docs/architecture/ARCHITECTURE.md`.
4. Removed ~176k lines of backup noise (`database.ts.backup`, etc.).
5. `creditWallet` colocated with wallet data access.

## Remaining friction (architecture)

### Rule violations (`ARCHITECTURE.md`)

| Rule | Violators (examples) |
|------|---------------------|
| Pages avoid `supabase` | `AuthContext`, all `*Booking.tsx` (collect fetch), `Checkout`, `Payment`, `Wallet`, conservation admin, `vendorStore` |
| Hooks avoid `supabase.from/rpc` | `useOrderQuery`, `useOrderPaymentFlow`, `hook.ts`, `useUnreadMessages` |
| Services no Supabase | `VendorService.ts` still uses `supabase.rpc` |

### Shallow vs deep (Ousterhout)

| Module | Lines | Issue |
|--------|-------|-------|
| `BookingService` | ~6 | **Good** — thin facade |
| `VisitorRepository` | 950 | Deep I/O blob |
| `WalletRepository` | 928 | Payments + finance + RPC fallbacks |
| `InquiryRepository` | 777 | Likely mixed email + DB |

### Payment duplication

- **Unified:** category booking pages + `BookingDrawer` → `watchMarzpayPayment`.
- **Still separate:** `useOrderPaymentFlow` (orders/checkout), `Payment.tsx`, `Wallet.tsx` Realtime channels.

### i18n regression risk

`src/i18n/translations.ts` has ~35 keys. `PreferencesContext` falls back to raw key when missing. Confirm UI copy on Home, Layout, Profile in browser.

## Deepening candidates (priority for next architecture sprint)

### 1. Checkout & order payments
- **Cluster:** `useOrderPaymentFlow`, `Checkout`, `Payment`, `OrderRepository`
- **Why:** Second payment implementation parallel to `watchMarzpayPayment`
- **Category:** 3 remote-owned
- **Action:** Extend `watchMarzpayPayment` or thin wrapper; route `Payment.tsx` through it

### 2. Auth boundary
- **Cluster:** `AuthContext`, `AuthRepository`, auth pages
- **Why:** ~9 `supabase.auth` touchpoints in context alone; signup RPCs
- **Category:** 4 external (auth) + 3 DB
- **Action:** `AuthService` facade; pages only call service

### 3. Repository slimming — Wallet
- **Cluster:** `WalletRepository`, `creditWallet`, `vendorStore` withdrawal RPCs
- **Category:** 3
- **Action:** Split `wallet/` + `payments/` modules under repositories

### 4. Import hygiene
- **Cluster:** 82× `lib/database` imports
- **Action:** Codemod to `repositories` (optional; barrel still valid)

### 5. i18n catalog
- **Cluster:** `translations.ts`, deleted `locales/*.json`
- **Action:** Restore keys from git history or extract from `t('...')` usages

## Recommended order (still on Supabase)

1. Unify checkout payment with `watchMarzpayPayment` (#1)
2. `AuthService` + stop new direct `supabase` in pages (#2)
3. Split `WalletRepository` (#3)
4. i18n restore (#5)
5. Defer migration / ports until #1–2 stable

## Open question

Which candidate first — **#1 checkout payments** or **#2 auth**?
