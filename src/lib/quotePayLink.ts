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
