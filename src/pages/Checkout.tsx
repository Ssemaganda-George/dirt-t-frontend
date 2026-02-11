import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'

export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<any | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [allTicketTypes, setAllTicketTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [buyer, setBuyer] = useState({ name: '', surname: '', email: '', phone: '', countryCode: '+256', emailCopy: false })
  const [showAllTickets, setShowAllTickets] = useState(false)

  // Country search state
  const [countrySearch, setCountrySearch] = useState('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const { profile } = useAuth()
  const { selectedCurrency } = usePreferences()

  // Currency conversion rates (simplified)
  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
    const rates: { [key: string]: { [key: string]: number } } = {
      'UGX': { 'USD': 0.00027, 'EUR': 0.00025, 'GBP': 0.00021, 'ZAR': 0.005, 'KES': 0.027, 'TZS': 0.62, 'BRL': 0.0013, 'MXN': 0.0054, 'EGP': 0.0084, 'MAD': 0.0025, 'TRY': 0.0089, 'THB': 0.0095, 'KRW': 0.35, 'RUB': 0.025 },
      'USD': { 'UGX': 3700, 'EUR': 0.92, 'GBP': 0.79, 'ZAR': 18.5, 'KES': 100, 'TZS': 2300, 'BRL': 4.8, 'MXN': 20, 'EGP': 31, 'MAD': 9.2, 'TRY': 33, 'THB': 35, 'KRW': 1300, 'RUB': 92 },
      'EUR': { 'UGX': 4000, 'USD': 1.09, 'GBP': 0.86, 'ZAR': 20.1, 'KES': 109, 'TZS': 2500, 'BRL': 5.2, 'MXN': 21.8, 'EGP': 33.8, 'MAD': 10, 'TRY': 36, 'THB': 38, 'KRW': 1410, 'RUB': 100 },
      'GBP': { 'UGX': 4700, 'USD': 1.27, 'EUR': 1.16, 'ZAR': 23.4, 'KES': 127, 'TZS': 2900, 'BRL': 6.1, 'MXN': 25.5, 'EGP': 39.5, 'MAD': 11.7, 'TRY': 42, 'THB': 44.5, 'KRW': 1650, 'RUB': 117 },
      'ZAR': { 'UGX': 200, 'USD': 0.054, 'EUR': 0.050, 'GBP': 0.043, 'KES': 5.4, 'TZS': 124, 'BRL': 0.26, 'MXN': 1.08, 'EGP': 1.68, 'MAD': 0.50, 'TRY': 1.79, 'THB': 1.89, 'KRW': 70, 'RUB': 5.0 },
      'KES': { 'UGX': 37, 'USD': 0.01, 'EUR': 0.0092, 'GBP': 0.0079, 'ZAR': 0.185, 'TZS': 23, 'BRL': 0.048, 'MXN': 0.20, 'EGP': 0.31, 'MAD': 0.092, 'TRY': 0.33, 'THB': 0.35, 'KRW': 13, 'RUB': 0.92 },
      'TZS': { 'UGX': 1.61, 'USD': 0.00043, 'EUR': 0.0004, 'GBP': 0.00034, 'ZAR': 0.008, 'KES': 0.043, 'BRL': 0.0021, 'MXN': 0.0087, 'EGP': 0.0135, 'MAD': 0.004, 'TRY': 0.0143, 'THB': 0.0152, 'KRW': 0.565, 'RUB': 0.04 },
      'BRL': { 'UGX': 770, 'USD': 0.208, 'EUR': 0.192, 'GBP': 0.164, 'ZAR': 3.85, 'KES': 20.8, 'TZS': 476, 'MXN': 4.17, 'EGP': 6.46, 'MAD': 1.92, 'TRY': 6.88, 'THB': 7.29, 'KRW': 271, 'RUB': 19.2 },
      'MXN': { 'UGX': 185, 'USD': 0.05, 'EUR': 0.046, 'GBP': 0.039, 'ZAR': 0.926, 'KES': 5.0, 'TZS': 115, 'BRL': 0.24, 'EGP': 1.55, 'MAD': 0.46, 'TRY': 1.65, 'THB': 1.75, 'KRW': 65, 'RUB': 4.6 },
      'EGP': { 'UGX': 119, 'USD': 0.032, 'EUR': 0.030, 'GBP': 0.025, 'ZAR': 0.595, 'KES': 3.22, 'TZS': 74, 'BRL': 0.155, 'MXN': 0.645, 'MAD': 0.296, 'TRY': 1.06, 'THB': 1.13, 'KRW': 42, 'RUB': 2.96 },
      'MAD': { 'UGX': 400, 'USD': 0.109, 'EUR': 0.10, 'GBP': 0.085, 'ZAR': 2.0, 'KES': 10.9, 'TZS': 250, 'BRL': 0.52, 'MXN': 2.17, 'EGP': 3.38, 'TRY': 3.59, 'THB': 3.81, 'KRW': 142, 'RUB': 10.0 },
      'TRY': { 'UGX': 112, 'USD': 0.030, 'EUR': 0.028, 'GBP': 0.024, 'ZAR': 0.559, 'KES': 3.03, 'TZS': 70, 'BRL': 0.145, 'MXN': 0.606, 'EGP': 0.94, 'MAD': 0.279, 'THB': 0.296, 'KRW': 11, 'RUB': 0.78 },
      'THB': { 'UGX': 105, 'USD': 0.028, 'EUR': 0.026, 'GBP': 0.022, 'ZAR': 0.529, 'KES': 2.86, 'TZS': 66, 'BRL': 0.137, 'MXN': 0.571, 'EGP': 0.885, 'MAD': 0.262, 'TRY': 3.38, 'KRW': 10.5, 'RUB': 0.74 },
      'KRW': { 'UGX': 2.85, 'USD': 0.00077, 'EUR': 0.00071, 'GBP': 0.00061, 'ZAR': 0.0143, 'KES': 0.077, 'TZS': 1.77, 'BRL': 0.0037, 'MXN': 0.0154, 'EGP': 0.0238, 'MAD': 0.007, 'TRY': 0.090, 'THB': 0.095, 'RUB': 0.0067 },
      'RUB': { 'UGX': 40, 'USD': 0.011, 'EUR': 0.01, 'GBP': 0.0085, 'ZAR': 0.20, 'KES': 1.09, 'TZS': 25, 'BRL': 0.052, 'MXN': 0.217, 'EGP': 0.337, 'MAD': 0.10, 'TRY': 1.28, 'THB': 1.35, 'KRW': 50 }
    };

    if (rates[fromCurrency] && rates[fromCurrency][toCurrency]) {
      return amount * rates[fromCurrency][toCurrency];
    }
    return amount;
  }

  const formatAmount = (amount: number, currency: string): string => {
    const validCurrencies = ['UGX', 'USD', 'EUR', 'GBP', 'KES', 'TZS', 'RWF', 'ZAR', 'CAD', 'AUD', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK', 'JPY', 'CNY', 'INR', 'BRL', 'MXN', 'ARS', 'CLP', 'PEN', 'COP', 'EGP', 'MAD', 'TRY', 'THB', 'KRW', 'RUB'];
    const safeCurrency = validCurrencies.includes(currency) ? currency : 'UGX';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 0
    }).format(amount);
  }

  // Create a formatCurrency function that uses user preferences
  const formatCurrencyWithConversion = (amount: number, serviceCurrency: string) => {
    try {
      // Use user's selected currency preference
      const userCurrency = selectedCurrency || 'UGX';

      // If user's currency matches service currency, no conversion needed
      if (userCurrency === serviceCurrency) {
        return formatAmount(amount, userCurrency);
      }

      // Convert amount to user's currency
      const convertedAmount = convertCurrency(amount, serviceCurrency, userCurrency);

      return formatAmount(convertedAmount, userCurrency);
    } catch (error) {
      // Fallback to original service currency
      console.warn('Currency conversion failed, using original currency:', error);
      return formatAmount(amount, serviceCurrency);
    }
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
    { code: '+379', name: 'Vatican City', flag: '🇻🇦' },
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
  ];

  // Filter countries based on search
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.code.includes(countrySearch)
  )

  // Close country dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownOpen && !(event.target as Element).closest('.country-dropdown')) {
        setCountryDropdownOpen(false)
        setCountrySearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [countryDropdownOpen])

  useEffect(() => {
    const load = async () => {
      if (!orderId) return
      setLoading(true)
      try {
        const { data: o } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle()
        setOrder(o)

        // Load order items
        const { data: its } = await supabase.from('order_items').select('*').eq('order_id', orderId)
        const itemsData = its || []

        // Fetch ALL ticket_type records for this service so we can show available tickets
        let allTicketTypes: any[] = []
        let serviceForOrder: any = null
        if (itemsData.length > 0) {
          const ticketTypeIds = itemsData.map((it: any) => it.ticket_type_id)
          const { data: tts } = await supabase.from('ticket_types').select('*').in('id', ticketTypeIds)
          const ttMap: any = {};
          (tts || []).forEach((t: any) => { ttMap[t.id] = t })

          // attach ticket_type objects to items for display
          itemsData.forEach((it: any) => { it.ticket_type = ttMap[it.ticket_type_id] || null })

          // choose representative service from the first ticket_type that has a service_id
          const firstWithService = (tts || []).find((t: any) => t && t.service_id)
          if (firstWithService && firstWithService.service_id) {
            const { data: svc } = await supabase.from('services').select('*').eq('id', firstWithService.service_id).maybeSingle()
            serviceForOrder = svc || null

            // Fetch ALL ticket types for this service
            const { data: allTts } = await supabase.from('ticket_types').select('*').eq('service_id', firstWithService.service_id)
            allTicketTypes = allTts || []
          }
        }

        setItems(itemsData)
        setAllTicketTypes(allTicketTypes)
        // Prefill buyer information from logged-in profile if available and buyer fields are empty
        if (profile) {
          setBuyer(b => ({
            name: b.name || profile.full_name || '',
            surname: b.surname || '',
            email: b.email || profile.email || '',
            phone: b.phone || (profile as any).phone || '',
            countryCode: b.countryCode || '+256',
            emailCopy: b.emailCopy || false
          }))
        }

        // attach representative service to order object for quick access in the UI
        if (o) setOrder({ ...o, _service: serviceForOrder })
      } catch (err) {
        console.error('Failed to load order:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orderId, profile])

  const updateTicketQuantity = async (ticketTypeId: string, newQuantity: number) => {
    if (newQuantity < 0 || !orderId) return
    
    try {
      // Find existing order item for this ticket type
      const existingItem = items.find(item => item.ticket_type_id === ticketTypeId)
      
      if (existingItem) {
        // Update existing item
        if (newQuantity === 0) {
          // Remove item if quantity is 0
          const { error } = await supabase
            .from('order_items')
            .delete()
            .eq('id', existingItem.id)

          if (error) throw error

          // Update local state
          setItems(prev => prev.filter(item => item.id !== existingItem.id))
        } else {
          // Update quantity
          const { error } = await supabase
            .from('order_items')
            .update({ quantity: newQuantity })
            .eq('id', existingItem.id)

          if (error) throw error

          // Update local state
          setItems(prev => prev.map(item => 
            item.id === existingItem.id ? { ...item, quantity: newQuantity } : item
          ))
        }
      } else if (newQuantity > 0) {
        // Add new item
        const { data: newItem, error } = await supabase
          .from('order_items')
          .insert({
            order_id: orderId,
            ticket_type_id: ticketTypeId,
            quantity: newQuantity,
            unit_price: allTicketTypes.find(tt => tt.id === ticketTypeId)?.price || 0
          })
          .select()
          .single()

        if (error) throw error

        // Add ticket_type info to the new item
        const ticketType = allTicketTypes.find(tt => tt.id === ticketTypeId)
        const itemWithType = { ...newItem, ticket_type: ticketType }

        // Update local state
        setItems(prev => [...prev, itemWithType])
      }

      // Recalculate order total
      const updatedItems = items
        .filter(item => item.ticket_type_id !== ticketTypeId || (existingItem && item.id === existingItem.id))
        .map(item => {
          if (item.ticket_type_id === ticketTypeId) {
            return { ...item, quantity: newQuantity }
          }
          return item
        })
        .filter(item => item.quantity > 0)
      
      // Add new item if it was just created
      if (!existingItem && newQuantity > 0) {
        const ticketType = allTicketTypes.find(tt => tt.id === ticketTypeId)
        updatedItems.push({
          ticket_type_id: ticketTypeId,
          quantity: newQuantity,
          unit_price: ticketType?.price || 0,
          ticket_type: ticketType
        })
      }
      
      const newTotal = updatedItems.reduce((sum, item) => sum + (Number(item.unit_price) * item.quantity), 0)
      
      setOrder((prev: any) => prev ? { ...prev, total_amount: newTotal } : null)
    } catch (err) {
      console.error('Failed to update ticket quantity:', err)
      alert('Failed to update ticket quantity. Please try again.')
    }
  }

  if (loading) return <div className="p-6">Loading order…</div>
  if (!order) return <div className="p-6">Order not found</div>

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 md:p-4">
      {/* Modal-like centered container */}
      <div className="w-full md:max-w-6xl bg-white rounded-none md:rounded-lg shadow-lg overflow-hidden flex flex-col" style={{ height: '100vh', maxHeight: 'none', '--tw-max-height': 'auto' } as React.CSSProperties}>
        {/* Progress Header - Fixed at top */}
        <div className="px-4 md:px-6 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-light">Checkout</h2>
            <div>
              <button onClick={() => navigate(-1)} className="text-sm text-gray-600 hover:text-gray-900">✕</button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 md:gap-4 overflow-x-auto pb-2">
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">✓</div>
              <div className="text-xs md:text-sm font-light text-gray-700 whitespace-nowrap">Tickets</div>
            </div>
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">✓</div>
              <div className="text-xs md:text-sm font-light text-blue-600 whitespace-nowrap">Details</div>
            </div>
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs font-semibold">3</div>
              <div className="text-xs md:text-sm font-light text-gray-700 whitespace-nowrap">Payment</div>
            </div>
          </div>
        </div>

        {/* Content area: scrollable in the middle */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 px-4 md:px-6 py-4 md:py-6">
            {/* Left: Buyer Information (span 1 col on md) */}
            <div className="md:col-span-1 space-y-4">
              <div className="bg-white p-4 rounded border border-gray-200">
                <h3 className="font-light text-base">Buyer Information</h3>
                <div className="grid grid-cols-1 gap-3 mt-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-light text-gray-700 mb-2">First name *</label>
                      <input className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:border-gray-400 text-sm font-light" value={buyer.name} onChange={(e) => setBuyer(s => ({ ...s, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-light text-gray-700 mb-2">Surname *</label>
                      <input className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:border-gray-400 text-sm font-light" value={buyer.surname} onChange={(e) => setBuyer(s => ({ ...s, surname: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-light text-gray-700 mb-2">Email *</label>
                    <input className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:border-gray-400 text-sm font-light" value={buyer.email} onChange={(e) => setBuyer(s => ({ ...s, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-light text-gray-700 mb-2">Cellphone</label>
                    <div className="flex gap-2">
                      <div className="relative country-dropdown flex-shrink-0">
                        <button
                          type="button"
                          className="border border-gray-300 px-2 py-2 rounded focus:outline-none focus:border-gray-400 bg-white flex items-center justify-between min-w-[80px] text-xs font-light"
                          onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                        >
                          <span className="truncate text-xs">
                            {buyer.countryCode}
                          </span>
                          <svg className="w-3 h-3 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {countryDropdownOpen && (
                          <div className="absolute top-full left-0 z-50 w-56 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            <div className="p-2 border-b">
                              <input
                                type="text"
                                placeholder="Search..."
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-light focus:outline-none focus:border-gray-400"
                                value={countrySearch}
                                onChange={(e) => setCountrySearch(e.target.value)}
                              />
                            </div>
                            <div className="max-h-40 overflow-y-auto">
                              {filteredCountries.map((country) => (
                                <button
                                  key={country.code}
                                  type="button"
                                  className="w-full px-2 py-1 text-left hover:bg-gray-50 flex items-center space-x-2 text-xs font-light"
                                  onClick={() => {
                                    setBuyer(s => ({ ...s, countryCode: country.code }))
                                    setCountrySearch('')
                                    setCountryDropdownOpen(false)
                                  }}
                                >
                                  <span className="text-xs">{country.name}</span>
                                  <span className="text-xs text-gray-500 ml-auto">{country.code}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <input
                        className="flex-1 border border-gray-300 px-3 py-2 rounded focus:outline-none focus:border-gray-400 text-sm font-light"
                        value={buyer.phone}
                        onChange={(e) => setBuyer(s => ({ ...s, phone: e.target.value }))}
                        placeholder="Phone"
                        type="tel"
                      />
                    </div>
                  </div>
                  <div className="flex items-start gap-2 pt-1">
                    <input type="checkbox" id="emailCopy" checked={buyer.emailCopy} onChange={(e) => setBuyer(s => ({ ...s, emailCopy: e.target.checked }))} className="rounded cursor-pointer flex-shrink-0 mt-0.5" />
                    <label htmlFor="emailCopy" className="text-xs font-light text-gray-700 cursor-pointer">Email this ticket holder a copy of this ticket</label>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Order Summary (span 2 cols on md) */}
            <div className="md:col-span-2">
              <div className="sticky top-6 space-y-3">
                <div className="bg-white p-4 rounded border border-gray-200">
                  <h3 className="font-light text-sm mb-3">Order Summary</h3>
                  <div>
                    {/* Event info */}
                    <div className="flex items-center gap-3 mb-4">
                      {order._service?.images?.[0] ? (
                        <img src={order._service.images[0]} alt={order._service.title} className="w-16 h-16 object-cover rounded" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">Image</div>
                      )}
                      <div className="flex-1">
                        <div className="font-light text-sm">{order._service?.title || 'Event'}</div>
                        <div className="text-xs text-gray-600 mt-1 font-light">Order #{order.reference || `#${(order.id || '').toString().slice(0,8)}`}</div>
                        {order._service?.event_datetime && (
                          <div className="text-xs text-gray-600 font-light">
                            {new Date(order._service.event_datetime).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-xs font-light text-gray-700">Tickets</div>
                        {!showAllTickets && (
                          <button 
                            onClick={() => setShowAllTickets(true)}
                            className="text-gray-600 hover:text-gray-900 text-xs font-light underline transition-colors"
                          >
                            Edit
                          </button>
                        )}
                        {showAllTickets && (
                          <button 
                            onClick={() => setShowAllTickets(false)}
                            className="text-gray-600 hover:text-gray-900 text-xs font-light underline transition-colors"
                          >
                            Done
                          </button>
                        )}
                      </div>
                      <div className="space-y-2 mb-4">
                        {allTicketTypes
                          .filter(ticketType => showAllTickets || items.some(item => item.ticket_type_id === ticketType.id && item.quantity > 0))
                          .map((ticketType: any) => {
                          const existingItem = items.find(item => item.ticket_type_id === ticketType.id)
                          const quantity = existingItem?.quantity || 0
                          
                          return (
                            <div key={ticketType.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded text-xs">
                              <div className="flex-1">
                                <div className="font-light">{ticketType.title}</div>
                                <div className="text-xs text-gray-500 font-light">{formatCurrencyWithConversion(ticketType.price, order.currency)}</div>
                              </div>
                              <div className="flex items-center gap-1">
                                {showAllTickets ? (
                                  <>
                                    <button 
                                      onClick={() => updateTicketQuantity(ticketType.id, quantity - 1)}
                                      className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xs font-light transition-colors disabled:opacity-50"
                                      disabled={quantity <= 0}
                                    >
                                      -
                                    </button>
                                    <span className="text-xs font-light min-w-[16px] text-center">{quantity}</span>
                                    <button 
                                      onClick={() => updateTicketQuantity(ticketType.id, quantity + 1)}
                                      className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xs font-light transition-colors"
                                    >
                                      +
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-xs font-light">{quantity}</span>
                                )}
                              </div>
                              <div className="text-xs font-light ml-3">{formatCurrencyWithConversion(ticketType.price * quantity, order.currency)}</div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="border-t pt-3 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <div className="font-light text-gray-700">Total Tickets</div>
                          <div className="font-light">{items.reduce((s, it) => s + Number(it.quantity || 0), 0)}</div>
                        </div>

                        <div className="flex justify-between">
                          <div className="font-light text-gray-700">Subtotal</div>
                          <div className="font-light">{formatCurrencyWithConversion(Number(order.total_amount || 0), order.currency)}</div>
                        </div>

                        <div className="flex justify-between">
                          <div className="font-light text-gray-700">Service Fees</div>
                          <div className="font-light">{formatCurrencyWithConversion(Math.max(1000, Math.round(Number(order.total_amount || 0) * 0.01)), order.currency)}</div>
                        </div>

                        <div className="flex justify-between border-t pt-2 mt-2">
                          <div className="font-light text-gray-900">Total</div>
                          <div className="font-semibold">{formatCurrencyWithConversion(Number(order.total_amount || 0) + Math.max(1000, Math.round(Number(order.total_amount || 0) * 0.01)), order.currency)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Action Buttons at Bottom - visible on all devices */}
        <div className="flex-shrink-0 border-t bg-white px-4 md:px-6 py-3 flex gap-2">
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-900 rounded border border-gray-300 font-light text-sm transition-colors">
            Back
          </button>
          <button 
            onClick={async () => {
              try {
                // Save buyer information to order
                const buyerInfo = {
                  guest_name: buyer.name && buyer.surname ? `${buyer.name} ${buyer.surname}` : buyer.name || null,
                  guest_email: buyer.email || null,
                  guest_phone: buyer.phone ? `${buyer.countryCode}${buyer.phone}` : null
                };

                const { error: updateError } = await supabase
                  .from('orders')
                  .update(buyerInfo)
                  .eq('id', orderId);

                if (updateError) {
                  console.error('Failed to save buyer information:', updateError);
                  
                  // Check if it's a schema error (missing columns)
                  if (updateError.message && updateError.message.includes('guest_email')) {
                    alert('The checkout system is still initializing. Please contact support or try again in a moment.\n\nReference: SCHEMA_MIGRATION_PENDING');
                    return;
                  }
                  
                  alert('Failed to save buyer information. Please try again.');
                  return;
                }

                // Navigate to payment
                navigate(`/checkout/${orderId}/payment`);
              } catch (err) {
                console.error('Failed to save buyer information:', err);
                alert('Failed to save buyer information. Please try again.');
              }
            }} 
            style={{ backgroundColor: '#3B82F6' }} 
            className="flex-1 text-white py-2 px-4 rounded font-light text-sm hover:opacity-90 transition-opacity"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
