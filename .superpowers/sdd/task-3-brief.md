### Task 3: Repository

**Files:**
- Create: `src/repositories/QuoteRepository.ts`
- Modify: `src/types/booking.ts` — add `pricing_source?: 'tier' | 'override' | 'quote'` on `Booking` (the field is not on the interface yet; add it with `'quote'` allowed)
- Modify: `src/repositories/index.ts` — `export * from './QuoteRepository'` (same barrel as every other repository)

**Do not commit.** Plan global constraint: do not commit unless the user explicitly asks.

**Interfaces:**
- Consumes: RPCs from Task 2; `supabase` from `src/lib/supabaseClient.ts`
- Reuse `ChargeType` and `QuoteLineItem` from `src/lib/quotePayLink.ts` — do not redefine them
- Produces:

```ts
export type QuoteRow = { /* map quotes columns + services.title, vendors.business_name */ }
export async function listQuotes(): Promise<QuoteRow[]>
export async function createQuotePayLink(input: CreateQuoteInput): Promise<{ token: string; invoice_no: string; booking_id: string }>
export async function getQuotePayPage(token: string): Promise<QuotePayPage | null>
export async function enableQuoteBalanceLink(quoteId: string): Promise<{ token: string; collect_amount_ugx: number }>
export async function cancelQuotePayLink(quoteId: string): Promise<void>
export function publicPayUrl(token: string): string
```

`publicPayUrl` — use this exact body:

```ts
export function publicPayUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bookings.dirt-trails.com'
  return `${origin}/pay/${token}`
}
```

`getQuotePayPage` calls `supabase.rpc('get_quote_pay_page', { p_token: token })` (works logged-out). Return `null` when the RPC returns `success: false` or `error: 'not_found'`. Throw on supabase transport errors.

`createQuotePayLink` calls `create_quote_pay_link` with `p_` args matching the SQL. Throw if `success !== true`.

`enableQuoteBalanceLink` / `cancelQuotePayLink` also throw if `success !== true` (cancel returns `{ success: true }` with no extra fields).

`listQuotes`:

```ts
const { data, error } = await supabase
  .from('quotes')
  .select('*, services(title), vendors(business_name)')
  .order('created_at', { ascending: false })
```

Admin RLS allows this. Throw on `error`. Nested PostgREST shapes: `services: { title: string } | null`, `vendors: { business_name: string } | null`.

### RPC arg names (exact)

`create_quote_pay_link`:
- `p_vendor_id` uuid
- `p_service_id` uuid
- `p_guest_name` text
- `p_guest_email` text
- `p_guest_phone` text
- `p_line_items` jsonb
- `p_agreed_total` numeric
- `p_display_currency` text (`USD` | `UGX` | `RWF`)
- `p_charge_type` text (`full` | `deposit` | `custom`)
- `p_collect_amount_ugx` integer
- `p_agreed_total_ugx` integer
- `p_invoice_no` text | null
- `p_notes` text | null
- `p_service_date` date | null
- `p_end_date` date | null
- `p_valid_until` timestamptz | null

Success JSON: `{ success, quote_id, booking_id, invoice_no, token }`

`get_quote_pay_page(p_token)` success JSON:
`invoice_no, guest_name, line_items, agreed_total, display_currency, collect_amount_ugx, agreed_total_ugx, amount_paid_ugx, status, valid_until, balance_enabled, booking_id, service_title, notes, service_date`

`enable_quote_balance_link(p_quote_id)` success: `{ success, collect_amount_ugx, token }`

`cancel_quote_pay_link(p_quote_id)` success: `{ success: true }`

### quotes columns (for QuoteRow)

id, invoice_no, token, vendor_id, service_id, booking_id, guest_name, guest_email, guest_phone, line_items, agreed_total, display_currency, charge_type, collect_amount_ugx, agreed_total_ugx, amount_paid_ugx, balance_enabled, valid_until, notes, service_date, end_date, status, created_by, created_at, updated_at

plus nested `services` and `vendors` from the select.

### CreateQuoteInput

Map 1:1 to the RPC params (camelCase in TS is fine; convert to `p_*` at the rpc call). `line_items` is `QuoteLineItem[]`. Empty invoice no → pass `null` not `''`.

### Tests

No existing supabase mock pattern. Add `src/tests/quoteRepository.test.ts` covering only `publicPayUrl` (SSR fallback origin + `/pay/{token}`). Do not mock supabase for the RPC wrappers.

Follow existing repository style: `import { supabase } from '../lib/supabaseClient'`, throw on error, no new npm packages.
