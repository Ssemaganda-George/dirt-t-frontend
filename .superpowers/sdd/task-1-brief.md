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
      { description: 'Sheron Hotel â€” Single occupancy (B&B)', qty: 6, unit_price: 27 },
      { description: 'Service Fee â€” Pick-up & drop-off', qty: 1, unit_price: 80 },
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
Expected: FAIL â€” cannot find module `../lib/quotePayLink`

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

