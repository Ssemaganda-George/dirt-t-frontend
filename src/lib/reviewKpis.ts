/**
 * Category-specific KPI (Key Performance Indicator) definitions for reviews.
 * Each service category has its own set of rating dimensions.
 * Icons use Lucide React components via getKpiIcon().
 */

import {
  Sparkles,
  CheckCircle2,
  KeyRound,
  MessageCircle,
  MapPin,
  BadgeDollarSign,
  UtensilsCrossed,
  Handshake,
  Lamp,
  Brain,
  ClipboardList,
  ShieldCheck,
  PartyPopper,
  Car,
  Timer,
  Armchair,
  Mic2,
  ShoppingBag,
  Package,
  Smile,
  Award,
  type LucideIcon,
} from 'lucide-react'

export interface ReviewKpi {
  key: string
  label: string
}

export type KpiRatings = Record<string, number>

/**
 * Map each KPI key to its corresponding Lucide icon component.
 */
const kpiIconMap: Record<string, LucideIcon> = {
  cleanliness: Sparkles,
  accuracy: CheckCircle2,
  check_in: KeyRound,
  communication: MessageCircle,
  location: MapPin,
  value: BadgeDollarSign,
  food_quality: UtensilsCrossed,
  service: Handshake,
  ambiance: Lamp,
  guide_knowledge: Brain,
  organization: ClipboardList,
  safety: ShieldCheck,
  fun_factor: PartyPopper,
  vehicle_condition: Car,
  punctuality: Timer,
  driver_service: Handshake,
  comfort: Armchair,
  experience: Award,
  instructor: Mic2,
  staff_service: Handshake,
  product_quality: ShoppingBag,
  variety: Package,
  staff_friendliness: Smile,
  quality: Award,
}

/**
 * Get the Lucide icon component for a given KPI key.
 * Falls back to Award if no match.
 */
export function getKpiIcon(kpiKey: string): LucideIcon {
  return kpiIconMap[kpiKey] || Award
}

/**
 * Get the KPIs for a given service category name.
 * Returns a default set for unknown categories.
 */
export function getKpisForCategory(categoryName: string): ReviewKpi[] {
  const normalized = categoryName?.toLowerCase()?.trim() || ''

  switch (normalized) {
    case 'hotels':
    case 'hotel':
    case 'accommodation':
      return [
        { key: 'cleanliness', label: 'Cleanliness' },
        { key: 'accuracy', label: 'Accuracy' },
        { key: 'check_in', label: 'Check-in' },
        { key: 'communication', label: 'Communication' },
        { key: 'location', label: 'Location' },
        { key: 'value', label: 'Value' },
      ]

    case 'restaurants':
    case 'restaurant':
    case 'dining':
      return [
        { key: 'food_quality', label: 'Food Quality' },
        { key: 'service', label: 'Service' },
        { key: 'ambiance', label: 'Ambiance' },
        { key: 'punctuality', label: 'Punctuality' },
        { key: 'value', label: 'Value' },
        { key: 'cleanliness', label: 'Cleanliness' },
      ]

    case 'tours':
    case 'tour':
    case 'guided tour':
      return [
        { key: 'guide_knowledge', label: 'Guide Knowledge' },
        { key: 'organization', label: 'Organization' },
        { key: 'safety', label: 'Safety' },
        { key: 'value', label: 'Value' },
        { key: 'fun_factor', label: 'Fun Factor' },
      ]

    case 'transport':
    case 'transportation':
    case 'car rental':
      return [
        { key: 'vehicle_condition', label: 'Vehicle Condition' },
        { key: 'punctuality', label: 'Punctuality' },
        { key: 'driver_service', label: 'Driver / Service' },
        { key: 'comfort', label: 'Comfort' },
        { key: 'value', label: 'Value' },
      ]

    case 'activities':
    case 'activity':
    case 'experience':
    case 'events':
    case 'event':
      return [
        { key: 'experience', label: 'Experience' },
        { key: 'organization', label: 'Organization' },
        { key: 'safety', label: 'Safety' },
        { key: 'punctuality', label: 'Punctuality' },
        { key: 'instructor', label: 'Instructor / Host' },
        { key: 'value', label: 'Value' },
      ]

    case 'flights':
    case 'flight':
    case 'air travel':
      return [
        { key: 'comfort', label: 'Comfort' },
        { key: 'punctuality', label: 'Punctuality' },
        { key: 'staff_service', label: 'Staff Service' },
        { key: 'value', label: 'Value' },
      ]

    case 'shops':
    case 'shop':
    case 'shopping':
      return [
        { key: 'product_quality', label: 'Product Quality' },
        { key: 'staff_friendliness', label: 'Staff Friendliness' },
        { key: 'punctuality', label: 'Punctuality' },
        { key: 'value', label: 'Value' },
      ]

    default:
      return [
        { key: 'quality', label: 'Quality' },
        { key: 'service', label: 'Service' },
        { key: 'value', label: 'Value' },
      ]
  }
}

/**
 * Calculate the overall rating as the average of KPI ratings.
 */
export function calculateOverallFromKpis(kpiRatings: KpiRatings): number {
  const values = Object.values(kpiRatings).filter(v => v > 0)
  if (values.length === 0) return 0
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length
  return Math.round(avg * 10) / 10
}

/**
 * Calculate KPI averages from an array of reviews that have kpi_ratings.
 */
export function calculateKpiAverages(
  reviews: Array<{ kpi_ratings?: KpiRatings | null }>,
  categoryKpis: ReviewKpi[]
): Record<string, { average: number; count: number }> {
  const result: Record<string, { total: number; count: number }> = {}

  for (const kpi of categoryKpis) {
    result[kpi.key] = { total: 0, count: 0 }
  }

  for (const review of reviews) {
    if (!review.kpi_ratings) continue
    for (const kpi of categoryKpis) {
      const val = review.kpi_ratings[kpi.key]
      if (val && val > 0) {
        result[kpi.key].total += val
        result[kpi.key].count += 1
      }
    }
  }

  const averages: Record<string, { average: number; count: number }> = {}
  for (const kpi of categoryKpis) {
    const { total, count } = result[kpi.key]
    averages[kpi.key] = {
      average: count > 0 ? Math.round((total / count) * 10) / 10 : 0,
      count,
    }
  }

  return averages
}
