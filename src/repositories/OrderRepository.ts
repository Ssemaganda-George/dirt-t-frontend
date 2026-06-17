import { supabase } from '../lib/supabaseClient'
import { executeWithCircuitBreaker } from '../lib/concurrency'

// Ticketing helpers for event management
export async function createTicketType(serviceId: string, payload: { title: string; description?: string; price: number; quantity: number; metadata?: any; sale_start?: string; sale_end?: string }) {
  try {
    const { data, error } = await supabase.from('ticket_types').insert([{
      service_id: serviceId,
      title: payload.title,
      description: payload.description,
      price: payload.price,
      quantity: payload.quantity,
      metadata: payload.metadata,
      sale_start: payload.sale_start,
      sale_end: payload.sale_end
    }]).select().single()
    if (error) throw error
    return data
  } catch (err) {
    console.error('Error creating ticket type:', err)
    throw err
  }
}

export async function getTicketTypes(serviceId: string) {
  try {
    const { data, error } = await supabase.from('ticket_types').select('*').eq('service_id', serviceId)
    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error fetching ticket types:', err)
    throw err
  }
}

export async function updateTicketType(ticketTypeId: string, payload: { title?: string; description?: string; price?: number; quantity?: number; metadata?: any; sale_start?: string; sale_end?: string }) {
  try {
    const { data, error } = await supabase.from('ticket_types').update({
      title: payload.title,
      description: payload.description,
      price: payload.price,
      quantity: payload.quantity,
      metadata: payload.metadata,
      sale_start: payload.sale_start,
      sale_end: payload.sale_end
    }).eq('id', ticketTypeId).select().single()
    if (error) throw error
    return data
  } catch (err) {
    console.error('Error updating ticket type:', err)
    throw err
  }
}

export async function deleteTicketType(ticketTypeId: string) {
  try {
    const { error } = await supabase.from('ticket_types').delete().eq('id', ticketTypeId)
    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('Error deleting ticket type:', err)
    throw err
  }
}

export async function createOrder(userId: string | null, vendorId: string | null, items: { ticket_type_id: string; quantity: number; unit_price: number }[], currency = 'UGX') {
  try {
    const total = items.reduce((s, it) => s + (it.unit_price * it.quantity), 0)

    const { data: order, error: orderError } = await supabase.from('orders').insert([{ user_id: userId, vendor_id: vendorId, total_amount: total, currency, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]).select().single()
    if (orderError) throw orderError

    const orderItems = items.map(it => ({ order_id: order.id, ticket_type_id: it.ticket_type_id, quantity: it.quantity, unit_price: it.unit_price, total_price: it.unit_price * it.quantity }))
    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
    if (itemsError) throw itemsError

    return order
  } catch (err) {
    console.error('Error creating order:', err)
    throw err
  }
}

export async function confirmOrderAndIssueTickets(
  _orderId: string,
  _payment: {
    vendor_id: string
    tourist_id?: string
    amount: number
    currency: string
    payment_method: string
    reference?: string
  },
) {
  throw new Error(
    'confirmOrderAndIssueTickets is retired. Paid orders settle via the payment fulfillment queue (order_fulfillment jobs).',
  )
}

export async function getAvailableTickets(ticketTypeId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_available_tickets', {
      p_ticket_type_id: ticketTypeId
    })

    if (error) {
      console.error('Error getting available tickets:', error)
      // Fallback to manual calculation
      const { data: ticketType, error: fetchError } = await supabase
        .from('ticket_types')
        .select('quantity, sold')
        .eq('id', ticketTypeId)
        .single()

      if (fetchError || !ticketType) {
        console.error('Error fetching ticket type for fallback:', fetchError)
        return 0
      }

      return Math.max(0, ticketType.quantity - ticketType.sold)
    }

    return data || 0
  } catch (err) {
    console.error('Exception getting available tickets:', err)
    return 0
  }
}

export async function markTicketUsed(ticketId: string, usedAt?: string) {
  try {
    const { data, error } = await supabase.from('tickets').update({ status: 'used', used_at: usedAt || new Date().toISOString() }).eq('id', ticketId).select().single()
    if (error) throw error
    return data
  } catch (err) {
    console.error('Error marking ticket used:', err)
    throw err
  }
}

export async function verifyTicketByCode(code: string, serviceId?: string) {
  return executeWithCircuitBreaker(async () => {
    console.log('Verifying ticket with code:', code, 'for service:', serviceId)

    // Use atomic verification function
    const { data: result, error } = await supabase.rpc('verify_and_use_ticket_atomic', {
      p_ticket_code: code,
      p_service_id: serviceId || null
    })

    if (error) {
      console.error('Database error in atomic verification:', error)
      throw error
    }

    console.log('Atomic verification result:', result)

    if (!result?.success) {
      return {
        valid: false,
        ticket: null,
        message: result?.error || 'Invalid ticket'
      }
    }

    // Fetch full ticket details for the response
    let ticketDetails = null;
    let fetchError = null;

    if (result.ticket_id) {
      // Try to fetch by ticket_id (preferred for new verifications)
      const ticketResult = await supabase
        .from('tickets')
        .select(`
          *,
          ticket_types(*),
          orders(*),
          services(id, title, vendor_id)
        `)
        .eq('id', result.ticket_id)
        .single();
      ticketDetails = ticketResult.data;
      fetchError = ticketResult.error;
    }

    if (!ticketDetails && !fetchError) {
      // Fallback: try to fetch by code (for already used tickets where ticket_id might not be returned)
      console.log('Fetching ticket details by code as fallback');
      const ticketResult = await supabase
        .from('tickets')
        .select(`
          *,
          ticket_types(*),
          orders(*),
          services(id, title, vendor_id)
        `)
        .eq('code', code)
        .single();
      ticketDetails = ticketResult.data;
      fetchError = ticketResult.error;
    }

    if (fetchError) {
      console.error('Error fetching ticket details:', fetchError)
      // Still return success but with minimal info using the code that was verified
      return {
        valid: true,
        ticket: {
          id: result.ticket_id || 'unknown',
          code: code, // Use the code that was successfully verified
          status: 'used',
          used_at: result.used_at || new Date().toISOString(),
          ticket_types: { title: 'Ticket' } // Default type
        },
        already_used: result.already_used,
        message: result.already_used ? 'Ticket verified (previously used)' : 'Ticket verified successfully'
      }
    }

    console.log('Ticket verified successfully via atomic function')
    return {
      valid: true,
      ticket: ticketDetails,
      already_used: result.already_used,
      message: result.already_used ? 'Ticket verified (previously used)' : 'Ticket verified successfully'
    }
  }, 'verifyTicketByCode').catch(async (err: any) => {
    console.error('Error in atomic ticket verification:', err)

    // Fallback to non-atomic verification if atomic function fails
    console.log('Falling back to non-atomic verification')
    return executeWithCircuitBreaker(async () => {
      // Find ticket by code or qr_data
      const { data: ticket, error } = await supabase
        .from('tickets')
        .select(`
          *,
          ticket_types(*),
          orders(*),
          services(id, title, vendor_id)
        `)
        .or(`code.eq.${code},qr_data.eq.${code}`)
        .single()

      if (error) {
        console.error('Database error in fallback:', error)
        if (error.code === 'PGRST116') { // No rows returned
          throw new Error('Ticket not found')
        }
        throw error
      }

      if (!ticket) {
        throw new Error('Ticket not found')
      }

      console.log('Found ticket in fallback:', {
        id: ticket.id,
        code: ticket.code,
        qr_data: ticket.qr_data,
        status: ticket.status,
        service_id: ticket.service_id,
        order_status: ticket.orders?.status,
        order_id: ticket.order_id
      })

      // Check if ticket is paid/active - be more flexible with status
      // For verification purposes, we allow checking used tickets (verification != usage)
      if (ticket.status !== 'active' && ticket.status !== 'confirmed' && ticket.status !== 'paid' && ticket.status !== 'issued' && ticket.status !== 'used') {
        console.log('Ticket status is:', ticket.status, '- rejecting')
        throw new Error(`Ticket status is ${ticket.status}, not valid`)
      }

      // Check if ticket belongs to the specified service (if provided)
      if (serviceId && ticket.service_id !== serviceId) {
        console.log('Ticket service_id:', ticket.service_id, 'does not match event service_id:', serviceId)
        throw new Error('Ticket does not belong to this event')
      }

      // Check if order is paid - be more flexible with order status
      if (ticket.orders?.status !== 'paid' && ticket.orders?.status !== 'completed' && ticket.orders?.status !== 'confirmed') {
        console.log('Order status is:', ticket.orders?.status, '- rejecting')
        throw new Error(`Order status is ${ticket.orders?.status}, not paid`)
      }

      // Try to mark as used (non-atomically as fallback)
      if (ticket.status !== 'used') {
        try {
          await markTicketUsed(ticket.id)
          console.log('Ticket marked as used in fallback')
        } catch (markError) {
          console.error('Error marking ticket as used in fallback:', markError)
          // Don't fail verification if marking fails
        }
      }

      console.log('Ticket verified successfully via fallback')
      return {
        valid: true,
        ticket: ticket,
        already_used: !!ticket.used_at,
        message: ticket.used_at ? 'Ticket verified (previously used)' : 'Ticket verified successfully'
      }
    }, 'verifyTicketByCode_fallback').catch((fallbackErr: any) => {
      console.error('Fallback verification also failed:', fallbackErr)
      return {
        valid: false,
        ticket: null,
        message: fallbackErr instanceof Error ? fallbackErr.message : 'Invalid ticket'
      }
    })
  })
}

export async function getOrdersByUser(userId: string) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, ticket_types(*)), tickets(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error fetching orders by user:', err)
    throw err
  }
}

export async function getOrdersByVendor(vendorId: string) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, ticket_types(*)), tickets(*)')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error fetching orders by vendor:', err)
    throw err
  }
}

export async function getOrder(orderId: string) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, ticket_types(*)), tickets(*)')
      .eq('id', orderId)
      .single()
    if (error) throw error
    return data
  } catch (err) {
    console.error('Error fetching order:', err)
    throw err
  }
}

export async function scanTicket(ticketCode: string, serviceId?: string) {
  return verifyTicketByCode(ticketCode, serviceId)
}
