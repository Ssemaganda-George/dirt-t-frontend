### Spec Compliance

- ✅ Spec compliant
- ⚠️ Cannot verify from diff: live `quotes` table / RPCs (Task 2 migration is outside this diff; page will error on `listQuotes` until SQL is applied).
- ⚠️ Cannot verify from diff: browser click-through (implementer did not run Vite; this review is static).

### Strengths

- Routing matches the brief: lazy default-export `Quotes` at `path="quotes"` next to bookings, inside admin `ProtectedRoute` + `Layout` (`App.tsx:53`, `App.tsx:298–320`).
- Nav item is `{ labelKey: 'quotes', href: '/admin/quotes', icon: Link2 }` after bookings; `Link2` comes from lucide-react and does not clash with react-router `Link` (`Layout.tsx:25`, `Layout.tsx:64–65`).
- i18n `quotes` sits next to `bookings` in all three maps: en `Quotes`, pt `Orçamentos`, fr `Devis` (`translations.ts:13`, `translations.ts:98`, `translations.ts:183`).
- Quote API usage matches the Task 3 contract: camelCase `createQuotePayLink`, `listQuotes`, `enableQuoteBalanceLink`, `cancelQuotePayLink`, `publicPayUrl` (`Quotes.tsx:5–13`, `Quotes.tsx:160–166`, `Quotes.tsx:178–198`).
- Line math is reused from `quotePayLink.ts` (`withLineAmounts`, `sumLineItems`, `chargeDisplayAmount`); catalog `price` is hint text only (`Quotes.tsx:3`, `Quotes.tsx:67–84`, `Quotes.tsx:294–296`).
- Restaurant listings are dropped with `category_id !== 'cat_restaurants'` (`Quotes.tsx:128`). No MarzPay / Pesapal / Flutterwave imports; no `payment_status` writes; no `services.price` updates.
- Form covers the brief: guest name/email/phone required (HTML + trim guard), vendor then listing, listing vs custom lines, charge type full/deposit/custom, display currency USD|UGX|RWF, integer UGX fields via `parsePositiveInt`, invoice placeholder `DT-INV-2026-003` with empty → `null`, dates + notes (`Quotes.tsx:31–33`, `Quotes.tsx:141–166`, `Quotes.tsx:279–353`).
- Collect UGX prefills only when charge is full and display is UGX (`Quotes.tsx:134–139`).
- Submit shows a copyable `publicPayUrl(token)` banner (`/pay/{token}`); list columns and action gates match (Enable balance only `deposit_paid`, Cancel only `sent` && `amount_paid_ugx === 0`) (`Quotes.tsx:220–261`).
- Page is 360 lines, Tailwind/white cards/`#61B82C` matching Tickets; no new packages; no commit.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

1. **Stale listings after vendor change**
   - File: `src/pages/admin/Quotes.tsx:123–132`
   - Issue: `setListings([])` runs only when `vendorId` is empty. Changing vendor A → B clears `serviceId` in the select `onChange`, but A’s listings stay on screen until B’s `getServices` resolves. If that fetch fails, A’s listings remain selectable under B.
   - Why it matters: Admin can attach a pay link to the wrong vendor/listing pair. SQL will reject with `vendor_service_mismatch`, which is a confusing ops error on a conversion-critical WhatsApp flow.
   - Fix: At the start of the vendor effect (when `vendorId` is set), `setListings([]); setServiceId('')` before fetching. On fetch success, `setError(null)`.

#### Minor (Nice to Have)

- Listing fetch success does not clear a prior `Failed to load listings` banner (`Quotes.tsx:126–130`).
- Custom-line filter allows `unit_price === 0` (`Quotes.tsx:73–77`); harmless if the summed total is still positive, but zero-price rows should be dropped.
- If `createQuotePayLink` succeeds and `refresh()` throws, the catch message is `Failed to create quote pay link` even though the link already exists (`Quotes.tsx:167–172`). Split create vs refresh errors.
- Copy link is shown for cancelled/paid/expired rows. Brief does not forbid this; hiding it for `cancelled`/`expired`/`paid` would avoid WhatsApp-ing a dead token.
- Guest/vendor/listing inputs are placeholder-only (dates have labels). Fine for this admin page; labels would help.

### Assessment

**Task quality:** Needs fixes

**Reasoning:** The page implements every Task 4 requirement with the right contracts, integrity constraints, and admin chrome. The vendor→listing stale-state bug is the one issue worth fixing before this screen is used to mint real MarzPay links; everything else is polish.
