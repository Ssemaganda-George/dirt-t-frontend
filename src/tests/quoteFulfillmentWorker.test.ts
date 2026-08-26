import { describe, expect, it, vi } from 'vitest'
import { processQuoteBookingFulfillment } from '../../supabase/functions/process-payment-fulfillment-queue/quoteSettlement'

type Row = Record<string, unknown>

type MockState = {
  payments: Row[]
  quotes: Row[]
  transactions: Row[]
}

function createMockSupabase(state: MockState) {
  const updates: { table: string; payload: Row; filters: Record<string, unknown> }[] = []

  function match(table: string, filters: Record<string, unknown>): Row[] {
    const rows =
      table === 'payments' ? state.payments
        : table === 'quotes' ? state.quotes
          : table === 'transactions' ? state.transactions
            : []
    return rows.filter((row) =>
      Object.entries(filters).every(([key, value]) => row[key] === value),
    )
  }

  const supabase = {
    updates,
    state,
    rpc: vi.fn(),
    from(table: string) {
      const filters: Record<string, unknown> = {}
      let pendingUpdate: Row | null = null
      const api: Record<string, unknown> = {}

      const execute = async () => {
        const rows = match(table, filters)
        if (pendingUpdate) {
          updates.push({ table, payload: pendingUpdate, filters: { ...filters } })
          for (const row of rows) Object.assign(row, pendingUpdate)
          return { data: rows[0] ?? null, error: null }
        }
        return { data: rows, error: null }
      }

      api.select = () => api
      api.update = (payload: Row) => {
        pendingUpdate = payload
        return api
      }
      api.eq = (col: string, val: unknown) => {
        filters[col] = val
        return api
      }
      api.maybeSingle = async () => {
        const rows = match(table, filters)
        if (pendingUpdate) {
          updates.push({ table, payload: pendingUpdate, filters: { ...filters } })
          for (const row of rows) Object.assign(row, pendingUpdate)
          return { data: rows[0] ?? null, error: null }
        }
        return { data: rows[0] ?? null, error: null }
      }
      api.then = (
        onFulfilled: (v: unknown) => unknown,
        onRejected?: (e: unknown) => unknown,
      ) => execute().then(onFulfilled, onRejected)

      return api
    },
  }

  return supabase
}

const bookingId = 'booking-quote-1'
const paymentRef = 'MZ-DEP-1'
const rate = 0.1

const booking = {
  vendor_id: 'vendor-1',
  tourist_id: null,
  currency: 'UGX',
  total_amount: 999999,
  commission_rate_at_booking: rate,
  pricing_source: 'quote',
}

function lastUpdate(supabase: ReturnType<typeof createMockSupabase>, table: string): Row {
  const found = [...supabase.updates].reverse().find((u) => u.table === table)
  if (!found) throw new Error(`no update for ${table}`)
  return found.payload
}

describe('processQuoteBookingFulfillment', () => {
  it('settles this MarzPay amount only and marks quote deposit_paid', async () => {
    const supabase = createMockSupabase({
      payments: [
        { reference: paymentRef, amount: 445000, booking_id: bookingId, status: 'completed' },
      ],
      quotes: [
        {
          id: 'quote-1',
          booking_id: bookingId,
          amount_paid_ugx: 0,
          agreed_total_ugx: 890000,
          status: 'sent',
          balance_enabled: true,
        },
      ],
      transactions: [],
    })
    const settle = vi.fn().mockResolvedValue(undefined)

    await processQuoteBookingFulfillment(supabase, {
      booking,
      bookingId,
      paymentRef,
      adminId: 'admin-1',
      settlePaymentWithCommission: settle,
    })

    expect(settle).toHaveBeenCalledTimes(1)
    expect(settle.mock.calls[0][1]).toMatchObject({
      vendorId: 'vendor-1',
      totalAmount: 445000,
      commissionAmount: 44500,
      bookingId,
      reference: paymentRef,
      currency: 'UGX',
    })
    expect(settle.mock.calls[0][1].totalAmount).not.toBe(booking.total_amount)
    expect(supabase.rpc).not.toHaveBeenCalled()

    expect(lastUpdate(supabase, 'quotes')).toMatchObject({
      amount_paid_ugx: 445000,
      status: 'deposit_paid',
      balance_enabled: false,
    })
    expect(lastUpdate(supabase, 'bookings')).toMatchObject({
      total_amount: 445000,
      commission_amount: 44500,
      vendor_payout_amount: 400500,
      status: 'confirmed',
      payment_status: 'paid',
    })
  })

  it('on a second collect credits the balance slice not the running booking total', async () => {
    const balanceRef = 'MZ-BAL-1'
    const supabase = createMockSupabase({
      payments: [
        { reference: 'MZ-DEP-1', amount: 445000, booking_id: bookingId, status: 'completed' },
        { reference: balanceRef, amount: 445000, booking_id: bookingId, status: 'completed' },
      ],
      quotes: [
        {
          id: 'quote-1',
          booking_id: bookingId,
          amount_paid_ugx: 445000,
          agreed_total_ugx: 890000,
          status: 'deposit_paid',
          balance_enabled: true,
        },
      ],
      transactions: [
        {
          id: 'tx-dep',
          reference: 'MZ-DEP-1',
          booking_id: bookingId,
          transaction_type: 'payment',
          status: 'completed',
        },
      ],
    })
    const settle = vi.fn().mockResolvedValue(undefined)

    await processQuoteBookingFulfillment(supabase, {
      booking,
      bookingId,
      paymentRef: balanceRef,
      adminId: 'admin-1',
      settlePaymentWithCommission: settle,
    })

    expect(settle).toHaveBeenCalledTimes(1)
    expect(settle.mock.calls[0][1].totalAmount).toBe(445000)
    expect(settle.mock.calls[0][1].commissionAmount).toBe(44500)
    expect(settle.mock.calls[0][1].reference).toBe(balanceRef)

    expect(lastUpdate(supabase, 'quotes')).toMatchObject({
      amount_paid_ugx: 890000,
      status: 'paid',
      balance_enabled: false,
    })
    expect(lastUpdate(supabase, 'bookings')).toMatchObject({
      total_amount: 890000,
      commission_amount: 89000,
      vendor_payout_amount: 801000,
      status: 'confirmed',
      payment_status: 'paid',
    })
  })

  it('skips wallet credit when a completed tx already exists for this reference', async () => {
    const supabase = createMockSupabase({
      payments: [
        { reference: paymentRef, amount: 445000, booking_id: bookingId, status: 'completed' },
      ],
      quotes: [
        {
          id: 'quote-1',
          booking_id: bookingId,
          amount_paid_ugx: 445000,
          agreed_total_ugx: 890000,
          status: 'deposit_paid',
          balance_enabled: false,
        },
      ],
      transactions: [
        {
          id: 'tx-1',
          reference: paymentRef,
          booking_id: bookingId,
          transaction_type: 'payment',
          status: 'completed',
        },
      ],
    })
    const settle = vi.fn().mockResolvedValue(undefined)

    await processQuoteBookingFulfillment(supabase, {
      booking,
      bookingId,
      paymentRef,
      adminId: 'admin-1',
      settlePaymentWithCommission: settle,
    })

    expect(settle).not.toHaveBeenCalled()
    expect(lastUpdate(supabase, 'quotes')).toMatchObject({
      amount_paid_ugx: 445000,
      status: 'deposit_paid',
    })
  })

  it('still bumps quote totals if wallet settled but quote update had not run', async () => {
    const supabase = createMockSupabase({
      payments: [
        { reference: paymentRef, amount: 445000, booking_id: bookingId, status: 'completed' },
      ],
      quotes: [
        {
          id: 'quote-1',
          booking_id: bookingId,
          amount_paid_ugx: 0,
          agreed_total_ugx: 890000,
          status: 'sent',
          balance_enabled: true,
        },
      ],
      transactions: [
        {
          id: 'tx-1',
          reference: paymentRef,
          booking_id: bookingId,
          transaction_type: 'payment',
          status: 'completed',
        },
      ],
    })
    const settle = vi.fn().mockResolvedValue(undefined)

    await processQuoteBookingFulfillment(supabase, {
      booking,
      bookingId,
      paymentRef,
      adminId: 'admin-1',
      settlePaymentWithCommission: settle,
    })

    expect(settle).not.toHaveBeenCalled()
    expect(lastUpdate(supabase, 'quotes')).toMatchObject({
      amount_paid_ugx: 445000,
      status: 'deposit_paid',
    })
  })

  it('still settles the second payment after catch-up wrote both payment sums onto the quote', async () => {
    const depositRef = 'MZ-DEP-1'
    const balanceRef = 'MZ-BAL-2'
    const supabase = createMockSupabase({
      payments: [
        { reference: depositRef, amount: 445000, booking_id: bookingId, status: 'completed' },
        { reference: balanceRef, amount: 445000, booking_id: bookingId, status: 'completed' },
      ],
      quotes: [
        {
          id: 'quote-1',
          booking_id: bookingId,
          amount_paid_ugx: 0,
          agreed_total_ugx: 890000,
          status: 'sent',
          balance_enabled: true,
        },
      ],
      transactions: [
        {
          id: 'tx-dep',
          reference: depositRef,
          booking_id: bookingId,
          transaction_type: 'payment',
          status: 'completed',
        },
      ],
    })
    const settle = vi.fn().mockResolvedValue(undefined)

    await processQuoteBookingFulfillment(supabase, {
      booking,
      bookingId,
      paymentRef: depositRef,
      adminId: 'admin-1',
      settlePaymentWithCommission: settle,
    })
    expect(settle).not.toHaveBeenCalled()
    expect(lastUpdate(supabase, 'quotes')).toMatchObject({
      amount_paid_ugx: 890000,
      status: 'paid',
    })

    await processQuoteBookingFulfillment(supabase, {
      booking,
      bookingId,
      paymentRef: balanceRef,
      adminId: 'admin-1',
      settlePaymentWithCommission: settle,
    })
    expect(settle).toHaveBeenCalledTimes(1)
    expect(settle.mock.calls[0][1].totalAmount).toBe(445000)
    expect(settle.mock.calls[0][1].reference).toBe(balanceRef)
    expect(lastUpdate(supabase, 'quotes')).toMatchObject({
      amount_paid_ugx: 890000,
      status: 'paid',
    })
  })

  it('throws quote-overpay when this payment would exceed agreed_total_ugx', async () => {
    const overpayRef = 'MZ-OVER-1'
    const supabase = createMockSupabase({
      payments: [
        { reference: 'MZ-DEP-1', amount: 445000, booking_id: bookingId, status: 'completed' },
        { reference: overpayRef, amount: 500000, booking_id: bookingId, status: 'completed' },
      ],
      quotes: [
        {
          id: 'quote-1',
          booking_id: bookingId,
          amount_paid_ugx: 445000,
          agreed_total_ugx: 890000,
          status: 'deposit_paid',
          balance_enabled: true,
        },
      ],
      transactions: [],
    })
    const settle = vi.fn().mockResolvedValue(undefined)

    await expect(
      processQuoteBookingFulfillment(supabase, {
        booking,
        bookingId,
        paymentRef: overpayRef,
        adminId: 'admin-1',
        settlePaymentWithCommission: settle,
      }),
    ).rejects.toThrow(/quote-overpay/)
    expect(settle).not.toHaveBeenCalled()
  })

  it('throws when the MarzPay payment row is missing or amount is not positive', async () => {
    const supabase = createMockSupabase({
      payments: [],
      quotes: [
        {
          id: 'quote-1',
          booking_id: bookingId,
          amount_paid_ugx: 0,
          agreed_total_ugx: 890000,
          status: 'sent',
          balance_enabled: false,
        },
      ],
      transactions: [],
    })

    await expect(
      processQuoteBookingFulfillment(supabase, {
        booking,
        bookingId,
        paymentRef,
        adminId: null,
        settlePaymentWithCommission: vi.fn(),
      }),
    ).rejects.toThrow(/quote-payment-missing/)
  })

  it('throws when payAmount is not positive', async () => {
    const supabase = createMockSupabase({
      payments: [
        { reference: paymentRef, amount: 0, booking_id: bookingId, status: 'completed' },
      ],
      quotes: [
        {
          id: 'quote-1',
          booking_id: bookingId,
          amount_paid_ugx: 0,
          agreed_total_ugx: 890000,
          status: 'sent',
          balance_enabled: false,
        },
      ],
      transactions: [],
    })

    await expect(
      processQuoteBookingFulfillment(supabase, {
        booking,
        bookingId,
        paymentRef,
        adminId: null,
        settlePaymentWithCommission: vi.fn(),
      }),
    ).rejects.toThrow(/quote-payment-missing/)
  })

  it('throws when the quote row is missing', async () => {
    const supabase = createMockSupabase({
      payments: [
        { reference: paymentRef, amount: 445000, booking_id: bookingId, status: 'completed' },
      ],
      quotes: [],
      transactions: [],
    })

    await expect(
      processQuoteBookingFulfillment(supabase, {
        booking,
        bookingId,
        paymentRef,
        adminId: null,
        settlePaymentWithCommission: vi.fn(),
      }),
    ).rejects.toThrow(/quote-not-found/)
  })
})
