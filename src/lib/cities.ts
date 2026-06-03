/**
 * City → Country mapping for the city picker.
 * Uganda-only list for now (major towns, district centres, and common tourism hubs).
 */
export interface CityEntry {
  city: string
  country: string
}

const UGANDA = 'Uganda' as const

export const CITIES: CityEntry[] = [
  // Central
  { city: 'Kampala', country: UGANDA },
  { city: 'Entebbe', country: UGANDA },
  { city: 'Mukono', country: UGANDA },
  { city: 'Wakiso', country: UGANDA },
  { city: 'Masaka', country: UGANDA },
  { city: 'Mpigi', country: UGANDA },
  { city: 'Luwero', country: UGANDA },
  { city: 'Mityana', country: UGANDA },
  { city: 'Kayunga', country: UGANDA },
  { city: 'Buikwe', country: UGANDA },
  { city: 'Kalangala', country: UGANDA },
  { city: 'Rakai', country: UGANDA },
  { city: 'Lyantonde', country: UGANDA },
  { city: 'Sembabule', country: UGANDA },
  { city: 'Gomba', country: UGANDA },
  { city: 'Butambala', country: UGANDA },
  { city: 'Nakaseke', country: UGANDA },
  { city: 'Nakasongola', country: UGANDA },
  { city: 'Kiboga', country: UGANDA },
  { city: 'Kyankwanzi', country: UGANDA },

  // Eastern
  { city: 'Jinja', country: UGANDA },
  { city: 'Mbale', country: UGANDA },
  { city: 'Soroti', country: UGANDA },
  { city: 'Iganga', country: UGANDA },
  { city: 'Tororo', country: UGANDA },
  { city: 'Busia', country: UGANDA },
  { city: 'Kapchorwa', country: UGANDA },
  { city: 'Moroto', country: UGANDA },
  { city: 'Kotido', country: UGANDA },
  { city: 'Kaabong', country: UGANDA },
  { city: 'Abim', country: UGANDA },
  { city: 'Nakapiripirit', country: UGANDA },
  { city: 'Amudat', country: UGANDA },
  { city: 'Bugiri', country: UGANDA },
  { city: 'Kamuli', country: UGANDA },
  { city: 'Pallisa', country: UGANDA },
  { city: 'Kumi', country: UGANDA },
  { city: 'Ngora', country: UGANDA },
  { city: 'Sironko', country: UGANDA },
  { city: 'Bududa', country: UGANDA },
  { city: 'Manafwa', country: UGANDA },
  { city: 'Namutumba', country: UGANDA },
  { city: 'Mayuge', country: UGANDA },
  { city: 'Kaliro', country: UGANDA },
  { city: 'Buyende', country: UGANDA },
  { city: 'Luuka', country: UGANDA },
  { city: 'Butebo', country: UGANDA },
  { city: 'Kibuku', country: UGANDA },
  { city: 'Budaka', country: UGANDA },
  { city: 'Bukedea', country: UGANDA },
  { city: 'Kapelebyong', country: UGANDA },
  { city: 'Kalaki', country: UGANDA },
  { city: 'Kaberamaido', country: UGANDA },
  { city: 'Amuria', country: UGANDA },
  { city: 'Katakwi', country: UGANDA },
  { city: 'Bukwo', country: UGANDA },

  // Northern
  { city: 'Gulu', country: UGANDA },
  { city: 'Lira', country: UGANDA },
  { city: 'Arua', country: UGANDA },
  { city: 'Kitgum', country: UGANDA },
  { city: 'Pader', country: UGANDA },
  { city: 'Adjumani', country: UGANDA },
  { city: 'Moyo', country: UGANDA },
  { city: 'Nebbi', country: UGANDA },
  { city: 'Pakwach', country: UGANDA },
  { city: 'Yumbe', country: UGANDA },
  { city: 'Koboko', country: UGANDA },
  { city: 'Apac', country: UGANDA },
  { city: 'Dokolo', country: UGANDA },
  { city: 'Oyam', country: UGANDA },
  { city: 'Kole', country: UGANDA },
  { city: 'Alebtong', country: UGANDA },
  { city: 'Amolatar', country: UGANDA },
  { city: 'Otuke', country: UGANDA },
  { city: 'Agago', country: UGANDA },
  { city: 'Lamwo', country: UGANDA },
  { city: 'Nwoya', country: UGANDA },
  { city: 'Omoro', country: UGANDA },
  { city: 'Amuru', country: UGANDA },
  { city: 'Maracha', country: UGANDA },
  { city: 'Terego', country: UGANDA },
  { city: 'Madi-Okollo', country: UGANDA },
  { city: 'Zombo', country: UGANDA },
  { city: 'Nabilatuk', country: UGANDA },
  { city: 'Napak', country: UGANDA },

  // Western
  { city: 'Mbarara', country: UGANDA },
  { city: 'Fort Portal', country: UGANDA },
  { city: 'Kasese', country: UGANDA },
  { city: 'Hoima', country: UGANDA },
  { city: 'Kabale', country: UGANDA },
  { city: 'Bushenyi', country: UGANDA },
  { city: 'Ishaka', country: UGANDA },
  { city: 'Rukungiri', country: UGANDA },
  { city: 'Kanungu', country: UGANDA },
  { city: 'Kisoro', country: UGANDA },
  { city: 'Ntungamo', country: UGANDA },
  { city: 'Bundibugyo', country: UGANDA },
  { city: 'Kyegegwa', country: UGANDA },
  { city: 'Kyenjojo', country: UGANDA },
  { city: 'Kamwenge', country: UGANDA },
  { city: 'Masindi', country: UGANDA },
  { city: 'Buliisa', country: UGANDA },
  { city: 'Ntoroko', country: UGANDA },
  { city: 'Kibaale', country: UGANDA },
  { city: 'Kagadi', country: UGANDA },
  { city: 'Kakumiro', country: UGANDA },
  { city: 'Kikuube', country: UGANDA },
  { city: 'Kiryandongo', country: UGANDA },
  { city: 'Buhweju', country: UGANDA },
  { city: 'Rubirizi', country: UGANDA },
  { city: 'Sheema', country: UGANDA },
  { city: 'Mitooma', country: UGANDA },
  { city: 'Ibanda', country: UGANDA },
  { city: 'Kiruhura', country: UGANDA },
  { city: 'Isingiro', country: UGANDA },
  { city: 'Rubanda', country: UGANDA },
  { city: 'Rukiga', country: UGANDA },
  { city: 'Bunyangabu', country: UGANDA },

  // Tourism & parks (common labels on bookings)
  { city: 'Bwindi', country: UGANDA },
  { city: 'Kibale', country: UGANDA },
  { city: 'Queen Elizabeth', country: UGANDA },
  { city: 'Murchison Falls', country: UGANDA },
  { city: 'Lake Mburo', country: UGANDA },
  { city: 'Ssese Islands', country: UGANDA },
  { city: 'Sipi Falls', country: UGANDA },
  { city: 'Mount Elgon', country: UGANDA },
  { city: 'Ziwa Rhino Sanctuary', country: UGANDA },
]

/**
 * Search cities by query string (matches city name).
 * Returns up to `limit` results. City-name matches only (single country).
 */
export function searchCities(query: string, limit = 30): CityEntry[] {
  if (!query.trim()) return CITIES.slice(0, limit)
  const q = query.toLowerCase().trim()
  const matches: CityEntry[] = []
  for (const c of CITIES) {
    if (c.city.toLowerCase().includes(q)) {
      matches.push(c)
    }
    if (matches.length >= limit) break
  }
  return matches
}
