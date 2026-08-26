### Task 4: Admin Quotes UI

**Files:**
- Create: `src/pages/admin/Quotes.tsx`
- Modify: `src/App.tsx` — lazy `Quotes` at `/admin/quotes` inside admin `ProtectedRoute`
- Modify: `src/components/Layout.tsx` — Bookings nav item `{ labelKey: 'quotes', href: '/admin/quotes', icon: Link2 }` (`Link` from react-router-dom is already imported — import `Link2` from lucide-react as the icon)
- Modify: `src/i18n/translations.ts` — add `quotes: 'Quotes'` (and pt/fr equivalents)

**Do not commit.** Plan global constraint: do not commit unless the user explicitly asks.

**Do not call MarzPay from this page.**

### Task 3 contract (use these names)

Import from `../../repositories/QuoteRepository` (or `../../repositories`):

```ts
createQuotePayLink(input: CreateQuoteInput) // camelCase fields below
listQuotes(): Promise<QuoteRow[]>
enableQuoteBalanceLink(quoteId: string): Promise<{ token: string; collect_amount_ugx: number }>
cancelQuotePayLink(quoteId: string): Promise<void>
publicPayUrl(token: string): string
```

`CreateQuoteInput`:
- vendorId, serviceId, guestName, guestEmail, guestPhone
- lineItems: QuoteLineItem[]
- agreedTotal: number (display-currency total from lines)
- displayCurrency: 'USD' | 'UGX' | 'RWF'
- chargeType: 'full' | 'deposit' | 'custom'
- collectAmountUgx: number (integer)
- agreedTotalUgx: number (integer)
- invoiceNo?, notes?, serviceDate?, endDate?, validUntil?

`QuoteRow` nested: `services: { title } | null`, `vendors: { business_name } | null`

Reuse `withLineAmounts`, `sumLineItems`, `chargeDisplayAmount` from `src/lib/quotePayLink.ts` for line math. Catalog `services.price` is a hint only — never sent as the collect amount.

### Routing

`App.tsx` already wraps `/admin/*` in admin `ProtectedRoute` + `Layout`. Add:
```
const Quotes = lazy(() => import('./pages/admin/Quotes'))
...
<Route path="quotes" element={<Quotes />} />
```
Place it next to the bookings routes (~line 318). Default export the page.

### Nav

In `src/components/Layout.tsx` Bookings category, add after the `bookings` item:
`{ labelKey: 'quotes', href: '/admin/quotes', icon: Link2 }`

Import `Link2` from `lucide-react`. Do not clash with react-router `Link`.

### i18n

Add `quotes` to all three maps in `src/i18n/translations.ts`:
- en: `'Quotes'`
- pt: `'Orçamentos'`
- fr: `'Devis'`
Place next to `bookings` in each map.

### Admin form (single page: list + drawer/modal)

Fields:
- Guest name, email, phone (required)
- Vendor select then listing select (`services` for that vendor, `category_id !== 'cat_restaurants'`). Use `getAllVendors()` from `src/repositories/VendorRepository.ts` and `getServices(vendorId)` from `src/repositories/ServiceRepository.ts`, then filter out `cat_restaurants`.
- Mode: listing (one auto line from title + qty 1 + agreed total as unit_price) or custom lines (description, qty, unit_price; use `withLineAmounts`)
- Charge type full / deposit / custom (`chargeDisplayAmount` for display-currency charge preview)
- Display currency USD | UGX | RWF
- `agreed_total_ugx` and `collect_amount_ugx` (number inputs, integers). Admin types these. Prefill collect UGX only if charge type is full and display currency is UGX; otherwise leave collect for admin to type. Never silently convert FX.
- Optional invoice no (placeholder `DT-INV-2026-003`); empty → pass null so SQL auto `DT-Q-…`
- Dates (service_date, end_date, valid_until) + notes
- Submit → `createQuotePayLink` → show copyable URL from `publicPayUrl(token)` (full origin + `/pay/{token}`)

Guest contact empty → do not submit (SQL also rejects).

### List

Columns: invoice no, guest, vendor, listing, agreed vs paid UGX, status, Copy link (`publicPayUrl(row.token)`), Enable balance (only `deposit_paid`), Cancel (only `sent` and unpaid `amount_paid_ugx === 0`).

Enable balance → `enableQuoteBalanceLink` then show the same copyable URL (token reused).
Cancel → `cancelQuotePayLink` then refresh list.

Match existing admin visual language (Tailwind, white cards, `dirt-green` if used nearby). Keep the page under ~400 lines if possible; no extra libraries.

### Tests

No new Vitest required unless you extract a tiny pure helper. Do not mock supabase.

### After implementation

If a local Vite server is already running, do not start another. Self-review: restaurants excluded from listing dropdown; copy URL uses `/pay/{token}`; no MarzPay imports.
