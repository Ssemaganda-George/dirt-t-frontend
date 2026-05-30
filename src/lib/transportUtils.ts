export const FUEL_ERROR_PCT = 0.15

export function calculateDays(startDate: string, startTime: string, endDate: string, endTime: string): number {
  if (!startDate || !endDate) return 1
  const startDateTime = new Date(`${startDate}T${startTime}`)
  const endDateTime = new Date(`${endDate}T${endTime}`)
  const diffTime = Math.abs(endDateTime.getTime() - startDateTime.getTime())
  const diffHours = diffTime / (1000 * 60 * 60)
  return Math.ceil(diffHours / 24) || 1
}

export function calculateHours(startDate: string, startTime: string, endDate: string, endTime: string): number {
  if (!startDate || !endDate) return 0
  const start = new Date(`${startDate}T${startTime}`)
  const end = new Date(`${endDate}T${endTime}`)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0
  const diffMs = end.getTime() - start.getTime()
  if (diffMs <= 0) return 0
  return diffMs / (1000 * 60 * 60)
}

export function estimateFuel(
  hours: number,
  avgSpeedKmph: number,
  fuelPer100Km?: number,
  fuelKmPerL?: number,
  errorPct = FUEL_ERROR_PCT,
): { distanceKm: number; liters: number } {
  if (!hours || !avgSpeedKmph) return { distanceKm: 0, liters: 0 }
  const distance = hours * avgSpeedKmph
  let liters = 0
  if (fuelKmPerL && fuelKmPerL > 0) {
    liters = distance / fuelKmPerL
  } else if (fuelPer100Km && fuelPer100Km > 0) {
    liters = (distance * fuelPer100Km) / 100
  }
  return { distanceKm: distance, liters: liters * (1 + (errorPct || 0)) }
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function computeEstimatesFromDistance(
  distanceKm: number,
  avgSpeedKmph: number,
  fuelPer100Km?: number,
  fuelKmPerL?: number,
  errorPct = FUEL_ERROR_PCT,
): { hours: number; liters: number } {
  if (!distanceKm || !avgSpeedKmph) return { hours: 0, liters: 0 }
  const hours = distanceKm / avgSpeedKmph
  let liters = 0
  if (fuelKmPerL && fuelKmPerL > 0) {
    liters = distanceKm / fuelKmPerL
  } else if (fuelPer100Km && fuelPer100Km > 0) {
    liters = (distanceKm * fuelPer100Km) / 100
  }
  return { hours, liters: liters * (1 + (errorPct || 0)) }
}
