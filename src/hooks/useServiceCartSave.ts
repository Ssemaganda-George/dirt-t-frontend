import { useCallback, useMemo } from 'react'
import { useCart } from '../contexts/CartContext'
import { getDisplayPrice } from '../lib/utils'
import type { Service } from '../types'

export function buildDefaultCartBookingData() {
  return {
    date: '',
    checkInDate: '',
    checkOutDate: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    transportZone: '',
    guests: 1,
    rooms: 1,
    roomType: '',
    pickupLocation: '',
    dropoffLocation: '',
    returnTrip: false,
    specialRequests: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    paymentMethod: 'mobile',
  }
}

export function useServiceCartSave(service: Service, ticketTypes?: unknown[]) {
  const { state, addToCart, removeFromCart } = useCart()

  const cartItem = useMemo(
    () => state.items.find(item => item.serviceId === service.id),
    [state.items, service.id]
  )

  const isSaved = Boolean(cartItem)

  const displayPrice = useMemo(
    () => getDisplayPrice(service, ticketTypes),
    [service, ticketTypes]
  )

  const toggleSave = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation()
      e?.preventDefault()
      if (!service?.id) return
      if (isSaved && cartItem) {
        removeFromCart(cartItem.id)
        return
      }

      addToCart({
        serviceId: service.id,
        service,
        bookingData: buildDefaultCartBookingData(),
        category: service.service_categories?.name?.toLowerCase() || 'activities',
        totalPrice: displayPrice,
        currency: service.currency || 'UGX',
      })
    },
    [isSaved, cartItem, removeFromCart, addToCart, service, displayPrice]
  )

  return { isSaved, toggleSave }
}
