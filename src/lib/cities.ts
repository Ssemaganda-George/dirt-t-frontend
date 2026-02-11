/**
 * City → Country mapping for the city picker.
 * Comprehensive worldwide coverage — 600+ cities.
 * Sorted by region, then alphabetically.
 */
export interface CityEntry {
  city: string
  country: string
}

export const CITIES: CityEntry[] = [
  // =====================================================
  // AFRICA
  // =====================================================
  // Algeria
  { city: 'Algiers', country: 'Algeria' },
  { city: 'Oran', country: 'Algeria' },
  { city: 'Constantine', country: 'Algeria' },
  // Angola
  { city: 'Luanda', country: 'Angola' },
  { city: 'Lobito', country: 'Angola' },
  // Benin
  { city: 'Cotonou', country: 'Benin' },
  { city: 'Porto-Novo', country: 'Benin' },
  // Botswana
  { city: 'Gaborone', country: 'Botswana' },
  { city: 'Francistown', country: 'Botswana' },
  { city: 'Maun', country: 'Botswana' },
  // Burkina Faso
  { city: 'Ouagadougou', country: 'Burkina Faso' },
  { city: 'Bobo-Dioulasso', country: 'Burkina Faso' },
  // Burundi
  { city: 'Bujumbura', country: 'Burundi' },
  { city: 'Gitega', country: 'Burundi' },
  // Cameroon
  { city: 'Douala', country: 'Cameroon' },
  { city: 'Yaoundé', country: 'Cameroon' },
  { city: 'Bamenda', country: 'Cameroon' },
  // Cape Verde
  { city: 'Praia', country: 'Cape Verde' },
  // Central African Republic
  { city: 'Bangui', country: 'Central African Republic' },
  // Chad
  { city: "N'Djamena", country: 'Chad' },
  // Comoros
  { city: 'Moroni', country: 'Comoros' },
  // Congo (DRC)
  { city: 'Kinshasa', country: 'Democratic Republic of the Congo' },
  { city: 'Lubumbashi', country: 'Democratic Republic of the Congo' },
  { city: 'Goma', country: 'Democratic Republic of the Congo' },
  { city: 'Kisangani', country: 'Democratic Republic of the Congo' },
  { city: 'Bukavu', country: 'Democratic Republic of the Congo' },
  // Congo (Republic)
  { city: 'Brazzaville', country: 'Republic of the Congo' },
  { city: 'Pointe-Noire', country: 'Republic of the Congo' },
  // Djibouti
  { city: 'Djibouti City', country: 'Djibouti' },
  // Egypt
  { city: 'Cairo', country: 'Egypt' },
  { city: 'Alexandria', country: 'Egypt' },
  { city: 'Luxor', country: 'Egypt' },
  { city: 'Aswan', country: 'Egypt' },
  { city: 'Sharm El Sheikh', country: 'Egypt' },
  { city: 'Hurghada', country: 'Egypt' },
  // Equatorial Guinea
  { city: 'Malabo', country: 'Equatorial Guinea' },
  // Eritrea
  { city: 'Asmara', country: 'Eritrea' },
  // Eswatini
  { city: 'Mbabane', country: 'Eswatini' },
  // Ethiopia
  { city: 'Addis Ababa', country: 'Ethiopia' },
  { city: 'Dire Dawa', country: 'Ethiopia' },
  { city: 'Bahir Dar', country: 'Ethiopia' },
  { city: 'Gondar', country: 'Ethiopia' },
  { city: 'Hawassa', country: 'Ethiopia' },
  // Gabon
  { city: 'Libreville', country: 'Gabon' },
  // Gambia
  { city: 'Banjul', country: 'Gambia' },
  // Ghana
  { city: 'Accra', country: 'Ghana' },
  { city: 'Kumasi', country: 'Ghana' },
  { city: 'Tamale', country: 'Ghana' },
  { city: 'Cape Coast', country: 'Ghana' },
  // Guinea
  { city: 'Conakry', country: 'Guinea' },
  // Guinea-Bissau
  { city: 'Bissau', country: 'Guinea-Bissau' },
  // Ivory Coast
  { city: 'Abidjan', country: 'Ivory Coast' },
  { city: 'Yamoussoukro', country: 'Ivory Coast' },
  { city: 'Bouaké', country: 'Ivory Coast' },
  // Kenya
  { city: 'Nairobi', country: 'Kenya' },
  { city: 'Mombasa', country: 'Kenya' },
  { city: 'Kisumu', country: 'Kenya' },
  { city: 'Nakuru', country: 'Kenya' },
  { city: 'Eldoret', country: 'Kenya' },
  { city: 'Malindi', country: 'Kenya' },
  { city: 'Lamu', country: 'Kenya' },
  { city: 'Naivasha', country: 'Kenya' },
  { city: 'Nanyuki', country: 'Kenya' },
  // Lesotho
  { city: 'Maseru', country: 'Lesotho' },
  // Liberia
  { city: 'Monrovia', country: 'Liberia' },
  // Libya
  { city: 'Tripoli', country: 'Libya' },
  { city: 'Benghazi', country: 'Libya' },
  // Madagascar
  { city: 'Antananarivo', country: 'Madagascar' },
  { city: 'Toamasina', country: 'Madagascar' },
  { city: 'Nosy Be', country: 'Madagascar' },
  // Malawi
  { city: 'Lilongwe', country: 'Malawi' },
  { city: 'Blantyre', country: 'Malawi' },
  { city: 'Mzuzu', country: 'Malawi' },
  // Mali
  { city: 'Bamako', country: 'Mali' },
  { city: 'Timbuktu', country: 'Mali' },
  // Mauritania
  { city: 'Nouakchott', country: 'Mauritania' },
  // Mauritius
  { city: 'Port Louis', country: 'Mauritius' },
  // Morocco
  { city: 'Casablanca', country: 'Morocco' },
  { city: 'Marrakech', country: 'Morocco' },
  { city: 'Fez', country: 'Morocco' },
  { city: 'Tangier', country: 'Morocco' },
  { city: 'Rabat', country: 'Morocco' },
  { city: 'Chefchaouen', country: 'Morocco' },
  // Mozambique
  { city: 'Maputo', country: 'Mozambique' },
  { city: 'Beira', country: 'Mozambique' },
  // Namibia
  { city: 'Windhoek', country: 'Namibia' },
  { city: 'Swakopmund', country: 'Namibia' },
  { city: 'Walvis Bay', country: 'Namibia' },
  // Niger
  { city: 'Niamey', country: 'Niger' },
  // Nigeria
  { city: 'Lagos', country: 'Nigeria' },
  { city: 'Abuja', country: 'Nigeria' },
  { city: 'Kano', country: 'Nigeria' },
  { city: 'Port Harcourt', country: 'Nigeria' },
  { city: 'Ibadan', country: 'Nigeria' },
  { city: 'Enugu', country: 'Nigeria' },
  { city: 'Benin City', country: 'Nigeria' },
  // Rwanda
  { city: 'Kigali', country: 'Rwanda' },
  { city: 'Musanze', country: 'Rwanda' },
  { city: 'Gisenyi', country: 'Rwanda' },
  { city: 'Butare', country: 'Rwanda' },
  // São Tomé and Príncipe
  { city: 'São Tomé', country: 'São Tomé and Príncipe' },
  // Senegal
  { city: 'Dakar', country: 'Senegal' },
  { city: 'Saint-Louis', country: 'Senegal' },
  // Seychelles
  { city: 'Victoria', country: 'Seychelles' },
  // Sierra Leone
  { city: 'Freetown', country: 'Sierra Leone' },
  // Somalia
  { city: 'Mogadishu', country: 'Somalia' },
  { city: 'Hargeisa', country: 'Somalia' },
  // South Africa
  { city: 'Johannesburg', country: 'South Africa' },
  { city: 'Cape Town', country: 'South Africa' },
  { city: 'Durban', country: 'South Africa' },
  { city: 'Pretoria', country: 'South Africa' },
  { city: 'Port Elizabeth', country: 'South Africa' },
  { city: 'Bloemfontein', country: 'South Africa' },
  { city: 'Stellenbosch', country: 'South Africa' },
  { city: 'Kruger National Park', country: 'South Africa' },
  // South Sudan
  { city: 'Juba', country: 'South Sudan' },
  // Sudan
  { city: 'Khartoum', country: 'Sudan' },
  { city: 'Omdurman', country: 'Sudan' },
  // Tanzania
  { city: 'Dar es Salaam', country: 'Tanzania' },
  { city: 'Arusha', country: 'Tanzania' },
  { city: 'Zanzibar City', country: 'Tanzania' },
  { city: 'Dodoma', country: 'Tanzania' },
  { city: 'Moshi', country: 'Tanzania' },
  { city: 'Mwanza', country: 'Tanzania' },
  { city: 'Bagamoyo', country: 'Tanzania' },
  // Togo
  { city: 'Lomé', country: 'Togo' },
  // Tunisia
  { city: 'Tunis', country: 'Tunisia' },
  { city: 'Sousse', country: 'Tunisia' },
  { city: 'Sfax', country: 'Tunisia' },
  // Uganda
  { city: 'Kampala', country: 'Uganda' },
  { city: 'Entebbe', country: 'Uganda' },
  { city: 'Jinja', country: 'Uganda' },
  { city: 'Mbarara', country: 'Uganda' },
  { city: 'Fort Portal', country: 'Uganda' },
  { city: 'Gulu', country: 'Uganda' },
  { city: 'Mbale', country: 'Uganda' },
  { city: 'Masaka', country: 'Uganda' },
  { city: 'Kabale', country: 'Uganda' },
  { city: 'Lira', country: 'Uganda' },
  { city: 'Soroti', country: 'Uganda' },
  { city: 'Mukono', country: 'Uganda' },
  { city: 'Wakiso', country: 'Uganda' },
  { city: 'Kasese', country: 'Uganda' },
  { city: 'Hoima', country: 'Uganda' },
  { city: 'Arua', country: 'Uganda' },
  { city: 'Tororo', country: 'Uganda' },
  { city: 'Iganga', country: 'Uganda' },
  { city: 'Bwindi', country: 'Uganda' },
  { city: 'Kibale', country: 'Uganda' },
  // Zambia
  { city: 'Lusaka', country: 'Zambia' },
  { city: 'Livingstone', country: 'Zambia' },
  { city: 'Ndola', country: 'Zambia' },
  { city: 'Kitwe', country: 'Zambia' },
  // Zimbabwe
  { city: 'Harare', country: 'Zimbabwe' },
  { city: 'Bulawayo', country: 'Zimbabwe' },
  { city: 'Victoria Falls', country: 'Zimbabwe' },

  // =====================================================
  // EUROPE
  // =====================================================
  // Albania
  { city: 'Tirana', country: 'Albania' },
  { city: 'Durrës', country: 'Albania' },
  // Austria
  { city: 'Vienna', country: 'Austria' },
  { city: 'Salzburg', country: 'Austria' },
  { city: 'Innsbruck', country: 'Austria' },
  { city: 'Graz', country: 'Austria' },
  // Belgium
  { city: 'Brussels', country: 'Belgium' },
  { city: 'Antwerp', country: 'Belgium' },
  { city: 'Bruges', country: 'Belgium' },
  { city: 'Ghent', country: 'Belgium' },
  // Bosnia and Herzegovina
  { city: 'Sarajevo', country: 'Bosnia and Herzegovina' },
  { city: 'Mostar', country: 'Bosnia and Herzegovina' },
  // Bulgaria
  { city: 'Sofia', country: 'Bulgaria' },
  { city: 'Plovdiv', country: 'Bulgaria' },
  { city: 'Varna', country: 'Bulgaria' },
  // Croatia
  { city: 'Zagreb', country: 'Croatia' },
  { city: 'Split', country: 'Croatia' },
  { city: 'Dubrovnik', country: 'Croatia' },
  { city: 'Zadar', country: 'Croatia' },
  // Cyprus
  { city: 'Nicosia', country: 'Cyprus' },
  { city: 'Limassol', country: 'Cyprus' },
  { city: 'Paphos', country: 'Cyprus' },
  // Czech Republic
  { city: 'Prague', country: 'Czech Republic' },
  { city: 'Brno', country: 'Czech Republic' },
  { city: 'Český Krumlov', country: 'Czech Republic' },
  // Denmark
  { city: 'Copenhagen', country: 'Denmark' },
  { city: 'Aarhus', country: 'Denmark' },
  { city: 'Odense', country: 'Denmark' },
  // Estonia
  { city: 'Tallinn', country: 'Estonia' },
  { city: 'Tartu', country: 'Estonia' },
  // Finland
  { city: 'Helsinki', country: 'Finland' },
  { city: 'Tampere', country: 'Finland' },
  { city: 'Turku', country: 'Finland' },
  { city: 'Rovaniemi', country: 'Finland' },
  // France
  { city: 'Paris', country: 'France' },
  { city: 'Lyon', country: 'France' },
  { city: 'Marseille', country: 'France' },
  { city: 'Nice', country: 'France' },
  { city: 'Bordeaux', country: 'France' },
  { city: 'Toulouse', country: 'France' },
  { city: 'Strasbourg', country: 'France' },
  { city: 'Lille', country: 'France' },
  { city: 'Montpellier', country: 'France' },
  { city: 'Cannes', country: 'France' },
  // Georgia
  { city: 'Tbilisi', country: 'Georgia' },
  { city: 'Batumi', country: 'Georgia' },
  // Germany
  { city: 'Berlin', country: 'Germany' },
  { city: 'Munich', country: 'Germany' },
  { city: 'Frankfurt', country: 'Germany' },
  { city: 'Hamburg', country: 'Germany' },
  { city: 'Cologne', country: 'Germany' },
  { city: 'Düsseldorf', country: 'Germany' },
  { city: 'Stuttgart', country: 'Germany' },
  { city: 'Dresden', country: 'Germany' },
  { city: 'Leipzig', country: 'Germany' },
  { city: 'Heidelberg', country: 'Germany' },
  // Greece
  { city: 'Athens', country: 'Greece' },
  { city: 'Thessaloniki', country: 'Greece' },
  { city: 'Santorini', country: 'Greece' },
  { city: 'Mykonos', country: 'Greece' },
  { city: 'Crete', country: 'Greece' },
  { city: 'Rhodes', country: 'Greece' },
  // Hungary
  { city: 'Budapest', country: 'Hungary' },
  { city: 'Debrecen', country: 'Hungary' },
  // Iceland
  { city: 'Reykjavik', country: 'Iceland' },
  // Ireland
  { city: 'Dublin', country: 'Ireland' },
  { city: 'Cork', country: 'Ireland' },
  { city: 'Galway', country: 'Ireland' },
  { city: 'Limerick', country: 'Ireland' },
  // Italy
  { city: 'Rome', country: 'Italy' },
  { city: 'Milan', country: 'Italy' },
  { city: 'Florence', country: 'Italy' },
  { city: 'Venice', country: 'Italy' },
  { city: 'Naples', country: 'Italy' },
  { city: 'Turin', country: 'Italy' },
  { city: 'Bologna', country: 'Italy' },
  { city: 'Palermo', country: 'Italy' },
  { city: 'Verona', country: 'Italy' },
  { city: 'Amalfi', country: 'Italy' },
  { city: 'Cinque Terre', country: 'Italy' },
  // Latvia
  { city: 'Riga', country: 'Latvia' },
  // Lithuania
  { city: 'Vilnius', country: 'Lithuania' },
  { city: 'Kaunas', country: 'Lithuania' },
  // Luxembourg
  { city: 'Luxembourg City', country: 'Luxembourg' },
  // Malta
  { city: 'Valletta', country: 'Malta' },
  // Moldova
  { city: 'Chișinău', country: 'Moldova' },
  // Monaco
  { city: 'Monaco', country: 'Monaco' },
  // Montenegro
  { city: 'Podgorica', country: 'Montenegro' },
  { city: 'Kotor', country: 'Montenegro' },
  { city: 'Budva', country: 'Montenegro' },
  // Netherlands
  { city: 'Amsterdam', country: 'Netherlands' },
  { city: 'Rotterdam', country: 'Netherlands' },
  { city: 'The Hague', country: 'Netherlands' },
  { city: 'Utrecht', country: 'Netherlands' },
  { city: 'Eindhoven', country: 'Netherlands' },
  // North Macedonia
  { city: 'Skopje', country: 'North Macedonia' },
  { city: 'Ohrid', country: 'North Macedonia' },
  // Norway
  { city: 'Oslo', country: 'Norway' },
  { city: 'Bergen', country: 'Norway' },
  { city: 'Tromsø', country: 'Norway' },
  { city: 'Stavanger', country: 'Norway' },
  // Poland
  { city: 'Warsaw', country: 'Poland' },
  { city: 'Kraków', country: 'Poland' },
  { city: 'Gdańsk', country: 'Poland' },
  { city: 'Wrocław', country: 'Poland' },
  { city: 'Poznań', country: 'Poland' },
  // Portugal
  { city: 'Lisbon', country: 'Portugal' },
  { city: 'Porto', country: 'Portugal' },
  { city: 'Faro', country: 'Portugal' },
  { city: 'Funchal', country: 'Portugal' },
  // Romania
  { city: 'Bucharest', country: 'Romania' },
  { city: 'Cluj-Napoca', country: 'Romania' },
  { city: 'Brașov', country: 'Romania' },
  { city: 'Sibiu', country: 'Romania' },
  // Russia
  { city: 'Moscow', country: 'Russia' },
  { city: 'Saint Petersburg', country: 'Russia' },
  { city: 'Sochi', country: 'Russia' },
  { city: 'Kazan', country: 'Russia' },
  // Serbia
  { city: 'Belgrade', country: 'Serbia' },
  { city: 'Novi Sad', country: 'Serbia' },
  // Slovakia
  { city: 'Bratislava', country: 'Slovakia' },
  { city: 'Košice', country: 'Slovakia' },
  // Slovenia
  { city: 'Ljubljana', country: 'Slovenia' },
  { city: 'Bled', country: 'Slovenia' },
  // Spain
  { city: 'Madrid', country: 'Spain' },
  { city: 'Barcelona', country: 'Spain' },
  { city: 'Seville', country: 'Spain' },
  { city: 'Valencia', country: 'Spain' },
  { city: 'Granada', country: 'Spain' },
  { city: 'Bilbao', country: 'Spain' },
  { city: 'Málaga', country: 'Spain' },
  { city: 'San Sebastián', country: 'Spain' },
  { city: 'Palma de Mallorca', country: 'Spain' },
  { city: 'Ibiza', country: 'Spain' },
  // Sweden
  { city: 'Stockholm', country: 'Sweden' },
  { city: 'Gothenburg', country: 'Sweden' },
  { city: 'Malmö', country: 'Sweden' },
  { city: 'Uppsala', country: 'Sweden' },
  // Switzerland
  { city: 'Zurich', country: 'Switzerland' },
  { city: 'Geneva', country: 'Switzerland' },
  { city: 'Bern', country: 'Switzerland' },
  { city: 'Basel', country: 'Switzerland' },
  { city: 'Lausanne', country: 'Switzerland' },
  { city: 'Lucerne', country: 'Switzerland' },
  { city: 'Interlaken', country: 'Switzerland' },
  // Turkey
  { city: 'Istanbul', country: 'Turkey' },
  { city: 'Ankara', country: 'Turkey' },
  { city: 'Antalya', country: 'Turkey' },
  { city: 'Izmir', country: 'Turkey' },
  { city: 'Cappadocia', country: 'Turkey' },
  { city: 'Bodrum', country: 'Turkey' },
  // Ukraine
  { city: 'Kyiv', country: 'Ukraine' },
  { city: 'Lviv', country: 'Ukraine' },
  { city: 'Odesa', country: 'Ukraine' },
  // United Kingdom
  { city: 'London', country: 'United Kingdom' },
  { city: 'Manchester', country: 'United Kingdom' },
  { city: 'Birmingham', country: 'United Kingdom' },
  { city: 'Edinburgh', country: 'United Kingdom' },
  { city: 'Glasgow', country: 'United Kingdom' },
  { city: 'Liverpool', country: 'United Kingdom' },
  { city: 'Bristol', country: 'United Kingdom' },
  { city: 'Leeds', country: 'United Kingdom' },
  { city: 'Belfast', country: 'United Kingdom' },
  { city: 'Cardiff', country: 'United Kingdom' },
  { city: 'Oxford', country: 'United Kingdom' },
  { city: 'Cambridge', country: 'United Kingdom' },
  { city: 'Bath', country: 'United Kingdom' },
  { city: 'York', country: 'United Kingdom' },

  // =====================================================
  // ASIA
  // =====================================================
  // Armenia
  { city: 'Yerevan', country: 'Armenia' },
  // Azerbaijan
  { city: 'Baku', country: 'Azerbaijan' },
  // Bahrain
  { city: 'Manama', country: 'Bahrain' },
  // Bangladesh
  { city: 'Dhaka', country: 'Bangladesh' },
  { city: 'Chittagong', country: 'Bangladesh' },
  { city: 'Sylhet', country: 'Bangladesh' },
  // Bhutan
  { city: 'Thimphu', country: 'Bhutan' },
  { city: 'Paro', country: 'Bhutan' },
  // Brunei
  { city: 'Bandar Seri Begawan', country: 'Brunei' },
  // Cambodia
  { city: 'Phnom Penh', country: 'Cambodia' },
  { city: 'Siem Reap', country: 'Cambodia' },
  { city: 'Sihanoukville', country: 'Cambodia' },
  // China
  { city: 'Beijing', country: 'China' },
  { city: 'Shanghai', country: 'China' },
  { city: 'Guangzhou', country: 'China' },
  { city: 'Shenzhen', country: 'China' },
  { city: 'Chengdu', country: 'China' },
  { city: 'Hong Kong', country: 'China' },
  { city: 'Macau', country: 'China' },
  { city: "Xi'an", country: 'China' },
  { city: 'Hangzhou', country: 'China' },
  { city: 'Chongqing', country: 'China' },
  { city: 'Guilin', country: 'China' },
  { city: 'Kunming', country: 'China' },
  { city: 'Lhasa', country: 'China' },
  // India
  { city: 'New Delhi', country: 'India' },
  { city: 'Mumbai', country: 'India' },
  { city: 'Bangalore', country: 'India' },
  { city: 'Chennai', country: 'India' },
  { city: 'Kolkata', country: 'India' },
  { city: 'Hyderabad', country: 'India' },
  { city: 'Pune', country: 'India' },
  { city: 'Ahmedabad', country: 'India' },
  { city: 'Jaipur', country: 'India' },
  { city: 'Goa', country: 'India' },
  { city: 'Agra', country: 'India' },
  { city: 'Varanasi', country: 'India' },
  { city: 'Udaipur', country: 'India' },
  { city: 'Kochi', country: 'India' },
  { city: 'Amritsar', country: 'India' },
  { city: 'Rishikesh', country: 'India' },
  { city: 'Shimla', country: 'India' },
  { city: 'Darjeeling', country: 'India' },
  // Indonesia
  { city: 'Jakarta', country: 'Indonesia' },
  { city: 'Bali', country: 'Indonesia' },
  { city: 'Surabaya', country: 'Indonesia' },
  { city: 'Bandung', country: 'Indonesia' },
  { city: 'Yogyakarta', country: 'Indonesia' },
  { city: 'Medan', country: 'Indonesia' },
  { city: 'Lombok', country: 'Indonesia' },
  // Iran
  { city: 'Tehran', country: 'Iran' },
  { city: 'Isfahan', country: 'Iran' },
  { city: 'Shiraz', country: 'Iran' },
  // Iraq
  { city: 'Baghdad', country: 'Iraq' },
  { city: 'Erbil', country: 'Iraq' },
  // Israel
  { city: 'Tel Aviv', country: 'Israel' },
  { city: 'Jerusalem', country: 'Israel' },
  { city: 'Haifa', country: 'Israel' },
  { city: 'Eilat', country: 'Israel' },
  // Japan
  { city: 'Tokyo', country: 'Japan' },
  { city: 'Osaka', country: 'Japan' },
  { city: 'Kyoto', country: 'Japan' },
  { city: 'Yokohama', country: 'Japan' },
  { city: 'Hiroshima', country: 'Japan' },
  { city: 'Sapporo', country: 'Japan' },
  { city: 'Fukuoka', country: 'Japan' },
  { city: 'Nagoya', country: 'Japan' },
  { city: 'Nara', country: 'Japan' },
  { city: 'Okinawa', country: 'Japan' },
  // Jordan
  { city: 'Amman', country: 'Jordan' },
  { city: 'Aqaba', country: 'Jordan' },
  { city: 'Petra', country: 'Jordan' },
  // Kazakhstan
  { city: 'Almaty', country: 'Kazakhstan' },
  { city: 'Astana', country: 'Kazakhstan' },
  // Kuwait
  { city: 'Kuwait City', country: 'Kuwait' },
  // Kyrgyzstan
  { city: 'Bishkek', country: 'Kyrgyzstan' },
  // Laos
  { city: 'Vientiane', country: 'Laos' },
  { city: 'Luang Prabang', country: 'Laos' },
  // Lebanon
  { city: 'Beirut', country: 'Lebanon' },
  { city: 'Byblos', country: 'Lebanon' },
  // Malaysia
  { city: 'Kuala Lumpur', country: 'Malaysia' },
  { city: 'George Town', country: 'Malaysia' },
  { city: 'Langkawi', country: 'Malaysia' },
  { city: 'Kota Kinabalu', country: 'Malaysia' },
  { city: 'Malacca', country: 'Malaysia' },
  // Maldives
  { city: 'Malé', country: 'Maldives' },
  // Mongolia
  { city: 'Ulaanbaatar', country: 'Mongolia' },
  // Myanmar
  { city: 'Yangon', country: 'Myanmar' },
  { city: 'Mandalay', country: 'Myanmar' },
  { city: 'Bagan', country: 'Myanmar' },
  // Nepal
  { city: 'Kathmandu', country: 'Nepal' },
  { city: 'Pokhara', country: 'Nepal' },
  { city: 'Lumbini', country: 'Nepal' },
  // Oman
  { city: 'Muscat', country: 'Oman' },
  { city: 'Salalah', country: 'Oman' },
  // Pakistan
  { city: 'Islamabad', country: 'Pakistan' },
  { city: 'Karachi', country: 'Pakistan' },
  { city: 'Lahore', country: 'Pakistan' },
  { city: 'Peshawar', country: 'Pakistan' },
  // Palestine
  { city: 'Ramallah', country: 'Palestine' },
  { city: 'Bethlehem', country: 'Palestine' },
  // Philippines
  { city: 'Manila', country: 'Philippines' },
  { city: 'Cebu City', country: 'Philippines' },
  { city: 'Boracay', country: 'Philippines' },
  { city: 'Palawan', country: 'Philippines' },
  { city: 'Davao', country: 'Philippines' },
  // Qatar
  { city: 'Doha', country: 'Qatar' },
  // Saudi Arabia
  { city: 'Riyadh', country: 'Saudi Arabia' },
  { city: 'Jeddah', country: 'Saudi Arabia' },
  { city: 'Mecca', country: 'Saudi Arabia' },
  { city: 'Medina', country: 'Saudi Arabia' },
  { city: 'Dammam', country: 'Saudi Arabia' },
  // Singapore
  { city: 'Singapore', country: 'Singapore' },
  // South Korea
  { city: 'Seoul', country: 'South Korea' },
  { city: 'Busan', country: 'South Korea' },
  { city: 'Incheon', country: 'South Korea' },
  { city: 'Jeju', country: 'South Korea' },
  { city: 'Daegu', country: 'South Korea' },
  // Sri Lanka
  { city: 'Colombo', country: 'Sri Lanka' },
  { city: 'Kandy', country: 'Sri Lanka' },
  { city: 'Galle', country: 'Sri Lanka' },
  { city: 'Ella', country: 'Sri Lanka' },
  // Taiwan
  { city: 'Taipei', country: 'Taiwan' },
  { city: 'Kaohsiung', country: 'Taiwan' },
  { city: 'Taichung', country: 'Taiwan' },
  // Tajikistan
  { city: 'Dushanbe', country: 'Tajikistan' },
  // Thailand
  { city: 'Bangkok', country: 'Thailand' },
  { city: 'Chiang Mai', country: 'Thailand' },
  { city: 'Phuket', country: 'Thailand' },
  { city: 'Pattaya', country: 'Thailand' },
  { city: 'Krabi', country: 'Thailand' },
  { city: 'Koh Samui', country: 'Thailand' },
  // Timor-Leste
  { city: 'Dili', country: 'Timor-Leste' },
  // Turkmenistan
  { city: 'Ashgabat', country: 'Turkmenistan' },
  // United Arab Emirates
  { city: 'Dubai', country: 'United Arab Emirates' },
  { city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { city: 'Sharjah', country: 'United Arab Emirates' },
  { city: 'Ras Al Khaimah', country: 'United Arab Emirates' },
  // Uzbekistan
  { city: 'Tashkent', country: 'Uzbekistan' },
  { city: 'Samarkand', country: 'Uzbekistan' },
  { city: 'Bukhara', country: 'Uzbekistan' },
  // Vietnam
  { city: 'Ho Chi Minh City', country: 'Vietnam' },
  { city: 'Hanoi', country: 'Vietnam' },
  { city: 'Da Nang', country: 'Vietnam' },
  { city: 'Hoi An', country: 'Vietnam' },
  { city: 'Nha Trang', country: 'Vietnam' },
  { city: 'Ha Long Bay', country: 'Vietnam' },

  // =====================================================
  // NORTH AMERICA
  // =====================================================
  // Canada
  { city: 'Toronto', country: 'Canada' },
  { city: 'Vancouver', country: 'Canada' },
  { city: 'Montréal', country: 'Canada' },
  { city: 'Ottawa', country: 'Canada' },
  { city: 'Calgary', country: 'Canada' },
  { city: 'Edmonton', country: 'Canada' },
  { city: 'Winnipeg', country: 'Canada' },
  { city: 'Quebec City', country: 'Canada' },
  { city: 'Halifax', country: 'Canada' },
  { city: 'Victoria', country: 'Canada' },
  { city: 'Banff', country: 'Canada' },
  // Costa Rica
  { city: 'San José', country: 'Costa Rica' },
  { city: 'La Fortuna', country: 'Costa Rica' },
  // Cuba
  { city: 'Havana', country: 'Cuba' },
  { city: 'Trinidad', country: 'Cuba' },
  { city: 'Varadero', country: 'Cuba' },
  // Dominican Republic
  { city: 'Santo Domingo', country: 'Dominican Republic' },
  { city: 'Punta Cana', country: 'Dominican Republic' },
  // El Salvador
  { city: 'San Salvador', country: 'El Salvador' },
  // Guatemala
  { city: 'Guatemala City', country: 'Guatemala' },
  { city: 'Antigua', country: 'Guatemala' },
  // Haiti
  { city: 'Port-au-Prince', country: 'Haiti' },
  // Honduras
  { city: 'Tegucigalpa', country: 'Honduras' },
  { city: 'Roatán', country: 'Honduras' },
  // Jamaica
  { city: 'Kingston', country: 'Jamaica' },
  { city: 'Montego Bay', country: 'Jamaica' },
  { city: 'Ocho Rios', country: 'Jamaica' },
  // Mexico
  { city: 'Mexico City', country: 'Mexico' },
  { city: 'Cancún', country: 'Mexico' },
  { city: 'Guadalajara', country: 'Mexico' },
  { city: 'Monterrey', country: 'Mexico' },
  { city: 'Playa del Carmen', country: 'Mexico' },
  { city: 'Tulum', country: 'Mexico' },
  { city: 'Puerto Vallarta', country: 'Mexico' },
  { city: 'Oaxaca', country: 'Mexico' },
  { city: 'San Miguel de Allende', country: 'Mexico' },
  { city: 'Mérida', country: 'Mexico' },
  // Nicaragua
  { city: 'Managua', country: 'Nicaragua' },
  { city: 'Granada', country: 'Nicaragua' },
  // Panama
  { city: 'Panama City', country: 'Panama' },
  { city: 'Bocas del Toro', country: 'Panama' },
  // Puerto Rico
  { city: 'San Juan', country: 'Puerto Rico' },
  // Trinidad and Tobago
  { city: 'Port of Spain', country: 'Trinidad and Tobago' },
  // United States
  { city: 'New York', country: 'United States' },
  { city: 'Los Angeles', country: 'United States' },
  { city: 'Chicago', country: 'United States' },
  { city: 'Houston', country: 'United States' },
  { city: 'Phoenix', country: 'United States' },
  { city: 'Philadelphia', country: 'United States' },
  { city: 'San Antonio', country: 'United States' },
  { city: 'San Diego', country: 'United States' },
  { city: 'Dallas', country: 'United States' },
  { city: 'San Francisco', country: 'United States' },
  { city: 'Austin', country: 'United States' },
  { city: 'Seattle', country: 'United States' },
  { city: 'Denver', country: 'United States' },
  { city: 'Washington D.C.', country: 'United States' },
  { city: 'Boston', country: 'United States' },
  { city: 'Nashville', country: 'United States' },
  { city: 'Atlanta', country: 'United States' },
  { city: 'Miami', country: 'United States' },
  { city: 'Orlando', country: 'United States' },
  { city: 'Las Vegas', country: 'United States' },
  { city: 'Portland', country: 'United States' },
  { city: 'Minneapolis', country: 'United States' },
  { city: 'Detroit', country: 'United States' },
  { city: 'New Orleans', country: 'United States' },
  { city: 'Honolulu', country: 'United States' },
  { city: 'Salt Lake City', country: 'United States' },
  { city: 'Charlotte', country: 'United States' },
  { city: 'Indianapolis', country: 'United States' },
  { city: 'Columbus', country: 'United States' },
  { city: 'Tampa', country: 'United States' },
  { city: 'Pittsburgh', country: 'United States' },
  { city: 'Savannah', country: 'United States' },
  { city: 'Charleston', country: 'United States' },
  { city: 'Anchorage', country: 'United States' },

  // =====================================================
  // SOUTH AMERICA
  // =====================================================
  // Argentina
  { city: 'Buenos Aires', country: 'Argentina' },
  { city: 'Mendoza', country: 'Argentina' },
  { city: 'Bariloche', country: 'Argentina' },
  { city: 'Córdoba', country: 'Argentina' },
  { city: 'Ushuaia', country: 'Argentina' },
  { city: 'Salta', country: 'Argentina' },
  // Bolivia
  { city: 'La Paz', country: 'Bolivia' },
  { city: 'Sucre', country: 'Bolivia' },
  { city: 'Santa Cruz', country: 'Bolivia' },
  { city: 'Uyuni', country: 'Bolivia' },
  // Brazil
  { city: 'São Paulo', country: 'Brazil' },
  { city: 'Rio de Janeiro', country: 'Brazil' },
  { city: 'Brasília', country: 'Brazil' },
  { city: 'Salvador', country: 'Brazil' },
  { city: 'Fortaleza', country: 'Brazil' },
  { city: 'Belo Horizonte', country: 'Brazil' },
  { city: 'Florianópolis', country: 'Brazil' },
  { city: 'Manaus', country: 'Brazil' },
  { city: 'Recife', country: 'Brazil' },
  { city: 'Curitiba', country: 'Brazil' },
  // Chile
  { city: 'Santiago', country: 'Chile' },
  { city: 'Valparaíso', country: 'Chile' },
  { city: 'San Pedro de Atacama', country: 'Chile' },
  { city: 'Punta Arenas', country: 'Chile' },
  // Colombia
  { city: 'Bogotá', country: 'Colombia' },
  { city: 'Medellín', country: 'Colombia' },
  { city: 'Cartagena', country: 'Colombia' },
  { city: 'Cali', country: 'Colombia' },
  { city: 'Santa Marta', country: 'Colombia' },
  { city: 'Barranquilla', country: 'Colombia' },
  // Ecuador
  { city: 'Quito', country: 'Ecuador' },
  { city: 'Guayaquil', country: 'Ecuador' },
  { city: 'Cuenca', country: 'Ecuador' },
  { city: 'Galápagos', country: 'Ecuador' },
  // Guyana
  { city: 'Georgetown', country: 'Guyana' },
  // Paraguay
  { city: 'Asunción', country: 'Paraguay' },
  // Peru
  { city: 'Lima', country: 'Peru' },
  { city: 'Cusco', country: 'Peru' },
  { city: 'Arequipa', country: 'Peru' },
  { city: 'Machu Picchu', country: 'Peru' },
  // Suriname
  { city: 'Paramaribo', country: 'Suriname' },
  // Uruguay
  { city: 'Montevideo', country: 'Uruguay' },
  { city: 'Punta del Este', country: 'Uruguay' },
  // Venezuela
  { city: 'Caracas', country: 'Venezuela' },
  { city: 'Mérida', country: 'Venezuela' },

  // =====================================================
  // OCEANIA
  // =====================================================
  // Australia
  { city: 'Sydney', country: 'Australia' },
  { city: 'Melbourne', country: 'Australia' },
  { city: 'Brisbane', country: 'Australia' },
  { city: 'Perth', country: 'Australia' },
  { city: 'Adelaide', country: 'Australia' },
  { city: 'Gold Coast', country: 'Australia' },
  { city: 'Canberra', country: 'Australia' },
  { city: 'Hobart', country: 'Australia' },
  { city: 'Darwin', country: 'Australia' },
  { city: 'Cairns', country: 'Australia' },
  { city: 'Byron Bay', country: 'Australia' },
  // Fiji
  { city: 'Suva', country: 'Fiji' },
  { city: 'Nadi', country: 'Fiji' },
  // New Zealand
  { city: 'Auckland', country: 'New Zealand' },
  { city: 'Wellington', country: 'New Zealand' },
  { city: 'Christchurch', country: 'New Zealand' },
  { city: 'Queenstown', country: 'New Zealand' },
  { city: 'Rotorua', country: 'New Zealand' },
  { city: 'Dunedin', country: 'New Zealand' },
  // Papua New Guinea
  { city: 'Port Moresby', country: 'Papua New Guinea' },
  // Samoa
  { city: 'Apia', country: 'Samoa' },
  // Tonga
  { city: "Nuku'alofa", country: 'Tonga' },
  // Vanuatu
  { city: 'Port Vila', country: 'Vanuatu' },
]

/**
 * Search cities by query string (matches city or country).
 * Returns up to `limit` results.  City-name matches rank first.
 */
export function searchCities(query: string, limit = 30): CityEntry[] {
  if (!query.trim()) return CITIES.slice(0, limit)
  const q = query.toLowerCase().trim()
  // Prioritise city-name matches, then country matches
  const cityMatches: CityEntry[] = []
  const countryMatches: CityEntry[] = []
  for (const c of CITIES) {
    if (c.city.toLowerCase().includes(q)) {
      cityMatches.push(c)
    } else if (c.country.toLowerCase().includes(q)) {
      countryMatches.push(c)
    }
    if (cityMatches.length + countryMatches.length >= limit) break
  }
  return [...cityMatches, ...countryMatches].slice(0, limit)
}
