import { useState } from 'react'

interface PhoneModalProps {
  phone: string
  countryCode: string
  onPhoneChange: (phone: string) => void
  onCountryCodeChange: (countryCode: string) => void
  placeholder?: string
}

const countries = [
  { code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: '+7', name: 'Russia', flag: '🇷🇺' },
  { code: '+20', name: 'Egypt', flag: '🇪🇬' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: '+30', name: 'Greece', flag: '🇬🇷' },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱' },
  { code: '+32', name: 'Belgium', flag: '🇧🇪' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: '+36', name: 'Hungary', flag: '🇭🇺' },
  { code: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: '+40', name: 'Romania', flag: '🇷🇴' },
  { code: '+41', name: 'Switzerland', flag: '🇨🇭' },
  { code: '+43', name: 'Austria', flag: '🇦🇹' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+45', name: 'Denmark', flag: '🇩🇰' },
  { code: '+46', name: 'Sweden', flag: '🇸🇪' },
  { code: '+47', name: 'Norway', flag: '🇳🇴' },
  { code: '+48', name: 'Poland', flag: '🇵🇱' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+51', name: 'Peru', flag: '🇵🇪' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽' },
  { code: '+53', name: 'Cuba', flag: '🇨🇺' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: '+57', name: 'Colombia', flag: '🇨🇴' },
  { code: '+58', name: 'Venezuela', flag: '🇻🇪' },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+62', name: 'Indonesia', flag: '🇮🇩' },
  { code: '+63', name: 'Philippines', flag: '🇵🇭' },
  { code: '+64', name: 'New Zealand', flag: '🇳🇿' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: '+66', name: 'Thailand', flag: '🇹🇭' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷' },
  { code: '+84', name: 'Vietnam', flag: '🇻🇳' },
  { code: '+86', name: 'China', flag: '🇨🇳' },
  { code: '+90', name: 'Turkey', flag: '🇹🇷' },
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+92', name: 'Pakistan', flag: '🇵🇰' },
  { code: '+93', name: 'Afghanistan', flag: '🇦🇫' },
  { code: '+94', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+95', name: 'Myanmar', flag: '🇲🇲' },
  { code: '+98', name: 'Iran', flag: '🇮🇷' },
  { code: '+211', name: 'South Sudan', flag: '🇸🇸' },
  { code: '+212', name: 'Morocco', flag: '🇲🇦' },
  { code: '+213', name: 'Algeria', flag: '🇩🇿' },
  { code: '+216', name: 'Tunisia', flag: '🇹🇳' },
  { code: '+218', name: 'Libya', flag: '🇱🇾' },
  { code: '+220', name: 'Gambia', flag: '🇬🇲' },
  { code: '+221', name: 'Senegal', flag: '🇸🇳' },
  { code: '+222', name: 'Mauritania', flag: '🇲🇷' },
  { code: '+223', name: 'Mali', flag: '🇲🇱' },
  { code: '+224', name: 'Guinea', flag: '🇬🇳' },
  { code: '+225', name: 'Ivory Coast', flag: '🇨🇮' },
  { code: '+226', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: '+227', name: 'Niger', flag: '🇳🇪' },
  { code: '+228', name: 'Togo', flag: '🇹🇬' },
  { code: '+229', name: 'Benin', flag: '🇧🇯' },
  { code: '+230', name: 'Mauritius', flag: '🇲🇺' },
  { code: '+231', name: 'Liberia', flag: '🇱🇷' },
  { code: '+232', name: 'Sierra Leone', flag: '🇸🇱' },
  { code: '+233', name: 'Ghana', flag: '🇬🇭' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
  { code: '+235', name: 'Chad', flag: '🇹🇩' },
  { code: '+236', name: 'Central African Republic', flag: '🇨🇫' },
  { code: '+237', name: 'Cameroon', flag: '🇨🇲' },
  { code: '+238', name: 'Cape Verde', flag: '🇨🇻' },
  { code: '+239', name: 'São Tomé and Príncipe', flag: '🇸🇹' },
  { code: '+240', name: 'Equatorial Guinea', flag: '🇬🇶' },
  { code: '+241', name: 'Gabon', flag: '🇬🇦' },
  { code: '+242', name: 'Republic of the Congo', flag: '🇨🇬' },
  { code: '+243', name: 'Democratic Republic of the Congo', flag: '🇨🇩' },
  { code: '+244', name: 'Angola', flag: '🇦🇴' },
  { code: '+245', name: 'Guinea-Bissau', flag: '🇬🇼' },
  { code: '+246', name: 'British Indian Ocean Territory', flag: '🇮🇴' },
  { code: '+247', name: 'Ascension Island', flag: '🇦🇨' },
  { code: '+248', name: 'Seychelles', flag: '🇸🇨' },
  { code: '+249', name: 'Sudan', flag: '🇸🇩' },
  { code: '+250', name: 'Rwanda', flag: '🇷🇼' },
  { code: '+251', name: 'Ethiopia', flag: '🇪🇹' },
  { code: '+252', name: 'Somalia', flag: '🇸🇴' },
  { code: '+253', name: 'Djibouti', flag: '🇩🇯' },
  { code: '+254', name: 'Kenya', flag: '🇰🇪' },
  { code: '+255', name: 'Tanzania', flag: '🇹🇿' },
  { code: '+256', name: 'Uganda', flag: '🇺🇬' },
  { code: '+257', name: 'Burundi', flag: '🇧🇮' },
  { code: '+258', name: 'Mozambique', flag: '🇲🇿' },
  { code: '+260', name: 'Zambia', flag: '🇿🇲' },
  { code: '+261', name: 'Madagascar', flag: '🇲🇬' },
  { code: '+262', name: 'Réunion', flag: '🇷🇪' },
  { code: '+263', name: 'Zimbabwe', flag: '🇿🇼' },
  { code: '+264', name: 'Namibia', flag: '🇳🇦' },
  { code: '+265', name: 'Malawi', flag: '🇲🇼' },
  { code: '+266', name: 'Lesotho', flag: '🇱🇸' },
  { code: '+267', name: 'Botswana', flag: '🇧🇼' },
  { code: '+268', name: 'Eswatini', flag: '🇸🇿' },
  { code: '+269', name: 'Comoros', flag: '🇰🇲' },
  { code: '+290', name: 'Saint Helena', flag: '🇸🇭' },
  { code: '+291', name: 'Eritrea', flag: '🇪🇷' },
  { code: '+297', name: 'Aruba', flag: '🇦🇼' },
  { code: '+298', name: 'Faroe Islands', flag: '🇫🇴' },
  { code: '+299', name: 'Greenland', flag: '🇬🇱' },
  { code: '+350', name: 'Gibraltar', flag: '🇬🇮' },
  { code: '+351', name: 'Portugal', flag: '🇵🇹' },
  { code: '+352', name: 'Luxembourg', flag: '🇱🇺' },
  { code: '+353', name: 'Ireland', flag: '🇮🇪' },
  { code: '+354', name: 'Iceland', flag: '🇮🇸' },
  { code: '+355', name: 'Albania', flag: '🇦🇱' },
  { code: '+356', name: 'Malta', flag: '🇲🇹' },
  { code: '+357', name: 'Cyprus', flag: '🇨🇾' },
  { code: '+358', name: 'Finland', flag: '🇫🇮' },
  { code: '+359', name: 'Bulgaria', flag: '🇧🇬' },
  { code: '+370', name: 'Lithuania', flag: '🇱🇹' },
  { code: '+371', name: 'Latvia', flag: '🇱🇻' },
  { code: '+372', name: 'Estonia', flag: '🇪🇪' },
  { code: '+373', name: 'Moldova', flag: '🇲🇩' },
  { code: '+374', name: 'Armenia', flag: '🇦🇲' },
  { code: '+375', name: 'Belarus', flag: '🇧🇾' },
  { code: '+376', name: 'Andorra', flag: '🇦🇩' },
  { code: '+377', name: 'Monaco', flag: '🇲🇨' },
  { code: '+378', name: 'San Marino', flag: '🇸🇲' },
  { code: '+380', name: 'Ukraine', flag: '🇺🇦' },
  { code: '+381', name: 'Serbia', flag: '🇷🇸' },
  { code: '+382', name: 'Montenegro', flag: '🇲🇪' },
  { code: '+383', name: 'Kosovo', flag: '🇽🇰' },
  { code: '+385', name: 'Croatia', flag: '🇭🇷' },
  { code: '+386', name: 'Slovenia', flag: '🇸🇮' },
  { code: '+387', name: 'Bosnia and Herzegovina', flag: '🇧🇦' },
  { code: '+389', name: 'North Macedonia', flag: '🇲🇰' },
  { code: '+420', name: 'Czech Republic', flag: '🇨🇿' },
  { code: '+421', name: 'Slovakia', flag: '🇸🇰' },
  { code: '+423', name: 'Liechtenstein', flag: '🇱🇮' },
  { code: '+500', name: 'Falkland Islands', flag: '🇫🇰' },
  { code: '+501', name: 'Belize', flag: '🇧🇿' },
  { code: '+502', name: 'Guatemala', flag: '🇬🇹' },
  { code: '+503', name: 'El Salvador', flag: '🇸🇻' },
  { code: '+504', name: 'Honduras', flag: '🇭🇳' },
  { code: '+505', name: 'Nicaragua', flag: '🇳🇮' },
  { code: '+506', name: 'Costa Rica', flag: '🇨🇷' },
  { code: '+507', name: 'Panama', flag: '🇵🇦' },
  { code: '+508', name: 'Saint Pierre and Miquelon', flag: '🇵🇲' },
  { code: '+509', name: 'Haiti', flag: '🇭🇹' },
  { code: '+590', name: 'Guadeloupe', flag: '🇬🇵' },
  { code: '+591', name: 'Bolivia', flag: '🇧🇴' },
  { code: '+592', name: 'Guyana', flag: '🇬🇾' },
  { code: '+593', name: 'Ecuador', flag: '🇪🇨' },
  { code: '+594', name: 'French Guiana', flag: '🇬🇫' },
  { code: '+595', name: 'Paraguay', flag: '🇵🇾' },
  { code: '+596', name: 'Martinique', flag: '🇲🇶' },
  { code: '+597', name: 'Suriname', flag: '🇸🇷' },
  { code: '+598', name: 'Uruguay', flag: '🇺🇾' },
  { code: '+599', name: 'Curaçao', flag: '🇨🇼' },
  { code: '+670', name: 'East Timor', flag: '🇹🇱' },
  { code: '+672', name: 'Antarctica', flag: '🇦🇶' },
  { code: '+673', name: 'Brunei', flag: '🇧🇳' },
  { code: '+674', name: 'Nauru', flag: '🇳🇷' },
  { code: '+675', name: 'Papua New Guinea', flag: '🇵🇬' },
  { code: '+676', name: 'Tonga', flag: '🇹🇴' },
  { code: '+677', name: 'Solomon Islands', flag: '🇸🇧' },
  { code: '+678', name: 'Vanuatu', flag: '🇻🇺' },
  { code: '+679', name: 'Fiji', flag: '🇫🇯' },
  { code: '+680', name: 'Palau', flag: '🇵🇼' },
  { code: '+681', name: 'Wallis and Futuna', flag: '🇼🇫' },
  { code: '+682', name: 'Cook Islands', flag: '🇨🇰' },
  { code: '+683', name: 'Niue', flag: '🇳🇺' },
  { code: '+684', name: 'American Samoa', flag: '🇦🇸' },
  { code: '+685', name: 'Samoa', flag: '🇼🇸' },
  { code: '+686', name: 'Kiribati', flag: '🇰🇮' },
  { code: '+687', name: 'New Caledonia', flag: '🇳🇨' },
  { code: '+688', name: 'Tuvalu', flag: '🇹🇻' },
  { code: '+689', name: 'French Polynesia', flag: '🇵🇫' },
  { code: '+690', name: 'Tokelau', flag: '🇹🇰' },
  { code: '+691', name: 'Micronesia', flag: '🇫🇲' },
  { code: '+692', name: 'Marshall Islands', flag: '🇲🇭' },
  { code: '+850', name: 'North Korea', flag: '🇰🇵' },
  { code: '+852', name: 'Hong Kong', flag: '🇭🇰' },
  { code: '+853', name: 'Macau', flag: '🇲🇴' },
  { code: '+855', name: 'Cambodia', flag: '🇰🇭' },
  { code: '+856', name: 'Laos', flag: '🇱🇦' },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩' },
  { code: '+886', name: 'Taiwan', flag: '🇹🇼' },
  { code: '+960', name: 'Maldives', flag: '🇲🇻' },
  { code: '+961', name: 'Lebanon', flag: '🇱🇧' },
  { code: '+962', name: 'Jordan', flag: '🇯🇴' },
  { code: '+963', name: 'Syria', flag: '🇸🇾' },
  { code: '+964', name: 'Iraq', flag: '🇮🇶' },
  { code: '+965', name: 'Kuwait', flag: '🇰🇼' },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+967', name: 'Yemen', flag: '🇾🇪' },
  { code: '+968', name: 'Oman', flag: '🇴🇲' },
  { code: '+970', name: 'Palestine', flag: '🇵🇸' },
  { code: '+971', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: '+972', name: 'Israel', flag: '🇮🇱' },
  { code: '+973', name: 'Bahrain', flag: '🇧🇭' },
  { code: '+974', name: 'Qatar', flag: '🇶🇦' },
  { code: '+975', name: 'Bhutan', flag: '🇧🇹' },
  { code: '+976', name: 'Mongolia', flag: '🇲🇳' },
  { code: '+977', name: 'Nepal', flag: '🇳🇵' },
  { code: '+992', name: 'Tajikistan', flag: '🇹🇯' },
  { code: '+993', name: 'Turkmenistan', flag: '🇹🇲' },
  { code: '+994', name: 'Azerbaijan', flag: '🇦🇿' },
  { code: '+995', name: 'Georgia', flag: '🇬🇪' },
  { code: '+996', name: 'Kyrgyzstan', flag: '🇰🇬' },
  { code: '+998', name: 'Uzbekistan', flag: '🇺🇿' }
]

export default function PhoneModal({ phone, countryCode, onPhoneChange, onCountryCodeChange, placeholder = "700 000 000" }: PhoneModalProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.code.includes(countrySearch)
  )

  return (
    <div className="flex gap-2">
      <div className="relative business-phone-country-dropdown flex-shrink-0">
        <button
          type="button"
          className="border border-gray-300 px-3 py-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors bg-white flex items-center justify-between min-w-[90px] text-sm font-medium"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <span className="truncate">
            {countryCode}
          </span>
          <svg className="w-4 h-4 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {dropdownOpen && (
          <div className="absolute top-full left-0 z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            <div className="p-2 border-b">
              <input
                type="text"
                placeholder="Search country..."
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-400"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
              />
            </div>
            <div className="max-h-40 overflow-y-auto">
              {filteredCountries.map((country) => (
                <button
                  key={country.code + country.name}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-sm"
                  onClick={() => {
                    onCountryCodeChange(country.code)
                    setCountrySearch('')
                    setDropdownOpen(false)
                  }}
                >
                  <span className="text-sm">{country.name}</span>
                  <span className="text-sm text-gray-500 ml-auto">{country.code}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <input
        type="tel"
        value={phone}
        onChange={(e) => onPhoneChange(e.target.value)}
        className="flex-1 border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
        placeholder={placeholder}
      />
    </div>
  )
}