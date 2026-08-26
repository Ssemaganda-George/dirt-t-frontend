/** Quote-booking settlement. No Deno imports — Vitest and the worker share this. */

export type QuoteSettleParams = {
  vendorId: string
  totalAmount: number
  commissionAmount: number
  adminId: string | null
  bookingId: string | null
  touristId: string | null
  currency: string
  reference: string
}

export type QuoteSettleFn = (supabase: any, params: QuoteSettleParams) => Promise<void>

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export async function processQuoteBookingFulfillment(
  supabase: any,
  opts: {
    booking: any
    bookingId: string
    paymentRef: string
    adminId: string | null
    settlePaymentWithCommission: QuoteSettleFn
  },
): Promise<void> {
  const { booking, bookingId, paymentRef, adminId, settlePaymentWithCommission } = opts

  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .select("id, amount, reference, booking_id, status")
    .eq("reference", paymentRef)
    .maybeSingle()

  if (payErr) throw new Error(`payment-lookup-failed:${payErr.message}`)
  const payAmount = Number(payment?.amount)
  if (!payment || !(payAmount > 0)) {
    throw new Error(`quote-payment-missing-or-invalid:${paymentRef}`)
  }
  if (String(payment.status).toLowerCase() !== "completed") {
    throw new Error(`quote-payment-missing-or-invalid:${paymentRef}`)
  }

  const { data: quote, error: quoteErr } = await supabase
    .from("quotes")
    .select("id, amount_paid_ugx, agreed_total_ugx")
    .eq("booking_id", bookingId)
    .maybeSingle()

  if (quoteErr) throw new Error(`quote-lookup-failed:${quoteErr.message}`)
  if (!quote) throw new Error(`quote-not-found:${bookingId}`)

  const { data: existingTx, error: txErr } = await supabase
    .from("transactions")
    .select("id")
    .eq("reference", paymentRef)
    .eq("transaction_type", "payment")
    .eq("status", "completed")
    .maybeSingle()

  if (txErr) throw new Error(`tx-check-failed:${txErr.message}`)

  const { data: completedPays, error: completedErr } = await supabase
    .from("payments")
    .select("amount, reference")
    .eq("booking_id", bookingId)
    .eq("status", "completed")
  if (completedErr) throw new Error(`payment-lookup-failed:${completedErr.message}`)

  const otherPaid = (completedPays || []).reduce(
    (sum: number, row: { amount?: number | string | null; reference?: string | null }) => {
      if (String(row.reference) === String(paymentRef)) return sum
      return sum + Number(row.amount || 0)
    },
    0,
  )
  const newPaid = otherPaid + payAmount
  const agreed = Number(quote.agreed_total_ugx)

  if (!existingTx && otherPaid + payAmount > agreed) {
    throw new Error(`quote-overpay:${bookingId}:newPaid=${newPaid}:agreed=${agreed}`)
  }

  const rate = Number(booking.commission_rate_at_booking || 0)

  if (!existingTx) {
    await settlePaymentWithCommission(supabase, {
      vendorId: booking.vendor_id,
      totalAmount: payAmount,
      commissionAmount: roundMoney(payAmount * rate),
      adminId,
      bookingId,
      touristId: booking.tourist_id || null,
      currency: booking.currency || "UGX",
      reference: paymentRef,
    })
  }

  const quoteStatus = newPaid >= agreed ? "paid" : "deposit_paid"
  const { error: quoteUpdErr } = await supabase
    .from("quotes")
    .update({
      amount_paid_ugx: newPaid,
      status: quoteStatus,
      balance_enabled: false,
    })
    .eq("id", quote.id)

  if (quoteUpdErr) throw new Error(`quote-update-failed:${quoteUpdErr.message}`)

  const commissionAmount = roundMoney(newPaid * rate)
  const { error: bookingUpdErr } = await supabase
    .from("bookings")
    .update({
      total_amount: newPaid,
      commission_amount: commissionAmount,
      vendor_payout_amount: newPaid - commissionAmount,
      status: "confirmed",
      payment_status: "paid",
    })
    .eq("id", bookingId)

  if (bookingUpdErr) throw new Error(`booking-update-failed:${bookingUpdErr.message}`)
}
