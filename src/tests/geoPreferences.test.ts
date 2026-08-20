import { describe, expect, it } from 'vitest'
import {
  detectGeoPreferences,
  languageFromNavigator,
  parseCloudflareTraceLoc,
  preferencesFromCountryCode,
  regionFromLocale,
  regionFromTimeZone,
} from '../lib/geoPreferences'
import { translate } from '../i18n/translations'

describe('geoPreferences', () => {
  it('maps Kampala timezone to UGX', () => {
    expect(
      detectGeoPreferences({ timeZone: 'Africa/Kampala', languages: ['en-US'] })
    ).toEqual({ region: 'UG', currency: 'UGX', language: 'en' })
  })

  it('maps New York timezone to USD even when browser language is en-GB', () => {
    expect(
      detectGeoPreferences({ timeZone: 'America/New_York', languages: ['en-GB'] })
    ).toEqual({ region: 'US', currency: 'USD', language: 'en' })
  })

  it('maps Paris timezone to EUR and French chrome language', () => {
    expect(
      detectGeoPreferences({ timeZone: 'Europe/Paris', languages: ['fr-FR'] })
    ).toEqual({ region: 'FR', currency: 'EUR', language: 'fr' })
  })

  it('maps Lisbon timezone to EUR and Portuguese chrome language', () => {
    expect(
      detectGeoPreferences({ timeZone: 'Europe/Lisbon', languages: ['pt-PT'] })
    ).toEqual({ region: 'PT', currency: 'EUR', language: 'pt' })
  })

  it('falls back from locale region when timezone is unknown', () => {
    expect(
      detectGeoPreferences({ timeZone: 'Etc/Unknown', languages: ['en-GB'] })
    ).toEqual({ region: 'GB', currency: 'GBP', language: 'en' })
  })

  it('uses Canada French region when locale is fr-CA', () => {
    expect(regionFromLocale('fr-CA')).toBe('CA-FR')
    expect(
      detectGeoPreferences({ timeZone: 'America/Toronto', languages: ['fr-CA'] })
    ).toEqual({ region: 'CA-FR', currency: 'CAD', language: 'fr' })
  })

  it('parses language and locale helpers', () => {
    expect(languageFromNavigator('pt-BR')).toBe('pt')
    expect(languageFromNavigator('de-DE')).toBe('en')
    expect(regionFromTimeZone('Africa/Nairobi')).toBe('KE')
    expect(regionFromLocale('en-US')).toBe('US')
  })

  it('maps ISO country codes to display currency without changing language', () => {
    expect(preferencesFromCountryCode('US', 'en')).toEqual({ region: 'US', currency: 'USD', language: 'en' })
    expect(preferencesFromCountryCode('FR', 'fr')).toEqual({ region: 'FR', currency: 'EUR', language: 'fr' })
    expect(preferencesFromCountryCode('ZZ', 'en')).toBeNull()
  })

  it('parses Cloudflare trace loc= lines', () => {
    expect(parseCloudflareTraceLoc('ip=1.1.1.1\nloc=GB\ntls=TLSv1.3\n')).toBe('GB')
    expect(parseCloudflareTraceLoc('loc=XX\n')).toBeNull()
  })
})

describe('translations', () => {
  it('returns French chrome copy and falls unknown langs to English', () => {
    expect(translate('fr', 'currency_region')).toBe('Devise et région')
    expect(translate('pt', 'bookings')).toBe('Reservas')
    expect(translate('fr', 'pay_with_card')).toBe('Payer {{amount}} par carte')
    expect(translate('de', 'home')).toBe('Home')
    expect(translate('en', 'missing_key')).toBe('')
  })
})
