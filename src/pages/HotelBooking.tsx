import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Calendar, CheckCircle, Bed } from 'lucide-react'
// use the local formatCurrencyWithConversion helper defined below
import { useAuth } from '../contexts/AuthContext'
import { createBooking } from '../lib/database'
import { supabase } from '../lib/supabaseClient'

interface ServiceDetail {
  id: string
  slug?: string
  vendor_id?: string
  title: string
  description: string
  price: number
  currency: string
  images: string[]
  location: string
  duration_hours: number
  max_capacity: number
  amenities: string[]
  vendors?: {
    id?: string
    business_name: string
    business_description: string
    business_phone: string
    business_email: string
    business_address: string
  } | null
  service_categories: {
    name: string
  }
  // Hotel-specific fields
  room_types?: string[]
  check_in_time?: string
  check_out_time?: string
  star_rating?: number
  facilities?: string[]
}

interface HotelBookingProps {
  service: ServiceDetail
}

export default function HotelBooking({ service }: HotelBookingProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  const [currentStep, setCurrentStep] = useState(2) // Start at step 2 (Booking Details)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  // Create a formatCurrency function that uses UGX as default
  const formatCurrencyWithConversion = (amount: number, serviceCurrency: string) => {
    try {
      // Always display in UGX as default
      const displayCurrency = 'UGX';
      if (displayCurrency === serviceCurrency) {
        return formatAmount(amount, displayCurrency);
      }
      const convertedAmount = convertCurrency(amount, serviceCurrency, displayCurrency);
      return formatAmount(convertedAmount, displayCurrency);
    } catch (error) {
      console.warn('Currency conversion failed, using UGX as default:', error);
      return formatAmount(amount, 'UGX');
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

  const [bookingData, setBookingData] = useState(() => {
    // Initialize with default dates (today and tomorrow)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    return {
      checkInDate: today.toISOString().split('T')[0],
      checkOutDate: tomorrow.toISOString().split('T')[0],
      guests: 1,
      rooms: 1,
      roomType: service.room_types?.[0] || 'Standard',
      specialRequests: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      countryCode: '+256', // Default to Uganda
      paymentMethod: 'card',
      mobileProvider: ''
    }
  })
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set())
  const [blockedError, setBlockedError] = useState<string | null>(null)

  // Country search state
  const [countrySearch, setCountrySearch] = useState('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)

  // Pre-fill form data from navigation state
  useEffect(() => {
    if (location.state) {
      const { checkInDate, checkOutDate, guests, rooms } = location.state as any
      if (checkInDate || checkOutDate || guests || rooms) {
        setBookingData(prev => ({
          ...prev,
          checkInDate: checkInDate || prev.checkInDate,
          checkOutDate: checkOutDate || prev.checkOutDate,
          guests: guests || prev.guests,
          rooms: rooms || prev.rooms
        }))
      }
    }
  }, [location.state])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: allBookings } = await supabase.from('bookings').select('service_date, service_id, vendor_id, services (id, service_categories (name))')
        if (!mounted || !allBookings) return
        const singleCats = new Set(['transport', 'accommodation', 'hotels', 'hotel'])
        const set = new Set<string>()
        for (const b of allBookings) {
          if (!b || !b.vendor_id || (service.vendor_id && b.vendor_id !== service.vendor_id)) continue
          // service_categories may be an object or an array depending on the query; handle both
          let catName = ''
          try {
            const sc = (b.services as any)?.service_categories
            if (!sc) catName = ''
            else if (Array.isArray(sc)) catName = sc[0]?.name || ''
            else catName = sc.name || ''
          } catch (e) {
            catName = ''
          }
          const cat = catName.toString().toLowerCase()
          if (!cat || !singleCats.has(cat)) continue
          if (!b.service_date) continue
          const start = new Date(b.service_date)
          if (isNaN(start.getTime())) continue
          const end = (b as any).end_date ? new Date((b as any).end_date) : start
          if (isNaN(end.getTime())) {
            set.add(start.toISOString().split('T')[0])
            continue
          }
          const from = start < end ? start : end
          const to = end >= start ? end : start
          for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
            set.add(new Date(d).toISOString().split('T')[0])
          }
        }
        setBlockedDates(set)
      } catch (err) {
        console.error('Error loading blocked dates for hotel booking:', err)
      }
    })()
    return () => { mounted = false }
  }, [service.vendor_id])
  

  // Auto-populate contact information for logged-in users
  useEffect(() => {
    const fetchTouristData = async () => {
      if (!user) return

      try {
        // Get tourist profile data
        const { data: touristData, error } = await supabase
          .from('tourists')
          .select('first_name, last_name, phone')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error('Error fetching tourist data:', error)
        } else if (touristData) {
          // Auto-populate contact fields
          setBookingData(prev => ({
            ...prev,
            contactName: touristData.first_name && touristData.last_name 
              ? `${touristData.first_name} ${touristData.last_name}`.trim()
              : profile?.full_name || prev.contactName,
            contactEmail: profile?.email || prev.contactEmail,
            contactPhone: touristData.phone || prev.contactPhone
          }))
        } else {
          // Fallback to profile data if no tourist record exists
          setBookingData(prev => ({
            ...prev,
            contactName: profile?.full_name || prev.contactName,
            contactEmail: profile?.email || prev.contactEmail
          }))
        }
      } catch (error) {
        console.error('Error fetching tourist data:', error)
      }
    }

    fetchTouristData()
  }, [user, profile])

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

  const steps = [
    { id: 1, title: 'Select Dates & Rooms', icon: Calendar },
    { id: 2, title: 'Booking Details', icon: Bed },
    { id: 3, title: 'Confirmation', icon: CheckCircle }
  ]

  const handleNext = () => {
    if (currentStep < steps.length) {
      // Validate step 2 (Booking Details) before advancing
      if (currentStep === 2) {
        if (!bookingData.contactName || !bookingData.contactEmail) {
          alert('Please fill in all required details.')
          return
        }
        if (bookingData.paymentMethod === 'card') {
          alert('Please select a valid payment method.')
          return
        }
      }
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 2) { // Can only go back from step 2 onwards
      setCurrentStep(currentStep - 1)
    } else {
      navigate(`/service/${service.slug || service.id}`)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    // Clear blocked error on change
    setBlockedError(null)
    setBookingData(prev => ({ ...prev, [field]: value }))

    // Validate blocked dates immediately when checkInDate changes
    if (field === 'checkInDate' && value && blockedDates.has(value as string)) {
      setBlockedError('Selected check-in date is unavailable (another accommodation/transport booking exists).')
    }
  }

  // Handle payment method change
  const handlePaymentMethodChange = (value: string) => {
    setBookingData(prev => ({ ...prev, paymentMethod: value }))
  }

  // Calculate number of nights
  const checkIn = new Date(bookingData.checkInDate)
  const checkOut = new Date(bookingData.checkOutDate)
  const nights = bookingData.checkInDate && bookingData.checkOutDate
    ? Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  const totalPrice = service.price * bookingData.rooms * nights

  const handleCompleteBooking = async () => {
    setIsSubmitting(true)
    try {
      await createBooking({
        service_id: service.id,
        vendor_id: service.vendor_id || service.vendors?.id || '',
        booking_date: new Date().toISOString(),
        service_date: bookingData.checkInDate,
        guests: bookingData.guests,
        total_amount: totalPrice,
        currency: 'UGX',
        status: 'pending',
        payment_status: 'pending',
        special_requests: bookingData.specialRequests,
        // Guest booking fields
        tourist_id: user?.id,
        guest_name: user ? undefined : bookingData.contactName,
        guest_email: user ? undefined : bookingData.contactEmail,
        guest_phone: user ? undefined : `${bookingData.countryCode}${bookingData.contactPhone}`,
        // Hotel-specific fields
        start_time: service.check_in_time,
        end_time: service.check_out_time,
        end_date: bookingData.checkOutDate
      })

      setCurrentStep(3) // Go to confirmation step
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Failed to complete booking. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Check-in & Check-out Dates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check-in Date
                  </label>
                  <input
                    type="date"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      blockedError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    value={bookingData.checkInDate}
                    onChange={(e) => handleInputChange('checkInDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {blockedError && (
                    <p className="text-xs text-red-600 mt-1">{blockedError}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check-out Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={bookingData.checkOutDate}
                    onChange={(e) => handleInputChange('checkOutDate', e.target.value)}
                    min={bookingData.checkInDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              {nights > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {nights} night{nights > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            {/* Room Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Room Selection</h3>
              <div className="space-y-3">
                {service.room_types?.map((roomType, index) => (
                  <label key={index} className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors" style={{backgroundColor: bookingData.roomType === roomType ? '#EFF6FF' : 'transparent'}}>
                    <input
                      type="radio"
                      name="roomType"
                      value={roomType}
                      checked={bookingData.roomType === roomType}
                      onChange={(e) => handleInputChange('roomType', e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{roomType}</span>
                      <span className="text-gray-600 ml-2 text-sm font-light">
                        {formatCurrencyWithConversion(service.price, service.currency)} per night
                      </span>
                    </div>
                  </label>
                )) || (
                  <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors" style={{backgroundColor: bookingData.roomType === 'Standard' ? '#EFF6FF' : 'transparent'}}>
                    <input
                      type="radio"
                      name="roomType"
                      value="Standard"
                      checked={bookingData.roomType === 'Standard'}
                      onChange={(e) => handleInputChange('roomType', e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">Standard Room</span>
                      <span className="text-gray-600 ml-2 text-sm font-light">
                        {formatCurrencyWithConversion(service.price, service.currency)} per night
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Special Requests */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Special Requests <span className="font-light text-gray-500">(Optional)</span>
              </label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-light"
                rows={3}
                placeholder="e.g., high floor, late check-in, extra pillows..."
                value={bookingData.specialRequests}
                onChange={(e) => handleInputChange('specialRequests', e.target.value)}
              />
            </div>

            {/* Your Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Your Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-light"
                    placeholder="John Doe"
                    value={bookingData.contactName}
                    onChange={(e) => handleInputChange('contactName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-light"
                    placeholder="john@example.com"
                    value={bookingData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Phone Number <span className="font-light text-gray-500">(Optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative country-dropdown" style={{width: '120px'}}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-sm font-light flex items-center justify-between"
                        onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                      >
                        <span>
                          {countries.find(c => c.code === bookingData.countryCode)?.flag || '🌍'} {bookingData.countryCode}
                        </span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {countryDropdownOpen && (
                        <div className="absolute top-full left-0 z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg">
                          <div className="p-2 border-b">
                            <input
                              type="text"
                              placeholder="Search..."
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-light focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredCountries.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm font-light flex items-center space-x-2"
                                onClick={() => {
                                  handleInputChange('countryCode', country.code)
                                  setCountrySearch('')
                                  setCountryDropdownOpen(false)
                                }}
                              >
                                <span>{country.flag}</span>
                                <span className="flex-1">{country.name}</span>
                                <span className="text-gray-500">{country.code}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <input
                      type="tel"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-light"
                      placeholder="700 000 000"
                      value={bookingData.contactPhone}
                      onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h3>
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-light">Total Amount Due:</span>
                  <span className="text-2xl font-semibold text-blue-600">{formatCurrencyWithConversion(totalPrice, service.currency)}</span>
                </div>
              </div>
              <div className="space-y-3">
                <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors" style={{backgroundColor: bookingData.paymentMethod === 'mobile' ? '#EFF6FF' : 'transparent'}}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="mobile"
                    checked={bookingData.paymentMethod === 'mobile'}
                    onChange={() => handlePaymentMethodChange('mobile')}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">Mobile Money</span>
                    <p className="text-sm font-light text-gray-600">MTN Mobile Money, Airtel Money</p>
                  </div>
                </label>
                <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer opacity-50 hover:border-gray-300 transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    disabled
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">Credit/Debit Card</span>
                    <p className="text-sm font-light text-gray-600">Coming soon</p>
                  </div>
                </label>
              </div>
              {bookingData.paymentMethod === 'mobile' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">Provider</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-light"
                    value={bookingData.mobileProvider}
                    onChange={(e) => handleInputChange('mobileProvider', e.target.value)}
                  >
                    <option value="">Select a provider</option>
                    <option value="MTN">MTN Mobile Money</option>
                    <option value="Airtel">Airtel Money</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4 sm:space-y-6">
            {/* Success Header */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Booking Confirmed!</h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Your accommodation booking has been successfully confirmed. You will receive a confirmation email shortly.
              </p>
            </div>

            {/* Service Details */}
            <div className="pt-4 sm:pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Service Details</h4>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium text-right">{service.title}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium text-right">{service.location}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium text-right">{service.service_categories.name}</span>
                </div>
                {service.star_rating && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600">Star Rating:</span>
                    <span className="font-medium text-right">{'⭐'.repeat(service.star_rating)} ({service.star_rating}/5)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Service Provider */}
            <div className="pt-4 sm:pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Service Provider</h4>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Provider:</span>
                  <span className="font-medium text-right">{service.vendors?.business_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-right break-all">{service.vendors?.business_email || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium text-right">{service.vendors?.business_phone || 'N/A'}</span>
                </div>
                {service.vendors?.business_address && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600">Address:</span>
                    <span className="font-medium text-right">{service.vendors.business_address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Accommodation Details */}
            <div className="pt-4 sm:pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Accommodation Details</h4>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Check-in Date:</span>
                  <span className="font-medium text-right">{bookingData.checkInDate || 'Not set'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Check-out Date:</span>
                  <span className="font-medium text-right">{bookingData.checkOutDate || 'Not set'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium text-right">
                    {bookingData.checkInDate && bookingData.checkOutDate 
                      ? `${Math.ceil((new Date(bookingData.checkOutDate).getTime() - new Date(bookingData.checkInDate).getTime()) / (1000 * 60 * 60 * 24))} nights`
                      : 'N/A'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Room Type:</span>
                  <span className="font-medium text-right">{bookingData.roomType || 'Standard'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Number of Rooms:</span>
                  <span className="font-medium text-right">{bookingData.rooms}</span>
                </div>
              </div>
            </div>

            {/* Guest Information */}
            <div className="pt-4 sm:pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Guest Information</h4>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Number of Guests:</span>
                  <span className="font-medium">{bookingData.guests}</span>
                </div>
              </div>
            </div>

            {/* Booking Information */}
            <div className="pt-4 sm:pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Booking Information</h4>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Special Requests:</span>
                  <span className="font-medium text-right max-w-xs">{bookingData.specialRequests || 'None'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium capitalize">{bookingData.paymentMethod === 'mobile' ? 'Mobile Money' : bookingData.paymentMethod}</span>
                </div>
                {bookingData.paymentMethod === 'mobile' && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600">Provider:</span>
                    <span className="font-medium">{bookingData.mobileProvider}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Your Contact Information */}
            <div className="pt-4 sm:pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Your Contact Information</h4>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium text-right">{bookingData.contactName}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-right break-all">{bookingData.contactEmail}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium text-right">{bookingData.countryCode} {bookingData.contactPhone}</span>
                </div>
              </div>
            </div>

            {/* Price Summary */}
            <div className="pt-4 sm:pt-6 border-t border-gray-200">
              <div className="space-y-3 text-xs sm:text-sm mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Rate per night:</span>
                  <span className="font-medium">{formatCurrencyWithConversion(service.price, service.currency)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Number of nights:</span>
                  <span className="font-medium">
                    {Math.ceil((new Date(bookingData.checkOutDate).getTime() - new Date(bookingData.checkInDate).getTime()) / (1000 * 60 * 60 * 24))}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="text-base sm:text-lg font-semibold text-gray-900">Total Amount:</span>
                  <span className="text-lg sm:text-2xl font-bold text-blue-600">{formatCurrencyWithConversion(totalPrice, service.currency)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 sm:gap-3 justify-center pt-6 sm:pt-8">
              <button
                onClick={() => navigate(`/category/${service.service_categories.name.toLowerCase().replace(/\s+/g, '-')}`)}
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 sm:py-2 px-2 sm:px-6 rounded-lg transition-colors text-xs sm:text-sm"
              >
                Similar Hotels
              </button>
              <button
                onClick={() => navigate(`/service/${service.slug || service.id}/inquiry`)}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 sm:py-2 px-2 sm:px-6 rounded-lg transition-colors text-xs sm:text-sm"
              >
                Message Provider
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex-1 sm:flex-none bg-gray-600 hover:bg-gray-700 text-white font-medium py-1.5 sm:py-2 px-2 sm:px-6 rounded-lg transition-colors text-xs sm:text-sm"
              >
                Home
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Service Summary Card */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-3">
            <img
              src={service.images[0] || 'https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg'}
              alt={service.title}
              className="w-16 h-16 object-cover rounded"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-medium text-gray-900 truncate">{service.title}</h1>
              <p className="text-sm font-light text-gray-600">{service.location}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xl font-semibold text-blue-600">
                {formatCurrencyWithConversion(totalPrice, service.currency)}
              </div>
              <div className="text-xs font-light text-gray-500">
                {nights} night{nights > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        {currentStep < 3 && (
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleBack}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Back
            </button>
            <button
              onClick={currentStep === 2 ? handleCompleteBooking : handleNext}
              disabled={
                isSubmitting ||
                (currentStep === 2 && (!bookingData.contactName || !bookingData.contactEmail || bookingData.paymentMethod === 'card'))
              }
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? 'Processing...' : (currentStep === 2 ? 'Complete Booking' : 'Next')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}