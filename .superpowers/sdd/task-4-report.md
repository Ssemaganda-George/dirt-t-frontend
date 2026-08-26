# Task 4 Report: Admin Quotes UI

**Status:** DONE_WITH_CONCERNS  
**Commits:** none (per controller: do not git commit)

## What was implemented

Admin Quotes page: list + create-link modal. QuoteRepository is the only quote API. No MarzPay, no public `/pay` page, no catalog price writes.

**`src/pages/admin/Quotes.tsx`** (default export, 360 lines)
- Guest name / email / phone required (trim-empty blocks submit)
- Vendor via `getAllVendors()`, then listings via `getServices(vendorId)` filtered `category_id !== 'cat_restaurants'`
- Mode: listing (title × qty 1 × agreed total as `unit_price`) or custom lines (`withLineAmounts`)
- Charge type full / deposit / custom with `chargeDisplayAmount` preview
- Display currency USD | UGX | RWF
- Admin-typed integer `agreed_total_ugx` and `collect_amount_ugx`; collect prefills only when charge is full **and** display currency is UGX
- Optional invoice placeholder `DT-INV-2026-003`; empty → `null` (SQL `DT-Q-…`)
- Dates + notes; empty → `null`
- Submit → `createQuotePayLink` (camelCase `CreateQuoteInput`) → copyable `publicPayUrl(token)` (`/pay/{token}`)
- List: invoice, guest, vendor, listing, agreed vs paid UGX, status, Copy link, Enable balance (`deposit_paid` only), Cancel (`sent` and `amount_paid_ugx === 0`)
- Enable balance → `enableQuoteBalanceLink` then same copyable URL; Cancel → `cancelQuotePayLink` then refresh
- Visual language: white cards, `#61B82C` (same as Tickets)

**`src/App.tsx`**
- `const Quotes = lazy(() => import('./pages/admin/Quotes'))`
- `<Route path="quotes" element={<Quotes />} />` next to bookings, inside admin `ProtectedRoute`

**`src/components/Layout.tsx`**
- Bookings nav after bookings: `{ labelKey: 'quotes', href: '/admin/quotes', icon: Link2 }`
- `Link2` from lucide-react; react-router `Link` unchanged

**`src/i18n/translations.ts`** (next to `bookings` in all three maps)
- en: `'Quotes'` · pt: `'Orçamentos'` · fr: `'Devis'`

## Tests / typecheck

No new Vitest (no extracted helper).

**Command:** `npx tsc --noEmit --pretty false`  
**Exit code:** 0

IDE lints on touched files: none.

Browser: no Vite server was running; did not start one. UI not clicked through.

## Self-review

1. Restaurants excluded from listing dropdown (`cat_restaurants`); SQL halt remains backup.
2. Copy URL always via `publicPayUrl` → `{origin}/pay/{token}`.
3. No MarzPay / Pesapal / Flutterwave imports. Catalog `price` is hint text only.
4. Quote mutations only through QuoteRepository. Line math from `quotePayLink.ts`.
5. Empty guest contact does not submit. Empty invoice is `null`.
6. Enable balance only `deposit_paid`. Cancel only `sent` + unpaid.

## Files changed

| File | Action |
|------|--------|
| `src/pages/admin/Quotes.tsx` | Created |
| `src/App.tsx` | Lazy route `/admin/quotes` |
| `src/components/Layout.tsx` | Nav item + `Link2` |
| `src/i18n/translations.ts` | `quotes` en/pt/fr |

No npm packages. No git commit.

## Concerns

- **Live `quotes` table / RPCs** may not be applied yet (Task 2 wrote the migration file). This page will error on `listQuotes` until that SQL is applied.
- **No browser pass** — no local Vite process; form/list not exercised in the UI.
- **Collect prefill** overwrites the collect field whenever charge is full, display is UGX, and `agreed_total_ugx` / display agreed total change. Switching away from full+UGX leaves the previous collect value for admin to edit (not auto-halved — no silent FX).

## Fix

**Review finding:** Stale listings after vendor change (Important).

**Change (`src/pages/admin/Quotes.tsx`, vendor `useEffect`):** When `vendorId` is set, call `setListings([])` and `setServiceId('')` immediately before `getServices(vendorId)` so vendor A→B does not leave A's listings selectable while B loads (or if B's fetch fails). On fetch success, call `setError(null)` before updating listings.

**Typecheck**

**Command:** `npx tsc --noEmit --pretty false`  
**Exit code:** 0  
**Output:** (no errors)
