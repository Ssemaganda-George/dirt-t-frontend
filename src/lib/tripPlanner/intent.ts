import type { TripRequest } from './types'

const COUNTRIES = ['Tanzania', 'Kenya', 'Uganda', 'Zanzibar', 'Rwanda']

export function daysFromStatement(text: string, fallback = 0): number {
  const match = text.match(/(\d+)\s*-?\s*days?\b/i)
  if (!match) return fallback
  return Math.max(1, Math.min(30, Number(match[1])))
}

export function countriesFromStatement(text: string): string[] {
  const hay = text.toLowerCase()
  return COUNTRIES.filter((country) => hay.includes(country.toLowerCase()))
}

export function requestFromStatement(statement: string): TripRequest {
  const extra_info = statement.trim().slice(0, 1000)
  return {
    countries: countriesFromStatement(extra_info),
    activities: [],
    days: daysFromStatement(extra_info),
    start_date: null,
    adults: 1,
    children: 0,
    extra_info,
  }
}
