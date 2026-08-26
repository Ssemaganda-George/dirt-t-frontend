# Quote Payment Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins send a WhatsApp pay link for a bargained figure; the client pays that UGX via MarzPay (no booking fee); emails fire; a guest booking and vendor wallet credit appear; catalog prices stay unchanged.

**Architecture:** Pure quote math in `src/lib/quotePayLink.ts`. New `quotes` table plus admin RPCs create a **pending guest booking** at save time. Public `/pay/:token` reads via `get_quote_pay_page(token)`. `marzpay-collect` ignores the browser amount when `pricing_source = quote`. The fulfillment worker credits **this payment’s UGX only**, then bumps quote/booking totals. Same URL is reused for the balance after admin enables it.

**Tech Stack:** Vite · React 18 · TypeScript · Supabase (Postgres RLS + RPCs) · MarzPay Edge Functions · Vitest. No new npm packages.

**Spec:** `docs/superpowers/specs/2026-08-26-quote-payment-links-design.md`

## Global Constraints

- Do not add libraries not already in `package.json`
- Restaurants (`cat_restaurants`) must never get a pay link, payment row, or wallet mutation
- Browser cannot set `payment_status = paid`; webhook/worker only
- MarzPay collect amount for quotes comes from the database, never the request body
- Never credit a vendor wallet more than completed MarzPay payments on that quote
- Catalog `services.price` is never updated
- Guest booking requires name + email + phone (`tourist_id` null)
- Do not commit unless the user explicitly asks
- Live SQL goes on Travel Tails (`ywxvgfhwmnwzsafwmpil`) only after the migration file is in repo

---

### Task 1: Quote math (tested)

**Files:**
- Create: `src/lib/quotePayLink.ts`
- Test: `src/tests/quotePayLink.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `QuoteLineItem`, `ChargeType`, `lineAmount`, `withLineAmounts`, `sumLineItems`, `chargeDisplayAmount`, `remainingUgx`, `nextInvoiceNo`, `isQuoteCollectOpen`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import {
  chargeDisplayAmount,
  isQuoteCollectOpen,
  lineAmount,
  nextInvoiceNo,
  remainingUgx,
  sumLineItems,
  withLineAmounts,
} from '../lib/quotePayLink'

describe('quotePayLink', () => {
  it('builds invoice lines like DT-INV-2026-003', () => {
    const items = withLineAmounts([
      { description: 'Sheron Hotel — Single occupancy (B&B)', qty: 6, unit_price: 27 },
      { description: 'Service Fee — Pick-up & drop-off', qty: 1, unit_price: 80 },
    ])
    expect(items[0].amount).toBe(162)
    expect(sumLineItems(items)).toBe(242)
  })

  it('charges full, 50% deposit, or custom not above agreed', () => {
    expect(chargeDisplayAmount(242, 'full')).toBe(242)
    expect(chargeDisplayAmount(242, 'deposit')).toBe(121)
    expect(chargeDisplayAmount(242, 'custom', 80)).toBe(80)
    expect(() => chargeDisplayAmount(242, 'custom', 300)).toThrow()
    expect(() => chargeDisplayAmount(242, 'custom', 0)).toThrow()
  })

  it('tracks remaining UGX after a deposit', () => {
    expect(remainingUgx(890000, 445000)).toBe(445000)
    expect(remainingUgx(890000, 890000)).toBe(0)
  })

  it('auto invoice numbers increment', () => {
    expect(nextInvoiceNo(2026, 3)).toBe('DT-Q-2026-004')
  })

  it('blocks collect when expired, paid, cancelled, or balance not enabled', () => {
    const base = {
      status: 'sent' as const,
      valid_until: '2099-01-01T00:00:00Z',
      amount_paid_ugx: 0,
      agreed_total_ugx: 890000,
      balance_enabled: false,
    }
    expect(isQuoteCollectOpen(base)).toBe(true)
    expect(isQuoteCollectOpen({ ...base, status: 'expired' })).toBe(false)
    expect(isQuoteCollectOpen({ ...base, status: 'paid' })).toBe(false)
    expect(isQuoteCollectOpen({
      ...base,
      status: 'deposit_paid',
      amount_paid_ugx: 445000,
      balance_enabled: false,
    })).toBe(false)
    expect(isQuoteCollectOpen({
      ...base,
      status: 'deposit_paid',
      amount_paid_ugx: 445000,
      balance_enabled: true,
    })).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/quotePayLink.test.ts`
Expected: FAIL — cannot find module `../lib/quotePayLink`

- [ ] **Step 3: Write minimal implementation**

```ts
export type ChargeType = 'full' | 'deposit' | 'custom'

export type QuoteLineItem = {
  description: string
  qty: number
  unit_price: number
  amount: number
}

export type QuoteCollectGate = {
  status: 'draft' | 'sent' | 'deposit_paid' | 'paid' | 'expired' | 'cancelled'
  valid_until: string | null
  amount_paid_ugx: number
  agreed_total_ugx: number
  balance_enabled: boolean
}

function money(n: number): number {
  return Math.round(n * 100) / 100
}

export function lineAmount(qty: number, unitPrice: number): number {
  return money(qty * unitPrice)
}

export function withLineAmounts(
  rows: Array<{ description: string; qty: number; unit_price: number }>,
): QuoteLineItem[] {
  return rows.map((row) => ({
    ...row,
    amount: lineAmount(row.qty, row.unit_price),
  }))
}

export function sumLineItems(items: Pick<QuoteLineItem, 'amount'>[]): number {
  return money(items.reduce((sum, item) => sum + Number(item.amount || 0), 0))
}

export function chargeDisplayAmount(
  agreedTotal: number,
  type: ChargeType,
  custom?: number,
): number {
  if (type === 'full') return money(agreedTotal)
  if (type === 'deposit') return money(agreedTotal * 0.5)
  if (custom == null || custom <= 0 || custom > agreedTotal) {
    throw new Error('Custom charge must be greater than 0 and not more than the agreed total')
  }
  return money(custom)
}

export function remainingUgx(agreedTotalUgx: number, amountPaidUgx: number): number {
  return Math.max(0, Math.round(agreedTotalUgx) - Math.round(amountPaidUgx))
}

export function nextInvoiceNo(year: number, lastSeq: number): string {
  return `DT-Q-${year}-${String(lastSeq + 1).padStart(3, '0')}`
}

export function isQuoteCollectOpen(q: QuoteCollectGate): boolean {
  if (q.status === 'expired' || q.status === 'cancelled' || q.status === 'draft' || q.status === 'paid') {
    return false
  }
  if (q.valid_until && new Date(q.valid_until).getTime() < Date.now()) return false
  if (remainingUgx(q.agreed_total_ugx, q.amount_paid_ugx) <= 0) return false
  if (q.status === 'deposit_paid' && !q.balance_enabled) return false
  return q.status === 'sent' || q.status === 'deposit_paid'
}

export function thisCollectUgx(q: QuoteCollectGate & { collect_amount_ugx: number }): number {
  return Math.min(Math.round(q.collect_amount_ugx), remainingUgx(q.agreed_total_ugx, q.amount_paid_ugx))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/quotePayLink.test.ts`
Expected: PASS

---

### Task 2: `quotes` table, RPCs, RLS

**Files:**
- Create: `supabase/migrations/20260826120000_quote_payment_links.sql`

**Interfaces:**
- Consumes: `public.is_admin_user()`, existing `create_booking_atomic(...)`
- Produces: table `public.quotes`; RPCs `create_quote_pay_link`, `get_quote_pay_page`, `enable_quote_balance_link`, `cancel_quote_pay_link`

- [ ] **Step 1: Write the migration** (full file below — apply to live only in Task 2 Step 3 after reading it)

Key SQL (put the entire script in the migration file):

```sql
-- Quote pay links. Catalog prices unchanged. Collect amount is server-owned.

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_pricing_source_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_pricing_source_check
  CHECK (pricing_source IS NULL OR pricing_source = ANY (ARRAY['tier'::text, 'override'::text, 'quote'::text]));

CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text NOT NULL,
  token text NOT NULL UNIQUE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id),
  service_id uuid NOT NULL REFERENCES public.services(id),
  booking_id uuid REFERENCES public.bookings(id),
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text NOT NULL,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  agreed_total numeric NOT NULL CHECK (agreed_total > 0),
  display_currency text NOT NULL CHECK (display_currency = ANY (ARRAY['USD'::text, 'UGX'::text, 'RWF'::text])),
  charge_type text NOT NULL CHECK (charge_type = ANY (ARRAY['full'::text, 'deposit'::text, 'custom'::text])),
  collect_amount_ugx integer NOT NULL CHECK (collect_amount_ugx > 0),
  agreed_total_ugx integer NOT NULL CHECK (agreed_total_ugx > 0),
  amount_paid_ugx integer NOT NULL DEFAULT 0 CHECK (amount_paid_ugx >= 0),
  balance_enabled boolean NOT NULL DEFAULT false,
  valid_until timestamptz,
  notes text,
  service_date date,
  end_date date,
  status text NOT NULL DEFAULT 'sent'
    CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'deposit_paid'::text, 'paid'::text, 'expired'::text, 'cancelled'::text])),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotes_paid_not_over CHECK (amount_paid_ugx <= agreed_total_ugx),
  CONSTRAINT quotes_collect_not_over CHECK (collect_amount_ugx <= agreed_total_ugx)
);

CREATE INDEX IF NOT EXISTS idx_quotes_vendor ON public.quotes(vendor_id);
CREATE INDEX IF NOT EXISTS idx_quotes_booking ON public.quotes(booking_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage quotes" ON public.quotes;
CREATE POLICY "Admins manage quotes"
  ON public.quotes FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Vendors read own quotes" ON public.quotes;
CREATE POLICY "Vendors read own quotes"
  ON public.quotes FOR SELECT
  USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.next_quote_invoice_no()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  y int := EXTRACT(YEAR FROM timezone('utc', now()))::int;
  n int;
BEGIN
  SELECT COUNT(*)::int INTO n FROM public.quotes
  WHERE invoice_no LIKE ('DT-Q-' || y::text || '-%');
  RETURN 'DT-Q-' || y::text || '-' || lpad((n + 1)::text, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.create_quote_pay_link(
  p_vendor_id uuid,
  p_service_id uuid,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_line_items jsonb,
  p_agreed_total numeric,
  p_display_currency text,
  p_charge_type text,
  p_collect_amount_ugx integer,
  p_agreed_total_ugx integer,
  p_invoice_no text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_service_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_valid_until timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cat text;
  v_quote_id uuid;
  v_token text;
  v_invoice text;
  v_booking jsonb;
  v_booking_id uuid;
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_admin');
  END IF;

  SELECT category_id INTO v_cat FROM public.services WHERE id = p_service_id;
  IF v_cat IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'service_not_found');
  END IF;
  IF v_cat = 'cat_restaurants' THEN
    RETURN jsonb_build_object('success', false, 'error', 'restaurants_have_no_payment_links');
  END IF;

  IF p_collect_amount_ugx <= 0 OR p_agreed_total_ugx <= 0 OR p_collect_amount_ugx > p_agreed_total_ugx THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_ugx_amounts');
  END IF;

  v_token := translate(encode(gen_random_bytes(18), 'base64'), '+/', 'ab');
  v_invoice := NULLIF(trim(p_invoice_no), '');
  IF v_invoice IS NULL THEN
    v_invoice := public.next_quote_invoice_no();
  END IF;

  INSERT INTO public.quotes (
    invoice_no, token, vendor_id, service_id,
    guest_name, guest_email, guest_phone, line_items,
    agreed_total, display_currency, charge_type,
    collect_amount_ugx, agreed_total_ugx,
    valid_until, notes, service_date, end_date,
    status, created_by
  ) VALUES (
    v_invoice, v_token, p_vendor_id, p_service_id,
    trim(p_guest_name), lower(trim(p_guest_email)), trim(p_guest_phone), COALESCE(p_line_items, '[]'::jsonb),
    p_agreed_total, p_display_currency, p_charge_type,
    p_collect_amount_ugx, p_agreed_total_ugx,
    COALESCE(p_valid_until, timezone('utc', now()) + interval '30 days'),
    p_notes, COALESCE(p_service_date, CURRENT_DATE), p_end_date,
    'sent', auth.uid()
  )
  RETURNING id INTO v_quote_id;

  SELECT public.create_booking_atomic(
    p_service_id,
    p_vendor_id,
    CURRENT_DATE,
    1,
    p_collect_amount_ugx,
    NULL,
    COALESCE(p_service_date, CURRENT_DATE),
    'UGX',
    p_notes,
    trim(p_guest_name),
    lower(trim(p_guest_email)),
    trim(p_guest_phone),
    NULL,
    NULL,
    p_collect_amount_ugx
  ) INTO v_booking;

  IF COALESCE(v_booking->>'success', 'false') <> 'true' THEN
    DELETE FROM public.quotes WHERE id = v_quote_id;
    RETURN v_booking;
  END IF;

  v_booking_id := (v_booking->>'booking_id')::uuid;

  UPDATE public.bookings
  SET
    pricing_source = 'quote',
    pricing_reference_id = v_quote_id,
    platform_fee = 0,
    fee_payer = 'vendor',
    currency = 'UGX',
    end_date = p_end_date,
    updated_at = now()
  WHERE id = v_booking_id;

  UPDATE public.quotes
  SET booking_id = v_booking_id, updated_at = now()
  WHERE id = v_quote_id;

  RETURN jsonb_build_object(
    'success', true,
    'quote_id', v_quote_id,
    'booking_id', v_booking_id,
    'invoice_no', v_invoice,
    'token', v_token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_quote_pay_page(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q public.quotes%ROWTYPE;
  svc_title text;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  SELECT title INTO svc_title FROM public.services WHERE id = q.service_id;

  RETURN jsonb_build_object(
    'success', true,
    'invoice_no', q.invoice_no,
    'guest_name', q.guest_name,
    'line_items', q.line_items,
    'agreed_total', q.agreed_total,
    'display_currency', q.display_currency,
    'collect_amount_ugx', q.collect_amount_ugx,
    'agreed_total_ugx', q.agreed_total_ugx,
    'amount_paid_ugx', q.amount_paid_ugx,
    'status', q.status,
    'valid_until', q.valid_until,
    'balance_enabled', q.balance_enabled,
    'booking_id', q.booking_id,
    'service_title', svc_title,
    'notes', q.notes,
    'service_date', q.service_date
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.enable_quote_balance_link(p_quote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q public.quotes%ROWTYPE;
  v_remain int;
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_admin');
  END IF;
  SELECT * INTO q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;
  IF q.status <> 'deposit_paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_awaiting_balance');
  END IF;
  v_remain := q.agreed_total_ugx - q.amount_paid_ugx;
  IF v_remain <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_paid');
  END IF;
  UPDATE public.quotes
  SET collect_amount_ugx = v_remain, balance_enabled = true, updated_at = now()
  WHERE id = p_quote_id;
  RETURN jsonb_build_object('success', true, 'collect_amount_ugx', v_remain, 'token', q.token);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_quote_pay_link(p_quote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_admin');
  END IF;
  UPDATE public.quotes
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_quote_id AND status IN ('sent', 'draft') AND amount_paid_ugx = 0;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_cancel');
  END IF;
  UPDATE public.bookings SET status = 'cancelled', updated_at = now()
  WHERE id = (SELECT booking_id FROM public.quotes WHERE id = p_quote_id)
    AND payment_status = 'pending';
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_quote_pay_link(uuid, uuid, text, text, text, jsonb, numeric, text, text, integer, integer, text, text, date, date, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quote_pay_page(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enable_quote_balance_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_quote_pay_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_quote_invoice_no() TO authenticated;

REVOKE ALL ON FUNCTION public.create_quote_pay_link(uuid, uuid, text, text, text, jsonb, numeric, text, text, integer, integer, text, text, date, date, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.enable_quote_balance_link(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_quote_pay_link(uuid) FROM PUBLIC, anon;
```

Confirm `create_booking_atomic` live signature matches the call (positional args in the migration above). If the live function has extra args, match `supabase/migrations/20260612180100_restaurant_reservation_status.sql`.

- [ ] **Step 2: Apply migration to Travel Tails**

Use Supabase MCP `apply_migration` with project Travel Tails and the SQL from the file. Then:

```sql
SELECT to_regclass('public.quotes');
SELECT proname FROM pg_proc WHERE proname IN ('create_quote_pay_link','get_quote_pay_page');
```

Expected: `quotes`, both function names.

- [ ] **Step 3: Halt if restaurant can execute create** — call `create_quote_pay_link` is admin-only; do not test as anon.

---

### Task 3: Repository

**Files:**
- Create: `src/repositories/QuoteRepository.ts`
- Modify: `src/types/booking.ts` — `pricing_source` may include `'quote'`

**Interfaces:**
- Consumes: RPCs from Task 2; `supabase` from `src/lib/supabaseClient.ts`
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

`publicPayUrl`:

```ts
export function publicPayUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bookings.dirt-trails.com'
  return `${origin}/pay/${token}`
}
```

`getQuotePayPage` calls `supabase.rpc('get_quote_pay_page', { p_token: token })` (works logged-out).

`createQuotePayLink` calls `create_quote_pay_link` with `p_` args matching the SQL. Throw if `success !== true`.

`listQuotes`:

```ts
const { data, error } = await supabase
  .from('quotes')
  .select('*, services(title), vendors(business_name)')
  .order('created_at', { ascending: false })
```

Admin RLS allows this.

---

### Task 4: Admin Quotes UI

**Files:**
- Create: `src/pages/admin/Quotes.tsx`
- Modify: `src/App.tsx` — lazy `Quotes` at `/admin/quotes` inside admin `ProtectedRoute`
- Modify: `src/components/Layout.tsx` — Bookings nav item `{ labelKey: 'quotes', href: '/admin/quotes', icon: LinkIcon }` (`Link` from lucide-react is already imported as router Link — import `Link2` as the icon)
- Modify: `src/i18n/translations.ts` — add `quotes: 'Quotes'` (and pt/fr equivalents)

**Admin form fields (single page, list + drawer/modal):**
- Guest name, email, phone
- Vendor select then listing select (`services` for that vendor, `category_id !== 'cat_restaurants'`)
- Mode: listing (one auto line from title + qty 1 + agreed total) or custom lines
- Charge type full / deposit / custom
- Display currency USD | UGX | RWF
- `agreed_total_ugx` and `collect_amount_ugx` (number inputs, integers)
- Optional invoice no (placeholder `DT-INV-2026-003`); empty → auto `DT-Q-…`
- Dates + notes
- Submit → `createQuotePayLink` → show copyable `/pay/{token}`

List columns: invoice no, guest, vendor, listing, agreed vs paid UGX, status, Copy link, Enable balance (only `deposit_paid`), Cancel (only `sent` and unpaid).

Do not call MarzPay from this page.

---

### Task 5: Public pay page

**Files:**
- Create: `src/pages/QuotePay.tsx`
- Modify: `src/App.tsx` — public route (no `ProtectedRoute`) `<Route path="/pay/:token" element={<PublicLayout />}>` with index `QuotePay`, same pattern as other public pages under `PublicLayout`

**Page behavior:**
1. `getQuotePayPage(token)`
2. Not found / cancelled / expired → “This payment link is not available.”
3. `status === 'paid'` → “Already paid. Check your email.”
4. `status === 'deposit_paid' && !balance_enabled` → “Deposit received. DirtTrails will send the balance link.”
5. Else show invoice_no, guest_name, line items, agreed total + display_currency, **Pay UGX {remaining or collect_amount_ugx}**, no booking fee line, `MarzpayPaymentFields`
6. Pay calls `initiateMarzpayCollect({ amount: 0, booking_id, phone_number, method })` — amount is ignored server-side for quotes; still send a dummy 0 or omit if the client type requires a number. Prefer sending `amount: 1` only if the TS type requires it; Task 6 overwrites it.
7. Watch with `watchMarzpayPayment` / existing booking payment watch using `booking_id` + reference
8. Success copy: “Payment received. Confirmation is on its way to your email.”

Reuse `MarzpayPaymentFields` from `src/components/payment/MarzpayPaymentFields.tsx`.

Card return URL already supports `booking_id` in `marzpay-collect`.

---

### Task 6: Lock collect amount for quote bookings

**Files:**
- Modify: `supabase/functions/marzpay-collect/index.ts`

After `paymentBookingId` is known and the supabase service client exists, **before** MarzPay HTTP:

```ts
if (paymentBookingId) {
  const { data: bookingRow } = await supabase
    .from("bookings")
    .select("id, pricing_source, payment_status, status")
    .eq("id", paymentBookingId)
    .maybeSingle()

  if (bookingRow?.pricing_source === "quote") {
    const { data: quoteRow } = await supabase
      .from("quotes")
      .select("status, valid_until, collect_amount_ugx, agreed_total_ugx, amount_paid_ugx, balance_enabled, booking_id")
      .eq("booking_id", paymentBookingId)
      .maybeSingle()

    if (!quoteRow) {
      return new Response(JSON.stringify({ error: "Quote not found for booking" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    const remaining = Math.max(0, quoteRow.agreed_total_ugx - quoteRow.amount_paid_ugx)
    const expired = quoteRow.valid_until && new Date(quoteRow.valid_until).getTime() < Date.now()
    const blocked =
      expired ||
      remaining <= 0 ||
      quoteRow.status === "cancelled" ||
      quoteRow.status === "paid" ||
      quoteRow.status === "expired" ||
      (quoteRow.status === "deposit_paid" && !quoteRow.balance_enabled)

    if (blocked) {
      return new Response(JSON.stringify({ error: "This payment link cannot be charged" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    amount = Math.min(quoteRow.collect_amount_ugx, remaining)
  }
}
```

`amount` is currently destructured as `const` from `body` — change to `let amount = body.amount`.

Deploy: `supabase functions deploy marzpay-collect` (or MCP `deploy_edge_function`).

Verify locally by reading the function: quote branch sits **before** `parseInt(String(amount), 10)` sent to MarzPay.

---

### Task 7: Worker — settle this payment only, then bump quote totals

**Files:**
- Modify: `supabase/functions/process-payment-fulfillment-queue/index.ts` inside `processBookingFulfillment`

After `assertMarzpayPaymentCompleted` and loading `booking`:

If `booking.pricing_source === 'quote'`:

1. Load payment by `reference`; `payAmount = Number(payment.amount)`.
2. Load quote by `booking_id`.
3. `newPaid = quote.amount_paid_ugx + payAmount`. If `newPaid > quote.agreed_total_ugx`, throw `quote-overpay`.
4. If a completed `transactions` row already exists for this `payment.reference` / booking+reference, skip wallet credit (idempotent).
5. Else `settlePaymentWithCommission` with `totalAmount: payAmount` and `commissionAmount` = round(`payAmount * booking.commission_rate_at_booking`, 2) (same rate as first slice).
6. Update quote: `amount_paid_ugx = newPaid`, `status` = `newPaid >= agreed_total_ugx ? 'paid' : 'deposit_paid'`, `balance_enabled = false`.
7. Update booking: `total_amount = newPaid`, `commission_amount = round(newPaid * rate, 2)`, `vendor_payout_amount = newPaid - commission_amount`, `payment_status` = full ? `paid` : keep `paid` on the booking only when full — **deposit: `payment_status = 'paid'` is wrong for “balance still due”.** Use `payment_status = 'paid'` only when `newPaid >= agreed_total_ugx`; otherwise leave `pending` **only if** the existing check constraint allows a confirmed booking with pending pay.

Constraint: `payment_status IN ('pending','paid','refunded','not_required')`. There is no `deposit_paid` on bookings.

**Locked rule:** After first successful collect, set booking `status = 'confirmed'` and `payment_status = 'paid'` for the **slice already collected** (wallet already credited that slice). Balance is extra payments on the same booking. Quote.status tells admin deposit vs full. Booking.total_amount grows with each completed payment. Worker must **not** re-credit `booking.total_amount` on the second job — only `payAmount`.

Replace the `existingTx && !walletAlreadySettled` / `!existingTx` branch for quote bookings with: lookup transaction by `booking_id` + this `reference` (store reference in transaction notes or `payout_meta.reference`). If missing, settle `payAmount` only.

8. Send `send-booking-emails` as today. Optional: if `quote.status` was already `deposit_paid` going in, pass a note — skip new email template in v1 (same confirmation is OK).

Deploy `process-payment-fulfillment-queue`.

**Do not** run restaurant bookings through this branch (`booking_skips_marketplace_settlement` already throws).

---

### Task 8: Smoke on Travel Tails (no fake paid)

**Files:** none (manual)

- [ ] Admin `/admin/quotes` creates DT-INV-style custom lines, UGX collect 1000 (or real test amount)
- [ ] Open `/pay/{token}` logged out — total is UGX only, no booking fee
- [ ] Confirm `bookings.pricing_source = quote`, `platform_fee = 0`, `payment_status = pending` before pay
- [ ] After a real MarzPay test pay: `payments.status = completed`, quote `amount_paid_ugx` matches, vendor wallet increased by payout not by catalog price
- [ ] Restaurant listing rejected by RPC
- [ ] Browser POST to collect with `amount: 1` on a quote booking still charges DB UGX

If ledger total ≠ wallet sum after the test, **HALT** — do not ship.

---

## Spec coverage

| Spec item | Task |
|---|---|
| Admin create link, full/deposit/custom | 1, 2, 4 |
| Listing or custom lines; service_id required | 2, 4 |
| Vendor wallet + commission on this charge | 2, 7 |
| Display currency + typed UGX | 4, 5 |
| Zero booking fee | 2 (platform_fee=0), 5 (UI) |
| No restaurant links | 2, 4 |
| Collect ignores client amount | 6 |
| Pending booking at save | 2 |
| Same URL + enable balance | 2, 4, 5, 7 |
| Emails | 7 (existing worker) |
| Guest name/email/phone | 2 |
| Catalog price unchanged | never update `services.price` |

## Type consistency

- `ChargeType` = `'full' | 'deposit' | 'custom'` in TS and SQL
- RPC arg names `p_vendor_id`, `p_token`, etc. match `QuoteRepository`
- `pricing_source = 'quote'` in bookings check, collect, and worker
- `balance_enabled` gates second collect
