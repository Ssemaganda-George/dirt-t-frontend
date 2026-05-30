import type { SupabaseClient } from '@supabase/supabase-js'

/** Categories where one active booking blocks the vendor calendar for those dates. */
export const SINGLE_BOOKING_CATEGORY_NAMES = [
  'transport',
  'accommodation',
  'hotels',
  'hotel',
] as const

const DEFAULT_SINGLE_BOOKING_CATEGORIES = new Set<string>(SINGLE_BOOKING_CATEGORY_NAMES)

export type BlockedDateBookingRow = {
  service_date?: string | null
  end_date?: string | null
  services?: unknown
}

export function getServiceCategoryName(services: unknown): string {
  try {
    const sc = (services as { service_categories?: { name?: string } | Array<{ name?: string }> })
      ?.service_categories
    if (!sc) return ''
    if (Array.isArray(sc)) return (sc[0]?.name || '').toString().toLowerCase()
    return (sc.name || '').toString().toLowerCase()
  } catch {
    return ''
  }
}

/** Expand booking rows into ISO date strings (YYYY-MM-DD) blocked on the calendar. */
export function buildBlockedDatesSet(
  bookings: BlockedDateBookingRow[],
  singleCategories: Set<string> = DEFAULT_SINGLE_BOOKING_CATEGORIES
): Set<string> {
  const blocked = new Set<string>()

  for (const booking of bookings) {
    const category = getServiceCategoryName(booking.services)
    if (!category || !singleCategories.has(category)) continue
    if (!booking.service_date) continue

    const start = new Date(booking.service_date)
    if (Number.isNaN(start.getTime())) continue

    const end = booking.end_date ? new Date(booking.end_date) : start
    if (Number.isNaN(end.getTime())) {
      blocked.add(start.toISOString().split('T')[0])
      continue
    }

    const from = start < end ? start : end
    const to = end >= start ? end : start
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      blocked.add(new Date(d).toISOString().split('T')[0])
    }
  }

  return blocked
}

function isoDateLocal(date: Date): string {
  return date.toISOString().split('T')[0]
}

export type FetchVendorBlockedDatesOptions = {
  /** Days before today to include (ongoing multi-day bookings). Default 30. */
  lookBackDays?: number
  /** Days after today to include. Default 730 (~2 years). */
  lookAheadDays?: number
}

/**
 * Load blocked calendar dates for a vendor's transport/accommodation bookings.
 * Scoped query: vendor_id + date window + non-cancelled (not full-table scan).
 */
export async function fetchVendorBlockedDates(
  supabase: SupabaseClient,
  vendorId: string | undefined | null,
  options: FetchVendorBlockedDatesOptions = {}
): Promise<Set<string>> {
  if (!vendorId) return new Set()

  const lookBackDays = options.lookBackDays ?? 30
  const lookAheadDays = options.lookAheadDays ?? 730

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const windowStart = new Date(today)
  windowStart.setDate(windowStart.getDate() - lookBackDays)

  const windowEnd = new Date(today)
  windowEnd.setDate(windowEnd.getDate() + lookAheadDays)

  const minIso = isoDateLocal(windowStart)
  const maxIso = isoDateLocal(windowEnd)

  const { data, error } = await supabase
    .from('bookings')
    .select('service_date, end_date, services (id, service_categories (name))')
    .eq('vendor_id', vendorId)
    .neq('status', 'cancelled')
    .lte('service_date', maxIso)
    .or(`end_date.gte.${minIso},and(end_date.is.null,service_date.gte.${minIso})`)

  if (error) throw error

  return buildBlockedDatesSet(data ?? [])
}
