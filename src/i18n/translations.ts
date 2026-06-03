export type SupportedLang = 'en' | 'pt' | 'fr'

type TranslationMap = Record<string, string>

const en: TranslationMap = {
  search: 'Search',
  messages: 'Messages',
  preferences: 'Preferences',
  my_account: 'My account',
  home: 'Home',
  profile: 'Profile',
  bookings: 'Bookings',
  saved_items: 'Saved items',
  settings: 'Settings',
  help_center: 'Help center',
  sign_out: 'Sign out',
  log_in: 'Log in',
  currency_region: 'Currency & region',
  for_businesses: 'For businesses',
  list_my_business: 'List my business',
  partner_with: 'Partner with us',
  all_listings: 'All listings',
  hero_title: 'Discover East Africa',
  hero_subtitle: 'Book hotels, tours, transport, and more',
  no_results: 'No results',
  adjust_search: 'Try adjusting your search or filters',
  search_placeholder: 'Search…',
  global_search_tooltip: 'Search',
  logout: 'Log out',
  welcome_to_app: 'Welcome to DirtTrails',
  sign_in_prompt: 'Sign in to access your profile, bookings, and recommendations.',
  sign_in: 'Sign in',
  vendor_sign_in: 'Vendor sign in',
  my_bookings: 'My bookings',
  reviews_given: 'Reviews',
}

const pt: TranslationMap = { ...en }
const fr: TranslationMap = { ...en }

const catalogs: Record<SupportedLang, TranslationMap> = { en, pt, fr }

export function translate(lang: SupportedLang, key: string): string {
  return catalogs[lang]?.[key] ?? catalogs.en[key] ?? ''
}
