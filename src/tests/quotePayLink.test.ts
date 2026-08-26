import { describe, expect, it } from 'vitest'
import {
  chargeDisplayAmount,
  isQuoteCollectOpen,
  nextInvoiceNo,
  remainingUgx,
  sumLineItems,
  thisCollectUgx,
  withLineAmounts,
} from '../lib/quotePayLink'

describe('quotePayLink', () => {
  it('builds invoice lines like DT-INV-2026-003', () => {
    const items = withLineAmounts([
      { description: 'Sheron Hotel - Single occupancy (B&B)', qty: 6, unit_price: 27 },
      { description: 'Service Fee - Pick-up & drop-off', qty: 1, unit_price: 80 },
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
    expect(isQuoteCollectOpen({ ...base, status: 'cancelled' })).toBe(false)
    expect(isQuoteCollectOpen({ ...base, status: 'draft' })).toBe(false)
    expect(isQuoteCollectOpen({ ...base, valid_until: '2000-01-01T00:00:00Z' })).toBe(false)
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

  it('caps collect amount to remaining UGX', () => {
    const base = {
      status: 'sent' as const,
      valid_until: '2099-01-01T00:00:00Z',
      amount_paid_ugx: 445000,
      agreed_total_ugx: 890000,
      balance_enabled: true,
    }
    expect(thisCollectUgx({ ...base, collect_amount_ugx: 445000 })).toBe(445000)
    expect(thisCollectUgx({ ...base, collect_amount_ugx: 500000 })).toBe(445000)
    expect(thisCollectUgx({ ...base, collect_amount_ugx: 100000 })).toBe(100000)
  })
})
