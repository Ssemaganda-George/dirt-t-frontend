export type AdminCountryStat = {
  country: string
  count: number
  percentage: string | number
}

export type AdminLikedService = {
  id: string
  serviceName: string
  category: string
  totalLikes: number
  avgRating: number
}

export type AdminReviewStat = {
  id: string
  serviceName: string
  rating: number
  comment: string
  visitorName: string
  date: string
  helpful: number
}

export type AdminVisitorStats = {
  totalVisitors: number
  uniqueVisitors: number
  avgSessionDuration: number
  bounceRate: number
  topCountries: AdminCountryStat[]
  ageGroups: Array<{ ageGroup: string; count: number; percentage: string | number }>
  genderDistribution: { male: number; female: number; other: number }
  topLikedServices: AdminLikedService[]
  recentReviews: AdminReviewStat[]
  reviewsThisMonth: number
  avgRating: number
}

export type AdminVisitorStatsPayload = {
  totalVisitors?: number
  uniqueVisitors?: number
  avgSessionDuration?: number
  bounceRate?: number
  topCountries?: AdminCountryStat[]
  topLikedServices?: AdminLikedService[]
  recentReviews?: AdminReviewStat[]
  reviewsThisMonth?: number
  avgRating?: number
}

export const emptyAdminVisitorStats: AdminVisitorStats = {
  totalVisitors: 0,
  uniqueVisitors: 0,
  avgSessionDuration: 0,
  bounceRate: 0,
  topCountries: [],
  ageGroups: [],
  genderDistribution: { male: 0, female: 0, other: 0 },
  topLikedServices: [],
  recentReviews: [],
  reviewsThisMonth: 0,
  avgRating: 0,
}

export function mapAdminVisitorStats(
  payload: AdminVisitorStatsPayload | null | undefined
): AdminVisitorStats {
  if (!payload) return { ...emptyAdminVisitorStats }

  return {
    totalVisitors: Number(payload.totalVisitors) || 0,
    uniqueVisitors: Number(payload.uniqueVisitors) || 0,
    avgSessionDuration: Number(payload.avgSessionDuration) || 0,
    bounceRate: Number(payload.bounceRate) || 0,
    topCountries: Array.isArray(payload.topCountries) ? payload.topCountries : [],
    ageGroups: [],
    genderDistribution: { male: 0, female: 0, other: 0 },
    topLikedServices: Array.isArray(payload.topLikedServices) ? payload.topLikedServices : [],
    recentReviews: Array.isArray(payload.recentReviews) ? payload.recentReviews : [],
    reviewsThisMonth: Number(payload.reviewsThisMonth) || 0,
    avgRating: Number(payload.avgRating) || 0,
  }
}
