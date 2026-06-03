import { supabase } from '../lib/supabaseClient'
import { executeWithCircuitBreaker } from '../lib/concurrency'
import { creditWallet } from '../lib/creditWallet'
import { getAdminProfileId } from './PartnerRepository'
import { addTransaction } from './WalletRepository'
import { createBooking } from './BookingRepository'

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

export async function confirmOrderAndIssueTickets(orderId: string, payment: { vendor_id: string; tourist_id?: string; amount: number; currency: string; payment_method: string; reference?: string }) {
  return executeWithCircuitBreaker(async () => {
    // Mark order as paid
    const { data: order, error: orderError } = await supabase.from('orders').update({ status: 'paid', reference: payment.reference, updated_at: new Date().toISOString() }).eq('id', orderId).select().single()
    if (orderError) throw orderError

    // Use vendor_payout and platform_fee from the order (authoritative source)
    const vendorPayoutAmount = Number(order.vendor_payout || 0) || payment.amount
    const platformFeeAmount = Number(order.platform_fee || 0)
    const adminId = await getAdminProfileId();
    // commission = platform fee from order only (no synthetic % if missing)
    const commissionAmount = Math.max(0, platformFeeAmount)

    const txRef = payment.reference || `TKT_${orderId.slice(0,8)}_${Date.now()}`

    if (!adminId) {
      console.warn('Admin profile not found - processing ticket payment without commission');
      try {
        await addTransaction({
          booking_id: undefined as any,
          vendor_id: payment.vendor_id,
          tourist_id: payment.tourist_id,
          amount: vendorPayoutAmount,
          currency: payment.currency,
          transaction_type: 'payment',
          status: 'completed',
          payment_method: payment.payment_method as any,
          reference: txRef
        })
        await creditWallet(payment.vendor_id, vendorPayoutAmount, payment.currency)
      } catch (txErr) {
        console.warn('Failed to add transaction for ticket order:', txErr)
      }
    } else {
      // Use atomic payment processing with commission deduction
      const { data: paymentResult, error: paymentError } = await supabase.rpc('process_payment_with_commission', {
        p_vendor_id: payment.vendor_id,
        p_total_amount: payment.amount,
        p_commission_amount: commissionAmount,
        p_admin_id: adminId,
        p_booking_id: null,
        p_tourist_id: payment.tourist_id || null,
        p_currency: payment.currency || 'UGX',
        p_payment_method: payment.payment_method,
        p_reference: txRef
      });

      if (paymentError || !paymentResult?.success) {
        console.error('Error processing ticket payment with commission:', paymentError || paymentResult?.error);
        // Fallback: create transaction with vendor net amount, credit wallets correctly
        try {
          const transactionId = await addTransaction({
            booking_id: undefined as any,
            vendor_id: payment.vendor_id,
            tourist_id: payment.tourist_id,
            amount: vendorPayoutAmount,
            currency: payment.currency,
            transaction_type: 'payment',
            status: 'completed',
            payment_method: payment.payment_method as any,
            reference: txRef
          })
          await creditWallet(payment.vendor_id, vendorPayoutAmount, payment.currency)
          if (adminId && commissionAmount > 0) {
            await creditWallet(adminId, commissionAmount, payment.currency)
          }
          console.log('Fallback ticket payment processed:', { transactionId, vendorPayoutAmount, commissionAmount })
        } catch (txErr) {
          console.warn('Failed to add fallback ticket transaction:', txErr)
        }
      } else {
        console.log('Successfully processed ticket payment with commission:', {
          total_amount: payment.amount,
          vendor_payout: vendorPayoutAmount,
          commission_amount: commissionAmount
        });
      }
    }

    // Load order items with ticket type information
    const { data: items, error: itemsError } = await supabase.from('order_items').select('*, ticket_types(*)').eq('order_id', orderId)
    if (itemsError) throw itemsError

    const createdTickets: any[] = []


    // This ensures a booking ID exists for ticket purchases
    const bookingMap: Record<string, string> = {}
    try {
      // Group items by service_id to create bookings
      const groups: Record<string, { qty: number; total: number }> = {}
      for (const it of items || []) {
        const sid = it.ticket_types?.service_id
        if (!sid) continue
        groups[sid] = groups[sid] || { qty: 0, total: 0 }
        groups[sid].qty += it.quantity
        groups[sid].total += (it.unit_price || 0) * it.quantity
      }

      for (const sid of Object.keys(groups)) {
        try {
          const booking = await createBooking({
            service_id: sid,
            booking_date: new Date().toISOString(),
            service_date: new Date().toISOString(),
            guests: groups[sid].qty,
            total_amount: groups[sid].total,
            pricing_base_amount: groups[sid].total,
            currency: order.currency,
            status: 'confirmed',
            payment_status: 'paid',
            tourist_id: payment.tourist_id || undefined,
            // For guest bookings, try to get info from order if available, otherwise leave as undefined
            guest_name: !payment.tourist_id ? (order as any).guest_name || null : undefined,
            guest_email: !payment.tourist_id ? (order as any).guest_email || null : undefined,
            guest_phone: !payment.tourist_id ? (order as any).guest_phone || null : undefined
          })
          if (booking && booking.id) bookingMap[sid] = booking.id
        } catch (bkErr) {
          // Log but don't fail ticket issuance if booking creation fails
          console.warn('Failed to create booking for ticket order service', sid, bkErr)
        }
      }
    } catch (err) {
      console.error('Error creating bookings for ticket order:', err)
    }

    // Use atomic ticket booking function for each ticket type
    for (const it of items || []) {
      try {
        const { data, error } = await supabase.rpc('book_tickets_atomic', {
          p_ticket_type_id: it.ticket_type_id,
          p_quantity: it.quantity,
          p_order_id: orderId
        })

        if (error) {
          console.error('Failed to book tickets atomically:', error)
          throw new Error(`Failed to book tickets: ${error.message}`)
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Failed to book tickets')
        }

        console.log(`Successfully booked ${data.tickets_created} tickets for type ${it.ticket_type_id}`)
      } catch (atomicError) {
        console.error('Atomic booking failed, falling back to individual ticket creation:', atomicError)

        // Fallback to individual ticket creation if atomic function fails
        for (let i = 0; i < it.quantity; i++) {
          const code = `TKT-${Math.random().toString(36).slice(2,10).toUpperCase()}`
          try {
            const { data: ticket, error: ticketError } = await supabase.from('tickets').insert([{
              order_id: orderId,
              ticket_type_id: it.ticket_type_id,
              service_id: it.ticket_types.service_id,
              owner_id: order.user_id || null,
              code,
              qr_data: code,
              status: 'issued'
            }]).select().single()

            if (ticketError) {
              console.error('Failed to create individual ticket:', ticketError)
              continue
            }
            createdTickets.push(ticket)
          } catch (indError) {
            console.error('Exception creating individual ticket:', indError)
          }
        }

        // increment sold count (non-atomically as fallback)
        try {
          await supabase.from('ticket_types').update({ sold: (it.quantity) }).eq('id', it.ticket_type_id)
        } catch (incErr) {
          console.warn('Failed to increment sold count:', incErr)
        }
      }
    }

    // Fetch all tickets created for this order
    const { data: allTickets, error: fetchError } = await supabase
      .from('tickets')
      .select('*, ticket_types(*), orders(*)')
      .eq('order_id', orderId)

    if (!fetchError && allTickets) {
      createdTickets.push(...allTickets)
    }

    return { order, tickets: createdTickets }
  }, 'confirmOrderAndIssueTickets')
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
