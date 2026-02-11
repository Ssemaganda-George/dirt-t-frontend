import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getServiceBySlug,
  getServiceById,
  getTicketTypes,
  getServiceReviews,
  getServiceAverageRating,
} from '../lib/database'

export type ServiceDetailQueryData = {
  service: Awaited<ReturnType<typeof getServiceBySlug>> | Awaited<ReturnType<typeof getServiceById>>
  reviews: Awaited<ReturnType<typeof getServiceReviews>>
  ratingData: Awaited<ReturnType<typeof getServiceAverageRating>>
  ticketTypes: Awaited<ReturnType<typeof getTicketTypes>>
}

async function fetchServiceDetail(slug: string): Promise<ServiceDetailQueryData> {
  let service = await getServiceBySlug(slug)
  if (!service) service = await getServiceById(slug)

  if (!service) {
    return {
      service: null,
      reviews: [],
      ratingData: { average: 0, count: 0 },
      ticketTypes: [],
    }
  }

  const category = service.service_categories?.name?.toLowerCase()
  const isActivitiesOrEvents =
    category === 'activities' || category === 'events'

  const [reviews, ratingData, ticketTypes] = await Promise.all([
    getServiceReviews(service.id),
    getServiceAverageRating(service.id),
    isActivitiesOrEvents ? getTicketTypes(service.id) : Promise.resolve([]),
  ])

  return {
    service,
    reviews: reviews || [],
    ratingData: ratingData || { average: 0, count: 0 },
    ticketTypes: ticketTypes || [],
  }
}

export const serviceDetailQueryKey = (slug: string | undefined) =>
  ['service', slug ?? ''] as const

export function useServiceDetailQuery(slug: string | undefined) {
  return useQuery({
    queryKey: serviceDetailQueryKey(slug),
    queryFn: () => fetchServiceDetail(slug!),
    enabled: !!slug,
  })
}

export function useServiceDetailQueryClient() {
  return useQueryClient()
}
