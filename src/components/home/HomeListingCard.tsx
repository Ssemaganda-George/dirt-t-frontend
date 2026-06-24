import { useState, useEffect } from 'react'
import { getServiceAverageRating, getTicketTypes } from '../../lib/database'
import { getDisplayPrice } from '../../lib/utils'
import { usePreferences } from '../../contexts/PreferencesContext'
import SaveToCartHeartButton from '../SaveToCartHeartButton'
import Money from '../Money'
import type { Service } from '../../types'
import { DEFAULT_DESTINATION_IMAGE } from '../../lib/destinationImages'

interface HomeListingCardProps {
  service: Service
  onClick: () => void
}

function getRatingLabel(score: number): string {
  if (score >= 9) return 'Wonderful'
  if (score >= 8) return 'Excellent'
  if (score >= 7) return 'Very good'
  if (score >= 6) return 'Pleasant'
  return 'Review score'
}

function getLocationLine(service: Service): string {
  const categoryName = service.service_categories?.name?.toLowerCase()
  const isEventOrActivity = categoryName === 'activities' || categoryName === 'events'
  const isTour = categoryName === 'tour_packages' || categoryName === 'tours'

  if (isEventOrActivity) {
    return service.event_location || service.location || 'Location TBA'
  }
  if (isTour) {
    return service.meeting_point || service.location || 'Location TBA'
  }
  return service.location || 'Location TBA'
}

function getUnitLabel(categoryName?: string): string {
  const name = (categoryName || '').toLowerCase()
  if (name === 'transport') return 'per day'
  if (['hotels', 'hotel', 'accommodation'].includes(name)) return 'per night'
  if (name === 'shops') return 'per item'
  if (name === 'restaurants') return 'per meal'
  if (name === 'events' || name === 'activities') return 'per ticket'
  if (name === 'tour_packages' || name === 'tours') return 'per guest'
  return 'per person'
}

export default function HomeListingCard({ service, onClick }: HomeListingCardProps) {
  const [rating, setRating] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [localTicketTypes, setLocalTicketTypes] = useState<any[]>(service.ticket_types || [])
  const { selectedCurrency, selectedLanguage } = usePreferences()

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const ratingData = await getServiceAverageRating(service.id)
        if (!mounted) return
        setRating(ratingData.average || 0)
        setReviewCount(ratingData.count || 0)
      } catch {
        if (!mounted) return
        setRating(0)
        setReviewCount(0)
      }
    })()
    return () => { mounted = false }
  }, [service.id])

  useEffect(() => {
    let mounted = true
    if ((!service.ticket_types || service.ticket_types.length === 0) && service.id) {
      void (async () => {
        try {
          const types = await getTicketTypes(service.id)
          if (mounted && Array.isArray(types) && types.length > 0) setLocalTicketTypes(types)
        } catch {
          // ignore
        }
      })()
    }
    return () => { mounted = false }
  }, [service.id, service.ticket_types])

  const imageUrl = service.images?.[0] || DEFAULT_DESTINATION_IMAGE
  const locationLine = getLocationLine(service)
  const categoryName = service.service_categories?.name?.toLowerCase()
  const isShop = categoryName === 'shops' || service.category_id === 'cat_shops'
  const buyPrice = Number((service as any)?.buy_price ?? (isShop ? service.price : NaN) ?? NaN)
  const rentPrice = Number((service as any)?.rental_price_per_day ?? NaN)
  const hasBuy = Number.isFinite(buyPrice) && buyPrice > 0
  const hasRent = Number.isFinite(rentPrice) && rentPrice > 0
  const shopLabel = isShop
    ? hasBuy && hasRent
      ? 'Buy or Hire'
      : hasBuy
      ? 'Buy'
      : hasRent
      ? 'Hire'
      : ''
    : ''
  const displayPrice = getDisplayPrice(
    service,
    localTicketTypes.length > 0 ? localTicketTypes : undefined
  )
  const effectiveUnitLabel = isShop
    ? (hasRent && (!hasBuy || rentPrice <= buyPrice) ? 'per day' : 'per item')
    : getUnitLabel(service.service_categories?.name)

  return (
    <article
      onClick={onClick}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          loading="lazy"
          decoding="async"
          src={imageUrl}
          alt={service.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <SaveToCartHeartButton service={service} ticketTypes={localTicketTypes} />
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-gray-900">
          {service.title}
          {service.category_id === 'cat_transport' && service.vehicle_capacity != null && (
            <span className="font-normal text-gray-600">
              {' '}({service.vehicle_capacity} {service.vehicle_capacity === 1 ? 'seat' : 'seats'})
            </span>
          )}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-gray-600">{locationLine}</p>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            {rating > 0 ? (
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 rounded-sm bg-emerald-700 px-1.5 py-1 text-xs font-bold leading-none text-white">
                  {rating.toFixed(1)}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900">{getRatingLabel(rating)}</p>
                  <p className="text-xs text-gray-500">
                    {reviewCount.toLocaleString()} {reviewCount === 1 ? 'review' : 'reviews'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">No reviews yet</p>
            )}
          </div>

          <div className="flex-shrink-0 text-right">
            <div className="flex flex-col items-end gap-1">
              {shopLabel ? (
                <span className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                  {shopLabel}
                </span>
              ) : null}
              <span className="text-[10px] leading-none text-gray-500">Starting from</span>
            </div>
            <div className="mt-1 text-sm font-bold leading-none text-gray-900">
              <Money
                amount={displayPrice}
                serviceCurrency={service.currency}
                targetCurrency={selectedCurrency || 'UGX'}
                locale={selectedLanguage || 'en-US'}
                className="inline text-sm font-bold text-gray-900"
                currencyClassName="text-[10px] font-normal text-gray-600 mr-0.5"
                amountClassName="text-sm font-bold text-gray-900"
              />
            </div>
            <p className="mt-0.5 text-[10px] text-gray-500">{effectiveUnitLabel}</p>
          </div>
        </div>
      </div>
    </article>
  )
}
