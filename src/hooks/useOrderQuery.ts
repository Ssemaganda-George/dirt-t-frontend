import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export type OrderQueryData = {
  order: any
  items: any[]
  allTicketTypes: any[]
}

async function fetchOrderForCheckout(orderId: string): Promise<OrderQueryData> {
  // Wave 1: fetch order and order_items in parallel (both only need orderId)
  const [orderRes, itemsRes] = await Promise.all([
    supabase.from('orders').select('*').eq('id', orderId).maybeSingle(),
    supabase.from('order_items').select('*').eq('order_id', orderId),
  ])
  const o = orderRes.data
  const itemsData = itemsRes.data ?? []
  if (!o) return { order: null, items: [], allTicketTypes: [] }

  let allTicketTypes: any[] = []
  let serviceForOrder: any = null

  if (itemsData.length > 0) {
    const ticketTypeIds = itemsData.map((it: any) => it.ticket_type_id)
    // Wave 2: ticket types for items (needed before we can fetch service + all ticket types)
    const { data: tts } = await supabase.from('ticket_types').select('*').in('id', ticketTypeIds)
    const ttMap: any = {}
    ;(tts || []).forEach((t: any) => { ttMap[t.id] = t })
    itemsData.forEach((it: any) => { it.ticket_type = ttMap[it.ticket_type_id] || null })

    const firstWithService = (tts || []).find((t: any) => t && t.service_id)
    if (firstWithService?.service_id) {
      const serviceId = firstWithService.service_id
      // Wave 3: service and all ticket types for that service in parallel
      const [serviceRes, allTtsRes] = await Promise.all([
        supabase.from('services').select('*').eq('id', serviceId).maybeSingle(),
        supabase.from('ticket_types').select('*').eq('service_id', serviceId),
      ])
      serviceForOrder = serviceRes.data ?? null
      allTicketTypes = allTtsRes.data ?? []
    }
  }

  const orderWithService = { ...o, _service: serviceForOrder }
  return { order: orderWithService, items: itemsData, allTicketTypes }
}

export const orderQueryKey = (orderId: string | undefined) => ['order', orderId ?? ''] as const

export function useOrderQuery(orderId: string | undefined) {
  return useQuery({
    queryKey: orderQueryKey(orderId),
    queryFn: () => fetchOrderForCheckout(orderId!),
    enabled: !!orderId,
  })
}

export function useOrderQueryClient() {
  return useQueryClient()
}
