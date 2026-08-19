-- Backfill tour package itineraries transcribed from listing infographics.
-- Run in Travel Tails SQL editor (service role / postgres). Anon PATCH is blocked by RLS.

UPDATE public.services
SET
  location = $it$Kenya$it$,
  duration_days = 7,
  meeting_point = $it$Nairobi$it$,
  end_point = $it$Nairobi$it$,
  itinerary = ARRAY[$it$Day 1: Nairobi – Masai Mara. Pickup in Nairobi, drive to Masai Mara, afternoon game drive. Overnight Mara Sopa Lodge or similar.$it$, $it$Day 2: Masai Mara full day game drives. Optional hot air balloon (extra). Overnight Mara Sopa Lodge or similar.$it$, $it$Day 3: Masai Mara – Lake Nakuru. Morning game drive, then afternoon game drive in Lake Nakuru National Park. Overnight Lake Nakuru Sopa Lodge or similar.$it$, $it$Day 4: Lake Nakuru – Amboseli. Scenic drive, evening game drive with Mt Kilimanjaro views. Overnight Amboseli Sopa Lodge or similar.$it$, $it$Day 5: Amboseli full day game drives, elephants and landscape photography. Overnight Amboseli Sopa Lodge or similar.$it$, $it$Day 6: Amboseli – Nairobi. Optional Maasai village, drive to Nairobi. Overnight Nairobi hotel or similar.$it$, $it$Day 7: Nairobi city tour (Giraffe Centre, Karen Blixen Museum) and airport transfer.$it$]::text[],
  tour_highlights = ARRAY[$it$Masai Mara National Reserve$it$, $it$Lake Nakuru flamingos$it$, $it$Amboseli and Mt Kilimanjaro$it$, $it$Big Five game viewing$it$, $it$Maasai culture$it$]::text[]
WHERE id = '58629acc-cb1a-4b22-911d-a5d714638419'
  AND category_id = 'cat_tour_packages';
UPDATE public.services
SET
  location = $it$Tanzania$it$,
  duration_days = 6,
  meeting_point = $it$Arusha$it$,
  end_point = $it$Arusha$it$,
  itinerary = ARRAY[$it$Day 1: Arusha – Tarangire National Park. Afternoon game drive among elephants and baobabs. Overnight Marera Valley Lodge or similar.$it$, $it$Day 2: Tarangire – Serengeti via Ngorongoro Highlands. Afternoon game drive. Overnight Serengeti Safari Lodge or similar.$it$, $it$Day 3: Full day Serengeti game drives. Overnight Serengeti Safari Lodge or similar.$it$, $it$Day 4: Serengeti – Ngorongoro. Morning game drive, then to Ngorongoro Conservation Area. Overnight Ngorongoro Sopa Lodge or similar.$it$, $it$Day 5: Descend Ngorongoro Crater for a game drive, then Lake Manyara. Overnight Lake Manyara Serena Lodge or similar.$it$, $it$Day 6: Morning game drive in Lake Manyara, return to Arusha. End of safari.$it$]::text[],
  tour_highlights = ARRAY[$it$Tarangire elephants and baobabs$it$, $it$Serengeti National Park$it$, $it$Ngorongoro Crater$it$, $it$Lake Manyara National Park$it$]::text[]
WHERE id = '31317e8a-e914-4d52-a0a9-e9fd8f898518'
  AND category_id = 'cat_tour_packages';
UPDATE public.services
SET
  location = $it$Rwanda$it$,
  duration_days = 5,
  meeting_point = $it$Kigali International Airport$it$,
  end_point = $it$Kigali International Airport$it$,
  itinerary = ARRAY[$it$Day 1: Arrive Kigali International Airport, transfer to hotel, evening at leisure. Overnight Kigali.$it$, $it$Day 2: Drive to Volcanoes National Park, visit Dian Fossey Gorilla Fund campus, park briefing. Overnight Volcanoes National Park.$it$, $it$Day 3: Mountain gorilla trekking (2–6 hours). Optional evening community visit. Overnight Volcanoes National Park.$it$, $it$Day 4: Golden monkey trek, Iby’Iwacu Cultural Village, Virunga views. Overnight Volcanoes National Park.$it$, $it$Day 5: Return to Kigali. City tour (Genocide Memorial, markets) and airport transfer.$it$]::text[],
  tour_highlights = ARRAY[$it$Volcanoes National Park$it$, $it$Mountain gorilla trekking$it$, $it$Golden monkey trekking$it$, $it$Dian Fossey Gorilla Fund campus$it$, $it$Kigali Genocide Memorial$it$]::text[]
WHERE id = '48677934-ae06-47b5-92dd-cb62e2178c3b'
  AND category_id = 'cat_tour_packages';
UPDATE public.services
SET
  location = $it$Uganda & Rwanda$it$,
  duration_days = 8,
  meeting_point = $it$Entebbe, Uganda$it$,
  end_point = $it$Kigali, Rwanda$it$,
  itinerary = ARRAY[$it$Day 1: Arrive Entebbe International Airport, transfer to hotel. Overnight Protea Hotel Entebbe or similar.$it$, $it$Day 2: Scenic drive to Kibale Forest National Park. Overnight Kibale Forest Camp or similar.$it$, $it$Day 3: Chimpanzee tracking in Kibale, afternoon Bigodi Wetland walk. Overnight Kibale Forest Camp or similar.$it$, $it$Day 4: Transfer to Queen Elizabeth National Park, afternoon game drive. Overnight Ishasha Wilderness Camp or similar.$it$, $it$Day 5: Morning Ishasha game drive (tree-climbing lions), transfer to Bwindi. Overnight Bwindi Forest Lodge or similar.$it$, $it$Day 6: Gorilla tracking in Bwindi Impenetrable Forest. Optional community visit. Overnight Bwindi Forest Lodge or similar.$it$, $it$Day 7: Cross into Rwanda, Kigali city tour and Genocide Memorial. Overnight Kigali Marriott or similar.$it$, $it$Day 8: Transfer to Kigali International Airport. End of safari.$it$]::text[],
  tour_highlights = ARRAY[$it$Chimpanzee tracking in Kibale$it$, $it$Gorilla trekking in Bwindi$it$, $it$Queen Elizabeth National Park$it$, $it$Kigali Genocide Memorial$it$]::text[]
WHERE id = '4b67b224-834a-48fe-80c7-7ffd6df65e55'
  AND category_id = 'cat_tour_packages';
UPDATE public.services
SET
  location = $it$Kenya & Tanzania$it$,
  duration_days = 10,
  meeting_point = $it$Nairobi, Kenya$it$,
  end_point = $it$Nairobi, Kenya$it$,
  itinerary = ARRAY[$it$Day 1: Nairobi – Masai Mara. Arrival and afternoon game drive.$it$, $it$Day 2: Full day Masai Mara National Reserve (Great Migration seasonally).$it$, $it$Day 3: Masai Mara – Serengeti via Isebania border. Afternoon game drive.$it$, $it$Day 4: Full day Serengeti National Park game drives.$it$, $it$Day 5: Serengeti – Ngorongoro. Morning game drive then drive to the crater rim.$it$, $it$Day 6: Half-day Ngorongoro Crater game drive.$it$, $it$Day 7: Ngorongoro – Tarangire. Afternoon game drive.$it$, $it$Day 8: Tarangire – Amboseli, crossing back into Kenya.$it$, $it$Day 9: Full day Amboseli National Park with Mt Kilimanjaro views.$it$, $it$Day 10: Morning Amboseli game drive, return to Nairobi for drop-off.$it$]::text[],
  tour_highlights = ARRAY[$it$Masai Mara$it$, $it$Serengeti$it$, $it$Ngorongoro Crater$it$, $it$Tarangire$it$, $it$Amboseli and Kilimanjaro$it$]::text[]
WHERE id = '2e472527-0fe8-4f7f-8ba0-e5bad2aca9b8'
  AND category_id = 'cat_tour_packages';
UPDATE public.services
SET
  location = $it$Uganda & Kenya$it$,
  duration_days = 14,
  meeting_point = $it$Entebbe International Airport$it$,
  end_point = $it$Mombasa Airport$it$,
  itinerary = ARRAY[$it$Day 1: Arrive Entebbe, transfer to hotel.$it$, $it$Day 2: Entebbe – Bwindi Impenetrable Forest via Kisoro.$it$, $it$Day 3: Gorilla trekking and community visit.$it$, $it$Day 4: Bwindi – Queen Elizabeth National Park, evening game drive.$it$, $it$Day 5: Morning game drive and afternoon Kazinga Channel boat cruise.$it$, $it$Day 6: Queen Elizabeth – Entebbe, evening at leisure.$it$, $it$Day 7: Fly Entebbe – Nairobi, afternoon city tour.$it$, $it$Day 8: Nairobi (Giraffe Centre, Karen Blixen Museum, markets).$it$, $it$Day 9: SGR Madaraka Express Nairobi – Mombasa, transfer to hotel.$it$, $it$Day 10: Mombasa heritage tour (Fort Jesus, Old Town).$it$, $it$Day 11: Transfer to Diani Beach.$it$, $it$Day 12: Diani Beach leisure day.$it$, $it$Day 13: Wasini Island boat trip, snorkeling, dolphin watching.$it$, $it$Day 14: Transfer to Mombasa Airport for departure.$it$]::text[],
  tour_highlights = ARRAY[$it$Bwindi gorilla trekking$it$, $it$Queen Elizabeth National Park$it$, $it$SGR Madaraka Express$it$, $it$Diani Beach$it$, $it$Wasini Island$it$]::text[]
WHERE id = 'b5781f93-deb5-495c-8420-6c94859e2a23'
  AND category_id = 'cat_tour_packages';
UPDATE public.services
SET
  location = $it$Uganda$it$,
  duration_days = 10,
  meeting_point = $it$Entebbe$it$,
  end_point = $it$Entebbe$it$,
  itinerary = ARRAY[$it$Day 1: Arrive Entebbe, airport transfer. Overnight Protea Hotel Entebbe or similar.$it$, $it$Day 2: Fly Entebbe – Kidepo, afternoon game drive in Narus Valley. Overnight Apoka Safari Lodge or similar.$it$, $it$Day 3: Full day Kidepo Valley National Park. Overnight Apoka Safari Lodge or similar.$it$, $it$Day 4: Kidepo – Murchison Falls, en-route game viewing. Overnight Fort Murchison Lodge or similar.$it$, $it$Day 5: Murchison Falls morning game drive and afternoon boat to the base of the falls.$it$, $it$Day 6: Murchison – Queen Elizabeth via the top of the falls. Overnight Ishasha Wilderness Camp or similar.$it$, $it$Day 7: Ishasha sector game drives for tree-climbing lions.$it$, $it$Day 8: Queen Elizabeth morning game drive and Kazinga Channel boat cruise.$it$, $it$Day 9: Queen Elizabeth – Lake Mburo, evening game drive. Overnight Rwakobo Rock Lodge or similar.$it$, $it$Day 10: Lake Mburo nature walk or game drive, transfer to Entebbe for departure.$it$]::text[],
  tour_highlights = ARRAY[$it$Kidepo Valley National Park$it$, $it$Murchison Falls$it$, $it$Kazinga Channel$it$, $it$Ishasha tree-climbing lions$it$, $it$Lake Mburo National Park$it$]::text[]
WHERE id = 'dfa3490e-a2c4-47e4-a205-bd16e1dcf38a'
  AND category_id = 'cat_tour_packages';
UPDATE public.services
SET
  location = $it$Uganda, Kenya & Tanzania$it$,
  duration_days = 12,
  meeting_point = $it$Entebbe, Uganda$it$,
  end_point = $it$Nairobi, Kenya$it$,
  itinerary = ARRAY[$it$Day 1: Arrive Entebbe, transfer to hotel. Overnight Papyrus Guest House or similar.$it$, $it$Day 2: Fly to Bwindi Impenetrable Forest, transfer to lodge. Overnight Gorilla Forest Camp or similar.$it$, $it$Day 3: Mountain gorilla trekking. Overnight Gorilla Forest Camp or similar.$it$, $it$Day 4: Transfer to Lake Bunyonyi, canoe. Overnight Birdnest Resort or similar.$it$, $it$Day 5: Fly to Nairobi, afternoon at leisure. Overnight Tamarind Tree Hotel or similar.$it$, $it$Day 6: Drive to Masai Mara, evening game drive. Overnight Mara Sopa Lodge or similar.$it$, $it$Day 7: Full day Masai Mara game drives. Overnight Mara Sopa Lodge or similar.$it$, $it$Day 8: Cross into Tanzania / Serengeti, afternoon game drive. Overnight Serengeti Serena Lodge or similar.$it$, $it$Day 9: Full day Serengeti game drives. Overnight Serengeti Serena Lodge or similar.$it$, $it$Day 10: Serengeti – Ngorongoro. Overnight Ngorongoro Serena Lodge or similar.$it$, $it$Day 11: Ngorongoro Crater game drive. Overnight Ngorongoro Serena Lodge or similar.$it$, $it$Day 12: Return to Nairobi, Giraffe Centre, airport transfer.$it$]::text[],
  tour_highlights = ARRAY[$it$Bwindi gorilla trekking$it$, $it$Lake Bunyonyi$it$, $it$Masai Mara$it$, $it$Serengeti$it$, $it$Ngorongoro Crater$it$]::text[]
WHERE id = '7113d129-a8c3-4910-9278-a8229cf1936e'
  AND category_id = 'cat_tour_packages';
UPDATE public.services
SET
  location = $it$Kabaale and Bwindi$it$,
  meeting_point = $it$Kabaale and Bwindi$it$,
  tour_highlights = ARRAY[$it$Bwindi gorilla country$it$, $it$Western Uganda for first-time travellers and returnees$it$]::text[]
WHERE id = '9cb73f36-04c6-44c0-9e71-82399617c20b'
  AND category_id = 'cat_tour_packages';

SELECT id, title, location, duration_days, cardinality(itinerary) AS itinerary_n, meeting_point
FROM public.services
WHERE category_id = 'cat_tour_packages' AND status = 'approved'
ORDER BY title;
