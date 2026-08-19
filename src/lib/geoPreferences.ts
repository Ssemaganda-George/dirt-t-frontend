export type ChromeLanguage = 'en' | 'fr' | 'pt'

export type GeoPreferences = {
  region: string
  currency: string
  language: ChromeLanguage
}

export const PREFERENCES_STORAGE_KEY = 'user_preferences'

/** Region codes used by PreferencesModal → ISO 4217 display currency. */
export const CURRENCY_BY_REGION: Record<string, string> = {
  UG: 'UGX',
  US: 'USD',
  GB: 'GBP',
  KE: 'KES',
  TZ: 'TZS',
  RW: 'RWF',
  ZA: 'ZAR',
  NG: 'NGN',
  GH: 'GHS',
  'CA-EN': 'CAD',
  'CA-FR': 'CAD',
  CA: 'CAD',
  AU: 'AUD',
  FR: 'EUR',
  DE: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  PT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  IE: 'EUR',
  AT: 'EUR',
  IN: 'INR',
  SG: 'SGD',
  MY: 'MYR',
  ID: 'IDR',
  BR: 'BRL',
  MX: 'MXN',
  AR: 'ARS',
  EG: 'EGP',
  MA: 'MAD',
  TR: 'TRY',
  TH: 'THB',
  JP: 'JPY',
  KR: 'KRW',
  CN: 'CNY',
  RU: 'RUB',
  CH: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  PL: 'PLN',
  NZ: 'NZD',
  HK: 'HKD',
  AE: 'AED',
  SA: 'SAR',
}

const REGION_BY_TZ: Record<string, string> = {
  'Africa/Kampala': 'UG',
  'Africa/Nairobi': 'KE',
  'Africa/Dar_es_Salaam': 'TZ',
  'Africa/Kigali': 'RW',
  'Africa/Johannesburg': 'ZA',
  'Africa/Lagos': 'NG',
  'Africa/Accra': 'GH',
  'Africa/Cairo': 'EG',
  'Africa/Casablanca': 'MA',
  'Africa/Addis_Ababa': 'ET',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Sao_Paulo': 'BR',
  'America/Mexico_City': 'MX',
  'America/Argentina/Buenos_Aires': 'AR',
  'Europe/London': 'GB',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Lisbon': 'PT',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Dublin': 'IE',
  'Europe/Vienna': 'AT',
  'Europe/Zurich': 'CH',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Warsaw': 'PL',
  'Europe/Moscow': 'RU',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Kolkata': 'IN',
  'Asia/Singapore': 'SG',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Jakarta': 'ID',
  'Asia/Bangkok': 'TH',
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Asia/Shanghai': 'CN',
  'Asia/Hong_Kong': 'HK',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Pacific/Auckland': 'NZ',
}

export type StoredPreferences = {
  region: string
  currency: string
  language: string
  source: 'geo' | 'user'
  timestamp: number
}

export function languageFromNavigator(navLang: string): ChromeLanguage {
  const base = (navLang || 'en').toLowerCase().replace('_', '-').split('-')[0]
  if (base === 'fr') return 'fr'
  if (base === 'pt') return 'pt'
  return 'en'
}

export function regionFromLocale(navLang: string): string | null {
  const parts = (navLang || '').replace('_', '-').split('-')
  const region = parts[1]?.toUpperCase()
  if (!region) return null
  if (region === 'CA') return languageFromNavigator(navLang) === 'fr' ? 'CA-FR' : 'CA-EN'
  if (CURRENCY_BY_REGION[region]) return region
  return null
}

export function regionFromTimeZone(timeZone: string): string | null {
  if (!timeZone) return null
  return REGION_BY_TZ[timeZone] || null
}

function canadaRegion(language: ChromeLanguage, region: string): string {
  if (region === 'CA' || region === 'CA-EN' || region === 'CA-FR') {
    return language === 'fr' ? 'CA-FR' : 'CA-EN'
  }
  return region
}

export function detectGeoPreferences(input?: {
  timeZone?: string
  languages?: readonly string[]
}): GeoPreferences {
  const timeZone =
    input?.timeZone ??
    (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '')
  const languages =
    input?.languages ??
    (typeof navigator !== 'undefined'
      ? navigator.languages?.length
        ? navigator.languages
        : [navigator.language]
      : ['en'])
  const primary = languages[0] || 'en'
  const language = languageFromNavigator(primary)
  const tzRegion = regionFromTimeZone(timeZone || '')
  const localeRegion = regionFromLocale(primary)
  const region = canadaRegion(language, tzRegion || localeRegion || 'UG')
  const currency = CURRENCY_BY_REGION[region] || 'UGX'
  return { region, currency, language }
}

export function readStoredPreferences(): StoredPreferences | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredPreferences>
    if (!parsed.currency && !parsed.region) return null
    return {
      region: parsed.region || 'UG',
      currency: parsed.currency || 'UGX',
      language: parsed.language || 'en',
      source: parsed.source === 'user' ? 'user' : 'geo',
      timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : Date.now(),
    }
  } catch {
    return null
  }
}

export function writeStoredPreferences(
  prefs: Pick<StoredPreferences, 'region' | 'currency' | 'language'>,
  source: StoredPreferences['source']
): void {
  if (typeof localStorage === 'undefined') return
  const payload: StoredPreferences = {
    region: prefs.region,
    currency: prefs.currency,
    language: prefs.language,
    source,
    timestamp: Date.now(),
  }
  localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(payload))
}

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  uganda: 'UG',
  'united states': 'US',
  usa: 'US',
  'united kingdom': 'GB',
  'great britain': 'GB',
  england: 'GB',
  kenya: 'KE',
  tanzania: 'TZ',
  rwanda: 'RW',
  france: 'FR',
  germany: 'DE',
  portugal: 'PT',
  brazil: 'BR',
  canada: 'CA',
  australia: 'AU',
  india: 'IN',
  'south africa': 'ZA',
  nigeria: 'NG',
  ghana: 'GH',
  netherlands: 'NL',
  belgium: 'BE',
  ireland: 'IE',
  spain: 'ES',
  italy: 'IT',
  switzerland: 'CH',
  sweden: 'SE',
  norway: 'NO',
  denmark: 'DK',
  poland: 'PL',
  japan: 'JP',
  china: 'CN',
  singapore: 'SG',
  'united arab emirates': 'AE',
  uae: 'AE',
}

export function parseCloudflareTraceLoc(trace: string): string | null {
  const loc = trace.split('\n').find((line) => line.startsWith('loc='))?.slice(4)?.trim().toUpperCase()
  if (!loc || loc === 'XX' || loc === 'T1' || !/^[A-Z]{2}$/.test(loc)) return null
  return loc
}

export function countryCodeFromSessionCountry(country: string | undefined | null): string | null {
  if (!country) return null
  const trimmed = country.trim()
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase()
  return COUNTRY_NAME_TO_CODE[trimmed.toLowerCase()] || null
}

export function preferencesFromCountryCode(
  countryCode: string,
  language: ChromeLanguage
): GeoPreferences | null {
  const code = countryCode.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return null
  const region = canadaRegion(language, code)
  const currency = CURRENCY_BY_REGION[region]
  if (!currency) return null
  return { region, currency, language }
}

export async function detectCountryCodeFromNetwork(): Promise<string | null> {
  try {
    const res = await fetch('https://www.cloudflare.com/cdn-cgi/trace', { cache: 'no-store' })
    if (res.ok) {
      const loc = parseCloudflareTraceLoc(await res.text())
      if (loc) return loc
    }
  } catch {
    // Continue to ipwho.is
  }

  try {
    const res = await fetch('https://ipwho.is/?fields=country_code,success', { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    if (data?.success === false) return null
    const code = String(data?.country_code || '').toUpperCase()
    return /^[A-Z]{2}$/.test(code) ? code : null
  } catch {
    return null
  }
}
