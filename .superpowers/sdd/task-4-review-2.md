# Task 4 Re-Review (post Important fix)

**Scope:** Admin Quotes UI — `Quotes.tsx`, routing, nav, i18n  
**Diff reviewed:** `.superpowers/sdd/review-task-4-fix.diff`  
**Prior gate:** Stale listings after vendor change (Important)

---

## Spec-compliance verdict

**Compliant.** All Task 4 brief requirements are implemented: lazy admin route, Bookings nav item with `Link2`, en/pt/fr `quotes` keys, list + create modal, QuoteRepository-only API, line math from `quotePayLink.ts`, restaurant exclusion, UGX integer fields with full+UGX-only collect prefill, conditional Enable balance / Cancel actions, and copyable URLs via `publicPayUrl`. No MarzPay imports. Page is 365 lines.

## Task quality

**Approved**

---

## Important fix — confirmed

The vendor `useEffect` in `Quotes.tsx` now matches the required behavior:

```tsx
if (!vendorId) { setListings([]); setServiceId(''); return }
setListings([])
setServiceId('')
// … getServices(vendorId) …
.then((rows) => {
  if (!cancelled) {
    setError(null)
    setListings((rows as Listing[]).filter((s) => s.category_id !== 'cat_restaurants'))
  }
})
```

- When `vendorId` is set, `setListings([])` and `setServiceId('')` run **before** `getServices`, preventing vendor A→B from leaving A's listings selectable during load or after a failed fetch.
- On fetch success, `setError(null)` clears a prior listings-load error before updating state.
- Empty `vendorId` still clears listings and selection.

The vendor `<select>` also resets `serviceId` on change; the effect is the authoritative clear. No further action on this finding.

---

## Spec checklist

| Requirement | Status |
|-------------|--------|
| `Quotes.tsx` default export, list + modal | ✅ |
| Lazy route `/admin/quotes` in admin `ProtectedRoute` | ✅ |
| Nav `{ labelKey: 'quotes', href: '/admin/quotes', icon: Link2 }` after bookings | ✅ |
| i18n `quotes` en / pt / fr next to `bookings` | ✅ |
| Guest name, email, phone required; trim-empty blocks submit | ✅ |
| `getAllVendors()` + `getServices(vendorId)`, filter `cat_restaurants` | ✅ |
| Listing vs custom lines; `withLineAmounts` / `sumLineItems` | ✅ |
| Charge type full / deposit / custom; `chargeDisplayAmount` preview | ✅ |
| Display currency USD \| UGX \| RWF | ✅ |
| Admin-typed integer `agreed_total_ugx`, `collect_amount_ugx` | ✅ |
| Collect prefill only when charge `full` and currency `UGX` | ✅ |
| Optional invoice → `null`; placeholder `DT-INV-2026-003` | ✅ |
| Dates + notes → `null` when empty | ✅ |
| Submit → `createQuotePayLink` (camelCase) → `publicPayUrl(token)` | ✅ |
| List columns: invoice, guest, vendor, listing, agreed vs paid UGX, status, actions | ✅ |
| Copy link via `publicPayUrl(row.token)` | ✅ |
| Enable balance only `deposit_paid` | ✅ |
| Cancel only `sent` and `amount_paid_ugx === 0` | ✅ |
| Enable balance → `enableQuoteBalanceLink` + copy URL | ✅ |
| Cancel → `cancelQuotePayLink` + refresh | ✅ |
| Catalog `price` hint only; never sent as collect | ✅ |
| No MarzPay; no new Vitest | ✅ |
| Admin visual language (`#61B82C`, white cards) | ✅ |

---

## Non-blocking notes (not required for approval)

- **Runtime dependency:** Page needs Task 2 migration/RPCs applied; expected operational note, not a Task 4 code defect.
- **No browser pass:** Reported; typecheck passed. Acceptable for this gate.
- **Collect prefill:** Overwrites collect when full+UGX and agreed inputs change; matches brief (no silent FX elsewhere).

---

## Gate decision

**Approved** — Important fix verified; Task 4 meets the brief. Proceed.
