import { supabase } from '../lib/supabaseClient'
import type { ChargeType, QuoteLineItem } from '../lib/quotePayLink'

export type QuoteStatus = 'draft' | 'sent' | 'deposit_paid' | 'paid' | 'expired' | 'cancelled'
export type QuoteDisplayCurrency = 'USD' | 'UGX' | 'RWF'

export type QuoteRow = {
  id: string
  invoice_no: string
  token: string
  vendor_id: string
  service_id: string
  booking_id: string | null
  guest_name: string
  guest_email: string
  guest_phone: string
  line_items: QuoteLineItem[]
  agreed_total: number
  display_currency: QuoteDisplayCurrency
  charge_type: ChargeType
  collect_amount_ugx: number
  agreed_total_ugx: number
  amount_paid_ugx: number
  balance_enabled: boolean
  valid_until: string | null
  notes: string | null
  service_date: string | null
  end_date: string | null
  status: QuoteStatus
  created_by: string | null
  created_at: string
  updated_at: string
  services: { title: string } | null
  vendors: { business_name: string } | null
}

export type QuotePayPage = {
  invoice_no: string
  guest_name: string
  line_items: QuoteLineItem[]
  agreed_total: number
  display_currency: QuoteDisplayCurrency
  collect_amount_ugx: number
  agreed_total_ugx: number
  amount_paid_ugx: number
  status: QuoteStatus
  valid_until: string | null
  balance_enabled: boolean
  booking_id: string | null
  service_title: string | null
  notes: string | null
  service_date: string | null
}

export type CreateQuoteInput = {
  vendorId: string
  serviceId: string
  guestName: string
  guestEmail: string
  guestPhone: string
  lineItems: QuoteLineItem[]
  agreedTotal: number
  displayCurrency: QuoteDisplayCurrency
  chargeType: ChargeType
  collectAmountUgx: number
  agreedTotalUgx: number
  invoiceNo?: string | null
  notes?: string | null
  serviceDate?: string | null
  endDate?: string | null
  validUntil?: string | null
}

type RpcEnvelope = {
  success?: boolean
  error?: string
  token?: string
  invoice_no?: string
  booking_id?: string
  collect_amount_ugx?: number
}

function emptyToNull(value?: string | null): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function assertRpcSuccess(data: RpcEnvelope | null, fallback: string): asserts data is RpcEnvelope {
  if (!data || data.success !== true) {
    throw new Error(data?.error || fallback)
  }
}

export async function listQuotes(): Promise<QuoteRow[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, services(title), vendors(business_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as QuoteRow[]
}

export async function createQuotePayLink(
  input: CreateQuoteInput,
): Promise<{ token: string; invoice_no: string; booking_id: string }> {
  const { data, error } = await supabase.rpc('create_quote_pay_link', {
    p_vendor_id: input.vendorId,
    p_service_id: input.serviceId,
    p_guest_name: input.guestName,
    p_guest_email: input.guestEmail,
    p_guest_phone: input.guestPhone,
    p_line_items: input.lineItems,
    p_agreed_total: input.agreedTotal,
    p_display_currency: input.displayCurrency,
    p_charge_type: input.chargeType,
    p_collect_amount_ugx: input.collectAmountUgx,
    p_agreed_total_ugx: input.agreedTotalUgx,
    p_invoice_no: emptyToNull(input.invoiceNo),
    p_notes: input.notes ?? null,
    p_service_date: input.serviceDate ?? null,
    p_end_date: input.endDate ?? null,
    p_valid_until: input.validUntil ?? null,
  })
  if (error) throw error
  const payload = data as RpcEnvelope | null
  assertRpcSuccess(payload, 'Failed to create quote pay link')
  return {
    token: payload.token as string,
    invoice_no: payload.invoice_no as string,
    booking_id: payload.booking_id as string,
  }
}

export async function getQuotePayPage(token: string): Promise<QuotePayPage | null> {
  const { data, error } = await supabase.rpc('get_quote_pay_page', { p_token: token })
  if (error) throw error
  const payload = data as (QuotePayPage & RpcEnvelope) | null
  if (!payload || payload.success !== true || payload.error === 'not_found') return null
  return payload
}

export async function enableQuoteBalanceLink(
  quoteId: string,
): Promise<{ token: string; collect_amount_ugx: number }> {
  const { data, error } = await supabase.rpc('enable_quote_balance_link', { p_quote_id: quoteId })
  if (error) throw error
  const payload = data as RpcEnvelope | null
  assertRpcSuccess(payload, 'Failed to enable quote balance link')
  return {
    token: payload.token as string,
    collect_amount_ugx: payload.collect_amount_ugx as number,
  }
}

export async function cancelQuotePayLink(quoteId: string): Promise<void> {
  const { data, error } = await supabase.rpc('cancel_quote_pay_link', { p_quote_id: quoteId })
  if (error) throw error
  assertRpcSuccess(data as RpcEnvelope | null, 'Failed to cancel quote pay link')
}

export function publicPayUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bookings.dirt-trails.com'
  return `${origin}/pay/${token}`
}
