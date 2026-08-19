/**
 * Backfill location, duration_days, itinerary, tour_highlights, meeting_point
 * on approved cat_tour_packages rows. Transcribed from listing infographics.
 *
 * Usage: node scripts/backfill-tour-itineraries.mjs
 * Reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY from .env
 */
import fs from 'fs'

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('#') && l.includes('=')).map((l) => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)

const UPDATES = [
  {
    id: '58629acc-cb1a-4b22-911d-a5d714638419',
    location: 'Kenya',
    duration_days: 7,
    meeting_point: 'Nairobi',
    end_point: 'Nairobi',
    itinerary: [
      'Day 1: Nairobi – Masai Mara. Pickup in Nairobi, drive to Masai Mara, afternoon game drive. Overnight Mara Sopa Lodge or similar.',
      'Day 2: Masai Mara full day game drives. Optional hot air balloon (extra). Overnight Mara Sopa Lodge or similar.',
      'Day 3: Masai Mara – Lake Nakuru. Morning game drive, then afternoon game drive in Lake Nakuru National Park. Overnight Lake Nakuru Sopa Lodge or similar.',
      'Day 4: Lake Nakuru – Amboseli. Scenic drive, evening game drive with Mt Kilimanjaro views. Overnight Amboseli Sopa Lodge or similar.',
      'Day 5: Amboseli full day game drives, elephants and landscape photography. Overnight Amboseli Sopa Lodge or similar.',
      'Day 6: Amboseli – Nairobi. Optional Maasai village, drive to Nairobi. Overnight Nairobi hotel or similar.',
      'Day 7: Nairobi city tour (Giraffe Centre, Karen Blixen Museum) and airport transfer.',
    ],
    tour_highlights: [
      'Masai Mara National Reserve',
      'Lake Nakuru flamingos',
      'Amboseli and Mt Kilimanjaro',
      'Big Five game viewing',
      'Maasai culture',
    ],
  },
  {
    id: '31317e8a-e914-4d52-a0a9-e9fd8f898518',
    location: 'Tanzania',
    duration_days: 6,
    meeting_point: 'Arusha',
    end_point: 'Arusha',
    itinerary: [
      'Day 1: Arusha – Tarangire National Park. Afternoon game drive among elephants and baobabs. Overnight Marera Valley Lodge or similar.',
      'Day 2: Tarangire – Serengeti via Ngorongoro Highlands. Afternoon game drive. Overnight Serengeti Safari Lodge or similar.',
      'Day 3: Full day Serengeti game drives. Overnight Serengeti Safari Lodge or similar.',
      'Day 4: Serengeti – Ngorongoro. Morning game drive, then to Ngorongoro Conservation Area. Overnight Ngorongoro Sopa Lodge or similar.',
      'Day 5: Descend Ngorongoro Crater for a game drive, then Lake Manyara. Overnight Lake Manyara Serena Lodge or similar.',
      'Day 6: Morning game drive in Lake Manyara, return to Arusha. End of safari.',
    ],
    tour_highlights: [
      'Tarangire elephants and baobabs',
      'Serengeti National Park',
      'Ngorongoro Crater',
      'Lake Manyara National Park',
    ],
  },
  {
    id: '48677934-ae06-47b5-92dd-cb62e2178c3b',
    location: 'Rwanda',
    duration_days: 5,
    meeting_point: 'Kigali International Airport',
    end_point: 'Kigali International Airport',
    itinerary: [
      'Day 1: Arrive Kigali International Airport, transfer to hotel, evening at leisure. Overnight Kigali.',
      'Day 2: Drive to Volcanoes National Park, visit Dian Fossey Gorilla Fund campus, park briefing. Overnight Volcanoes National Park.',
      'Day 3: Mountain gorilla trekking (2–6 hours). Optional evening community visit. Overnight Volcanoes National Park.',
      'Day 4: Golden monkey trek, Iby’Iwacu Cultural Village, Virunga views. Overnight Volcanoes National Park.',
      'Day 5: Return to Kigali. City tour (Genocide Memorial, markets) and airport transfer.',
    ],
    tour_highlights: [
      'Volcanoes National Park',
      'Mountain gorilla trekking',
      'Golden monkey trekking',
      'Dian Fossey Gorilla Fund campus',
      'Kigali Genocide Memorial',
    ],
  },
  {
    id: '4b67b224-834a-48fe-80c7-7ffd6df65e55',
    location: 'Uganda & Rwanda',
    duration_days: 8,
    meeting_point: 'Entebbe, Uganda',
    end_point: 'Kigali, Rwanda',
    itinerary: [
      'Day 1: Arrive Entebbe International Airport, transfer to hotel. Overnight Protea Hotel Entebbe or similar.',
      'Day 2: Scenic drive to Kibale Forest National Park. Overnight Kibale Forest Camp or similar.',
      'Day 3: Chimpanzee tracking in Kibale, afternoon Bigodi Wetland walk. Overnight Kibale Forest Camp or similar.',
      'Day 4: Transfer to Queen Elizabeth National Park, afternoon game drive. Overnight Ishasha Wilderness Camp or similar.',
      'Day 5: Morning Ishasha game drive (tree-climbing lions), transfer to Bwindi. Overnight Bwindi Forest Lodge or similar.',
      'Day 6: Gorilla tracking in Bwindi Impenetrable Forest. Optional community visit. Overnight Bwindi Forest Lodge or similar.',
      'Day 7: Cross into Rwanda, Kigali city tour and Genocide Memorial. Overnight Kigali Marriott or similar.',
      'Day 8: Transfer to Kigali International Airport. End of safari.',
    ],
    tour_highlights: [
      'Chimpanzee tracking in Kibale',
      'Gorilla trekking in Bwindi',
      'Queen Elizabeth National Park',
      'Kigali Genocide Memorial',
    ],
  },
  {
    id: '2e472527-0fe8-4f7f-8ba0-e5bad2aca9b8',
    location: 'Kenya & Tanzania',
    duration_days: 10,
    meeting_point: 'Nairobi, Kenya',
    end_point: 'Nairobi, Kenya',
    itinerary: [
      'Day 1: Nairobi – Masai Mara. Arrival and afternoon game drive.',
      'Day 2: Full day Masai Mara National Reserve (Great Migration seasonally).',
      'Day 3: Masai Mara – Serengeti via Isebania border. Afternoon game drive.',
      'Day 4: Full day Serengeti National Park game drives.',
      'Day 5: Serengeti – Ngorongoro. Morning game drive then drive to the crater rim.',
      'Day 6: Half-day Ngorongoro Crater game drive.',
      'Day 7: Ngorongoro – Tarangire. Afternoon game drive.',
      'Day 8: Tarangire – Amboseli, crossing back into Kenya.',
      'Day 9: Full day Amboseli National Park with Mt Kilimanjaro views.',
      'Day 10: Morning Amboseli game drive, return to Nairobi for drop-off.',
    ],
    tour_highlights: [
      'Masai Mara',
      'Serengeti',
      'Ngorongoro Crater',
      'Tarangire',
      'Amboseli and Kilimanjaro',
    ],
  },
  {
    id: 'b5781f93-deb5-495c-8420-6c94859e2a23',
    location: 'Uganda & Kenya',
    duration_days: 14,
    meeting_point: 'Entebbe International Airport',
    end_point: 'Mombasa Airport',
    itinerary: [
      'Day 1: Arrive Entebbe, transfer to hotel.',
      'Day 2: Entebbe – Bwindi Impenetrable Forest via Kisoro.',
      'Day 3: Gorilla trekking and community visit.',
      'Day 4: Bwindi – Queen Elizabeth National Park, evening game drive.',
      'Day 5: Morning game drive and afternoon Kazinga Channel boat cruise.',
      'Day 6: Queen Elizabeth – Entebbe, evening at leisure.',
      'Day 7: Fly Entebbe – Nairobi, afternoon city tour.',
      'Day 8: Nairobi (Giraffe Centre, Karen Blixen Museum, markets).',
      'Day 9: SGR Madaraka Express Nairobi – Mombasa, transfer to hotel.',
      'Day 10: Mombasa heritage tour (Fort Jesus, Old Town).',
      'Day 11: Transfer to Diani Beach.',
      'Day 12: Diani Beach leisure day.',
      'Day 13: Wasini Island boat trip, snorkeling, dolphin watching.',
      'Day 14: Transfer to Mombasa Airport for departure.',
    ],
    tour_highlights: [
      'Bwindi gorilla trekking',
      'Queen Elizabeth National Park',
      'SGR Madaraka Express',
      'Diani Beach',
      'Wasini Island',
    ],
  },
  {
    id: 'dfa3490e-a2c4-47e4-a205-bd16e1dcf38a',
    location: 'Uganda',
    duration_days: 10,
    meeting_point: 'Entebbe',
    end_point: 'Entebbe',
    itinerary: [
      'Day 1: Arrive Entebbe, airport transfer. Overnight Protea Hotel Entebbe or similar.',
      'Day 2: Fly Entebbe – Kidepo, afternoon game drive in Narus Valley. Overnight Apoka Safari Lodge or similar.',
      'Day 3: Full day Kidepo Valley National Park. Overnight Apoka Safari Lodge or similar.',
      'Day 4: Kidepo – Murchison Falls, en-route game viewing. Overnight Fort Murchison Lodge or similar.',
      'Day 5: Murchison Falls morning game drive and afternoon boat to the base of the falls.',
      'Day 6: Murchison – Queen Elizabeth via the top of the falls. Overnight Ishasha Wilderness Camp or similar.',
      'Day 7: Ishasha sector game drives for tree-climbing lions.',
      'Day 8: Queen Elizabeth morning game drive and Kazinga Channel boat cruise.',
      'Day 9: Queen Elizabeth – Lake Mburo, evening game drive. Overnight Rwakobo Rock Lodge or similar.',
      'Day 10: Lake Mburo nature walk or game drive, transfer to Entebbe for departure.',
    ],
    tour_highlights: [
      'Kidepo Valley National Park',
      'Murchison Falls',
      'Kazinga Channel',
      'Ishasha tree-climbing lions',
      'Lake Mburo National Park',
    ],
  },
  {
    id: '7113d129-a8c3-4910-9278-a8229cf1936e',
    location: 'Uganda, Kenya & Tanzania',
    duration_days: 12,
    meeting_point: 'Entebbe, Uganda',
    end_point: 'Nairobi, Kenya',
    itinerary: [
      'Day 1: Arrive Entebbe, transfer to hotel. Overnight Papyrus Guest House or similar.',
      'Day 2: Fly to Bwindi Impenetrable Forest, transfer to lodge. Overnight Gorilla Forest Camp or similar.',
      'Day 3: Mountain gorilla trekking. Overnight Gorilla Forest Camp or similar.',
      'Day 4: Transfer to Lake Bunyonyi, canoe. Overnight Birdnest Resort or similar.',
      'Day 5: Fly to Nairobi, afternoon at leisure. Overnight Tamarind Tree Hotel or similar.',
      'Day 6: Drive to Masai Mara, evening game drive. Overnight Mara Sopa Lodge or similar.',
      'Day 7: Full day Masai Mara game drives. Overnight Mara Sopa Lodge or similar.',
      'Day 8: Cross into Tanzania / Serengeti, afternoon game drive. Overnight Serengeti Serena Lodge or similar.',
      'Day 9: Full day Serengeti game drives. Overnight Serengeti Serena Lodge or similar.',
      'Day 10: Serengeti – Ngorongoro. Overnight Ngorongoro Serena Lodge or similar.',
      'Day 11: Ngorongoro Crater game drive. Overnight Ngorongoro Serena Lodge or similar.',
      'Day 12: Return to Nairobi, Giraffe Centre, airport transfer.',
    ],
    tour_highlights: [
      'Bwindi gorilla trekking',
      'Lake Bunyonyi',
      'Masai Mara',
      'Serengeti',
      'Ngorongoro Crater',
    ],
  },
  {
    id: '9cb73f36-04c6-44c0-9e71-82399617c20b',
    location: 'Kabaale and Bwindi',
    meeting_point: 'Kabaale and Bwindi',
    tour_highlights: ['Bwindi gorilla country', 'Western Uganda for first-time travellers and returnees'],
  },
]

function sqlLiteral(value) {
  if (value == null) return 'NULL'
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    if (value.length === 0) return `ARRAY[]::text[]`
    return `ARRAY[${value.map((item) => `$it$${item}$it$`).join(', ')}]::text[]`
  }
  return `$it$${value}$it$`
}

function toSql() {
  return [
    '-- Backfill tour package itineraries transcribed from listing infographics.',
    '-- Run in Travel Tails SQL editor (service role / postgres). Anon PATCH is blocked by RLS.',
    '',
    ...UPDATES.map((row) => {
      const { id, ...patch } = row
      const sets = Object.entries(patch)
        .map(([col, val]) => `  ${col} = ${sqlLiteral(val)}`)
        .join(',\n')
      return `UPDATE public.services\nSET\n${sets}\nWHERE id = '${id}'\n  AND category_id = 'cat_tour_packages';`
    }),
    '',
    `SELECT id, title, location, duration_days, cardinality(itinerary) AS itinerary_n, meeting_point`,
    `FROM public.services`,
    `WHERE category_id = 'cat_tour_packages' AND status = 'approved'`,
    `ORDER BY title;`,
    '',
  ].join('\n')
}

fs.writeFileSync('scripts/backfill-tour-itineraries.sql', toSql())
if (process.argv.includes('--sql-only')) {
  console.log('wrote scripts/backfill-tour-itineraries.sql')
  process.exit(0)
}

const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const results = []
for (const row of UPDATES) {
  const { id, ...patch } = row
  const res = await fetch(`${url}/rest/v1/services?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(patch),
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = text
  }
  const updated = Array.isArray(json) ? json[0] : null
  results.push({
    id,
    status: res.status,
    itinerary_n: updated?.itinerary?.length ?? null,
    location: updated?.location ?? null,
    duration_days: updated?.duration_days ?? null,
    error: res.ok ? null : json?.message || json?.hint || text.slice(0, 240),
  })
}

console.log(JSON.stringify(results, null, 2))
const ok = results.filter((r) => r.status >= 200 && r.status < 300 && r.itinerary_n != null).length
console.log(`patched_ok=${ok}/${results.length}`)
if (ok < 8) process.exit(2)
