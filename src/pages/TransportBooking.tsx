import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CreditCard, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { createBooking as createVendorBooking } from '../store/vendorStore'
import { createBooking as createDatabaseBooking } from '../lib/database'
import { supabase } from '../lib/supabaseClient'
import SimilarServicesCarousel from '../components/SimilarServicesCarousel'

interface ServiceDetail {
  id: string
  slug?: string
  vendor_id?: string
  category_id?: string
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
    business_name: string
    business_description: string
    business_phone: string
    business_email: string
    business_address: string
  } | null
  service_categories: {
    name: string
  }
  vehicle_type?: string
  vehicle_capacity?: number
  driver_included?: boolean
  fuel_included?: boolean
  pickup_locations?: string[]
  dropoff_locations?: string[]
}

interface TransportBookingProps {
  service: ServiceDetail
}

// Country codes data
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

export default function TransportBooking({ service }: TransportBookingProps) {
  const navigate = useNavigate()
  const location = useLocation()
  
  console.log('TransportBooking - service:', service)
  console.log('TransportBooking - service.vendor_id:', service.vendor_id)
  
  const { user, profile } = useAuth()
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
      const userCurrency = selectedCurrency || 'UGX';
      if (userCurrency === serviceCurrency) {
        return formatAmount(amount, userCurrency);
      }
      const convertedAmount = convertCurrency(amount, serviceCurrency, userCurrency);
      return formatAmount(convertedAmount, userCurrency);
    } catch (error) {
      console.warn('Currency conversion failed, using original currency:', error);
      return formatAmount(amount, serviceCurrency);
    }
  }

  const [currentStep, setCurrentStep] = useState(1)
  // Removed unused cartSaved state
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [selectedImage, setSelectedImage] = useState('')
  const [bookingData, setBookingData] = useState({
    date: '', // No longer pre-filled from URL params
    pickupLocation: service.pickup_locations?.[0] || '',
    dropoffLocation: service.dropoff_locations?.[0] || '',
    passengers: 1,
    returnTrip: false,
    specialRequests: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    countryCode: '+256', // Default to Uganda
  paymentMethod: 'mobile',
    mobileProvider: '',
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '17:00',
    driverOption: service.driver_included ? 'with-driver' : 'self-drive'
  })

  // Blocked dates (single-booking categories)
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set())
  const [blockedError, setBlockedError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: allBookings } = await supabase.from('bookings').select('service_date, service_id, vendor_id, services (id, service_categories (name))')
        if (!mounted || !allBookings) return
        const singleCats = new Set(['transport', 'accommodation', 'hotels', 'hotel'])
        const set = new Set<string>()
        for (const b of allBookings) {
          // Only consider bookings for this vendor
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
        console.error('Error loading blocked dates for transport booking:', err)
      }
    })()
    return () => { mounted = false }
  }, [service.vendor_id])

  // UI state for card-not-active notice
  const [cardNoticeVisible, setCardNoticeVisible] = useState(false)

  // Country search state
  const [countrySearch, setCountrySearch] = useState('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)

  // Pre-fill dates from navigation state if available
  useEffect(() => {
    if (location.state) {
      const { startDate, endDate, selectedDate } = location.state as any
      if (startDate && endDate) {
        setBookingData(prev => ({
          ...prev,
          startDate,
          endDate
        }))
      } else if (selectedDate) {
        setBookingData(prev => ({
          ...prev,
          date: selectedDate
        }))
      }
    }
  }, [location.state])

  useEffect(() => {
    if (service?.images && service.images.length > 0) {
      setSelectedImage(service.images[0])
    }
  }, [service])

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

  const handleTouchStart = (e: React.TouchEvent) => {
    // Store touch start position
    const touchDownClientX = e.targetTouches[0].clientX
    e.currentTarget.setAttribute('data-touch-start', touchDownClientX.toString())
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchDownClientX = parseFloat(e.currentTarget.getAttribute('data-touch-start') || '0')
    const touchUpClientX = e.changedTouches[0].clientX
    handleSwipe(touchDownClientX, touchUpClientX)
  }

  const handleSwipe = (start: number, end: number) => {
    if (!service?.images || service.images.length <= 1) return
    
    const swipeThreshold = 50
    const diff = start - end

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swiped left - show next image
        const nextIndex = (currentImageIndex + 1) % service.images.length
        setCurrentImageIndex(nextIndex)
        setSelectedImage(service.images[nextIndex])
      } else {
        // Swiped right - show previous image
        const prevIndex = currentImageIndex === 0 ? service.images.length - 1 : currentImageIndex - 1
        setCurrentImageIndex(prevIndex)
        setSelectedImage(service.images[prevIndex])
      }
    }
  }


  const steps = [
    { id: 1, title: 'Details & Payment', icon: CreditCard },
    { id: 2, title: 'Confirmation', icon: CheckCircle }
  ]

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        // Validate trip details
        if (!bookingData.startDate || !bookingData.endDate) {
          alert('Please select both start and end dates.')
          return false
        }
        // Prevent booking on blocked dates for single-booking categories (transport/hotels)
        const start = bookingData.startDate
        if (start && blockedDates.has(start)) {
          setBlockedError('Selected start date is unavailable for booking (another transport/accommodation is already booked).')
          return false
        }
        if (bookingData.driverOption === 'with-driver') {
          if (!bookingData.pickupLocation || !bookingData.dropoffLocation) {
            alert('Please enter both pickup and drop-off locations when booking with driver.')
            return false
          }
        }
        if (bookingData.passengers < 1 || bookingData.passengers > (service.vehicle_capacity || service.max_capacity)) {
          alert(`Number of passengers must be between 1 and ${service.vehicle_capacity || service.max_capacity}.`)
          return false
        }
        // Validate contact details
        if (!bookingData.contactName.trim()) {
          alert('Please enter your full name.')
          return false
        }
        if (!bookingData.contactEmail.trim() || !bookingData.contactEmail.includes('@')) {
          alert('Please enter a valid email address.')
          return false
        }
        break
      default:
        break
    }
    return true
  }

  const handleNext = async () => {
    if (currentStep < steps.length) {
      // Validate current step before proceeding
      if (!validateCurrentStep()) {
        return
      }

      // If completing booking (step 1), create the actual booking
      if (currentStep === 1) {
        setBookingError(null)
        // Prepare booking data for localStorage (vendor panel)
        const bookingDataToSave = {
          service_id: service.id,
          vendor_id: service.vendor_id || 'vendor_demo',
          booking_date: new Date().toISOString(),
          service_date: bookingData.startDate,
          guests: bookingData.passengers,
          total_amount: totalPrice,
          currency: service.currency,
          status: 'confirmed' as const,
          payment_status: 'paid' as const, // keep vendor demo as paid
          special_requests: bookingData.specialRequests,
          // Add transport-specific data
          pickup_location: bookingData.driverOption === 'with-driver' ? bookingData.pickupLocation : undefined,
          dropoff_location: bookingData.driverOption === 'with-driver' ? bookingData.dropoffLocation : undefined,
          driver_option: bookingData.driverOption,
          return_trip: bookingData.returnTrip,
          start_time: bookingData.startTime,
          end_time: bookingData.endTime,
          end_date: bookingData.endDate
        }
        // Save to vendor localStorage for demo panel
        createVendorBooking(service.vendor_id || 'vendor_demo', bookingDataToSave)

        // Prepare booking data for Supabase (admin/vendor visibility)
        console.log('TransportBooking: Creating booking with user:', user)
        console.log('TransportBooking: User ID:', user?.id)
        const bookingDataToInsert = {
          service_id: service.id,
          tourist_id: user?.id,
          vendor_id: service.vendor_id || 'vendor_demo',
          booking_date: new Date().toISOString(),
          service_date: bookingData.startDate,
          guests: bookingData.passengers,
          total_amount: totalPrice,
          currency: service.currency,
          status: 'confirmed' as const,
          payment_status: 'pending' as const, // always pending for admin
          special_requests: bookingData.specialRequests,
          // Guest booking fields
          guest_name: profile ? undefined : bookingData.contactName,
          guest_email: profile ? undefined : bookingData.contactEmail,
          guest_phone: profile ? undefined : `${bookingData.countryCode}${bookingData.contactPhone}`,
          // Transport-specific fields
          pickup_location: bookingData.driverOption === 'with-driver' ? bookingData.pickupLocation : undefined,
          dropoff_location: bookingData.driverOption === 'with-driver' ? bookingData.dropoffLocation : undefined,
          driver_option: bookingData.driverOption,
          return_trip: bookingData.returnTrip,
          start_time: bookingData.startTime,
          end_time: bookingData.endTime,
          end_date: bookingData.endDate
        }
        try {
          const result = await createDatabaseBooking(bookingDataToInsert)
          if (result && result.id) {
            setBookingConfirmed(true)
            setCurrentStep(currentStep + 1)
          } else {
            setBookingError('Booking could not be confirmed. Please try again.')
          }
        } catch (error: any) {
          setBookingError(error?.message || 'Booking could not be confirmed. Please try again.')
        }
        return // Only advance step if booking is successful
      }
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      navigate(`/service/${service.slug || service.id}`)
    }
  }

  const handleInputChange = (field: string, value: string | number | boolean) => {
    // Clear blocked error on change
    setBlockedError(null)
    setBookingData(prev => ({ ...prev, [field]: value }))

    // Validate blocked dates immediately when startDate changes
    if (field === 'startDate' && value && blockedDates.has(value as string)) {
      setBlockedError('Selected start date is unavailable for booking (another transport/accommodation is already booked).')
    }
  }

  // Intercept payment method changes so "card" shows a notice and isn't selectable yet
  const handlePaymentMethodChange = (value: string) => {
    // Always set the selected method. The provider dropdown is shown only when paymentMethod === 'mobile'.
    setBookingData(prev => ({ ...prev, paymentMethod: value }))
    if (value === 'card') {
      // Show notice that card payments are not active yet
      setCardNoticeVisible(true)
      setTimeout(() => setCardNoticeVisible(false), 5000)
    } else {
      setCardNoticeVisible(false)
    }
  }

  // Calculate number of days for transport services based on actual time difference
  const calculateDays = (startDate: string, startTime: string, endDate: string, endTime: string): number => {
    if (!startDate || !endDate) return 1
    
    const startDateTime = new Date(`${startDate}T${startTime}`)
    const endDateTime = new Date(`${endDate}T${endTime}`)
    
    const diffTime = Math.abs(endDateTime.getTime() - startDateTime.getTime())
    const diffHours = diffTime / (1000 * 60 * 60)
    
    // Round up to the next day if more than 24 hours
    return Math.ceil(diffHours / 24) || 1
  }

  const totalPrice = (() => {
    const basePrice = service.price * calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)
    const driverCost = (bookingData.driverOption === 'with-driver' && !service.driver_included) ? basePrice * 0.3 : 0 // 30% extra for driver only if not already included
    return basePrice + driverCost
  })()

  const basePrice = service.price * calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)
  const driverCost = (bookingData.driverOption === 'with-driver' && !service.driver_included) ? basePrice * 0.3 : 0

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4 sm:space-y-6">
            {/* Trip Dates Section */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Trip Dates & Times</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Pick-up Date & Time</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className={`w-full px-2 py-2 border rounded text-xs sm:text-sm ${
                        blockedError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      value={bookingData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <input
                      type="time"
                      className="w-full px-2 py-2 border border-gray-300 rounded text-xs sm:text-sm"
                      value={bookingData.startTime || '09:00'}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                    />
                  </div>
                  {blockedError && <p className="text-xs text-red-600 mt-1">{blockedError}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Drop-off Date & Time</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="w-full px-2 py-2 border border-gray-300 rounded text-xs sm:text-sm"
                      value={bookingData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      min={bookingData.startDate || new Date().toISOString().split('T')[0]}
                    />
                    <input
                      type="time"
                      className="w-full px-2 py-2 border border-gray-300 rounded text-xs sm:text-sm"
                      value={bookingData.endTime || '17:00'}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Passengers & Driver Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Passengers *</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                  value={bookingData.passengers}
                  onChange={(e) => handleInputChange('passengers', parseInt(e.target.value))}
                >
                  {Array.from({ length: service.max_capacity || 10 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num} {num > 1 ? 'passengers' : 'passenger'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Driver Option *</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={bookingData.driverOption || (service.driver_included ? 'with-driver' : 'self-drive')}
                  onChange={(e) => handleInputChange('driverOption', e.target.value)}
                >
                  {!service.driver_included && <option value="self-drive">Self-drive</option>}
                  <option value="with-driver">
                    {service.driver_included ? 'With driver (included)' : 'With driver (+30%)'}
                  </option>
                </select>
                {service.driver_included === false && bookingData.driverOption === 'with-driver' && (
                  <p className="text-xs text-amber-600 mt-1">+30% additional cost</p>
                )}
              </div>
            </div>

            {/* Locations & Options Section */}
            {bookingData.driverOption === 'with-driver' && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Pickup & Drop-off Locations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Pickup location"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={bookingData.pickupLocation}
                    onChange={(e) => handleInputChange('pickupLocation', e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Drop-off location"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={bookingData.dropoffLocation}
                    onChange={(e) => handleInputChange('dropoffLocation', e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Special Requests</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Any special requirements..."
                value={bookingData.specialRequests}
                onChange={(e) => handleInputChange('specialRequests', e.target.value)}
              />
            </div>

            {/* Contact Information Section */}
            <div className="border-t pt-4 sm:pt-6">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Your Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <input
                  type="text"
                  placeholder="Full name *"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm"
                  value={bookingData.contactName}
                  onChange={(e) => handleInputChange('contactName', e.target.value)}
                  required
                />
                <input
                  type="email"
                  placeholder="Email address *"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={bookingData.contactEmail}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  required
                />
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone (Optional)</label>
                  <div className="flex gap-2">
                    <div className="relative country-dropdown w-32">
                      <button
                        type="button"
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm flex items-center justify-between"
                        onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                      >
                        <span className="truncate text-xs">
                          {countries.find(c => c.code === bookingData.countryCode)?.flag || '🌍'} {bookingData.countryCode}
                        </span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {countryDropdownOpen && (
                        <div className="absolute top-full left-0 z-50 w-56 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          <div className="p-2 border-b">
                            <input
                              type="text"
                              placeholder="Search..."
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                            />
                          </div>
                          <div className="max-h-40 overflow-y-auto">
                            {filteredCountries.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                className="w-full px-2 py-1 text-left hover:bg-gray-100 flex items-center gap-2 text-xs"
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
                      placeholder="Phone number"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      value={bookingData.contactPhone}
                      onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="border-t pt-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Payment Details</h3>
              
              {/* Price Breakdown */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">{service.title}</span>
                    <span className="font-medium">{formatCurrencyWithConversion(basePrice, service.currency)}</span>
                  </div>
                  {driverCost > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Driver service (30%)</span>
                      <span className="font-medium">{formatCurrencyWithConversion(driverCost, service.currency)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                    <span>Total</span>
                    <span>{formatCurrencyWithConversion(totalPrice, service.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method *</label>
                <div className="space-y-3">
                  <label className="flex items-center cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={bookingData.paymentMethod === 'card'}
                      onChange={() => handlePaymentMethodChange('card')}
                      className="w-4 h-4"
                      disabled
                    />
                    <span className="ml-2 text-sm opacity-50">Card (Coming soon)</span>
                  </label>
                  <label className="flex items-center cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="mobile"
                      checked={bookingData.paymentMethod === 'mobile'}
                      onChange={() => handlePaymentMethodChange('mobile')}
                      className="w-4 h-4"
                    />
                    <span className="ml-2 text-sm">Mobile Money</span>
                  </label>
                </div>
                {cardNoticeVisible && (
                  <p className="text-xs text-red-600 mt-2">Card payments not available yet</p>
                )}
              </div>

              {/* Mobile Money Provider */}
              {bookingData.paymentMethod === 'mobile' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Provider *</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={bookingData.mobileProvider}
                    onChange={(e) => handleInputChange('mobileProvider', e.target.value)}
                  >
                    <option value="">Select provider</option>
                    <option value="MTN">MTN Mobile Money</option>
                    <option value="Airtel">Airtel Money</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4 sm:space-y-6 -mt-20 sm:-mt-24">
            {/* Success Header */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Booking Confirmed!</h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Your transportation booking has been successfully confirmed. You will receive a confirmation email shortly.
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
              </div>
            </div>

            {/* Trip Details */}
            <div className="pt-4 sm:pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Trip Details</h4>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Pick-up Date & Time:</span>
                  <span className="font-medium text-right">{bookingData.startDate || 'Not set'} {bookingData.startTime ? `at ${bookingData.startTime}` : ''}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Drop-off Date & Time:</span>
                  <span className="font-medium text-right">{bookingData.endDate || 'Not set'} {bookingData.endTime ? `at ${bookingData.endTime}` : ''}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium text-right">
                    {bookingData.startDate && bookingData.endDate 
                      ? `${calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)} days`
                      : 'N/A'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Pick-up Location:</span>
                  <span className="font-medium text-right max-w-xs">{bookingData.pickupLocation || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Drop-off Location:</span>
                  <span className="font-medium text-right max-w-xs">{bookingData.dropoffLocation || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Passenger & Payment Details */}
            <div className="pt-4 sm:pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Booking Information</h4>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Passengers:</span>
                  <span className="font-medium">{bookingData.passengers}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Driver Option:</span>
                  <span className="font-medium">{bookingData.driverOption === 'with-driver' ? 'With Driver' : 'Without Driver'}</span>
                </div>
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

            {/* Contact Details */}
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
              <div className="flex justify-between items-center">
                <span className="text-base sm:text-lg font-semibold text-gray-900">Total Amount:</span>
                <span className="text-lg sm:text-2xl font-bold text-blue-600">{formatCurrencyWithConversion(totalPrice, service.currency)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 sm:gap-3 justify-center pt-6 sm:pt-8">
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

            {/* Similar Services Carousel */}
            {service.category_id && (
              <SimilarServicesCarousel
                categoryId={service.category_id}
                excludeServiceId={service.id}
                limit={8}
              />
            )}
          </div>
        )

      default:
        return null
    }
  }

  // Show booking confirmation screen only if booking is confirmed in Supabase
  if (bookingConfirmed) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pt-28 sm:pt-32 min-h-screen">
        <div className="space-y-4 sm:space-y-6 -mt-20 sm:-mt-24">
          {/* Success Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Booking Confirmed!</h3>
            <p className="text-gray-600 text-sm sm:text-base">
              Your transportation booking has been successfully confirmed. You will receive a confirmation email shortly.
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
            </div>
          </div>

          {/* Trip Details */}
          <div className="pt-4 sm:pt-6 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Trip Details</h4>
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Pick-up Date & Time:</span>
                <span className="font-medium text-right">{bookingData.startDate || 'Not set'} {bookingData.startTime ? `at ${bookingData.startTime}` : ''}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Drop-off Date & Time:</span>
                <span className="font-medium text-right">{bookingData.endDate || 'Not set'} {bookingData.endTime ? `at ${bookingData.endTime}` : ''}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium text-right">
                  {bookingData.startDate && bookingData.endDate 
                    ? `${calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)} days`
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Pick-up Location:</span>
                <span className="font-medium text-right max-w-xs">{bookingData.pickupLocation || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Drop-off Location:</span>
                <span className="font-medium text-right max-w-xs">{bookingData.dropoffLocation || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Passenger & Payment Details */}
          <div className="pt-4 sm:pt-6 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Booking Information</h4>
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Passengers:</span>
                <span className="font-medium">{bookingData.passengers}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Driver Option:</span>
                <span className="font-medium">{bookingData.driverOption === 'with-driver' ? 'With Driver' : 'Without Driver'}</span>
              </div>
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

          {/* Contact Details */}
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
            <div className="flex justify-between items-center">
              <span className="text-base sm:text-lg font-semibold text-gray-900">Total Amount:</span>
              <span className="text-lg sm:text-2xl font-bold text-blue-600">{formatCurrencyWithConversion(totalPrice, service.currency)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 sm:gap-3 justify-center pt-6 sm:pt-8">
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

          {/* Similar Services Carousel */}
          {service.category_id && (
            <SimilarServicesCarousel
              categoryId={service.category_id}
              excludeServiceId={service.id}
              limit={8}
            />
          )}
        </div>
      </div>
    )
  }

  // Show error if booking failed
  if (bookingError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Booking Failed</h3>
            <p className="text-gray-600">{bookingError}</p>
          </div>
          <button
            onClick={() => setCurrentStep(1)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Filter countries based on search
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.code.includes(countrySearch)
  )

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

      {/* Progress Steps - Sticky */}
      <div className="bg-white shadow-sm sticky top-16 z-20 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between w-full flex-nowrap">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = step.id < currentStep

              return (
                <div key={step.id} className="flex items-center flex-none">
                  <div className={`flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full ${
                    isCompleted
                      ? 'bg-green-600 text-white'
                      : isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    <Icon className="w-2.5 h-2.5 md:w-3 md:h-3" />
                  </div>
                  <span className={`ml-0.5 md:ml-1 text-[10px] md:text-xs font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`${isCompleted ? 'bg-green-600' : 'bg-gray-200'} w-2 md:w-3 h-0.5 mx-0.5 md:mx-1`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pt-28 sm:pt-32">

        {/* Main Layout: Image on Left, Form on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 -mt-32">
          
          {/* Service Image - Sticky on Desktop */}
          <div className="lg:col-span-5 -mx-3 sm:-mx-0 lg:mx-0">
            <div className="sticky top-4">
              <div className="relative">
                <img
                  src={selectedImage || service.images?.[0] || 'https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg'}
                  alt={service.title}
                  className="w-screen lg:w-full h-64 md:h-80 object-cover cursor-pointer"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                />
                {service.images && service.images.length > 0 && (
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
                    {currentImageIndex + 1} / {service.images.length}
                  </div>
                )}
              </div>
              
              {/* Image Thumbnails - Desktop Only */}
              {service.images && service.images.length > 1 && (
                <div className="hidden lg:flex gap-2 mt-3">
                  {service.images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentImageIndex(index)
                        setSelectedImage(img)
                      }}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        currentImageIndex === index ? 'border-blue-600' : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form and Details - Right Side */}
          <div className="lg:col-span-7 space-y-3 sm:space-y-4 pt-2 sm:pt-4">
            {/* Service Info Header */}
            <div>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1">
                {service.title} <span className="text-gray-600 font-normal">in {service.location}</span>
              </h2>
              <p className="text-gray-600 text-xs sm:text-sm mb-3">{service.service_categories.name}</p>
              
              {/* Price Summary */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg sm:text-xl font-bold text-gray-900">
                    {formatCurrencyWithConversion(totalPrice, service.currency)}
                  </div>
                  <div className="text-xs text-gray-500">
                    One way {bookingData.startDate && bookingData.endDate ? `• ${calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)} days` : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Step Content */}
            <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
              {renderStepContent()}
            </div>

        {/* Navigation */}
        {currentStep < 2 && (
          <div className="mt-4 sm:mt-6">
            {/* Mobile: Horizontal layout with smaller buttons */}
            <div className="flex md:hidden justify-between gap-2">
              <button
                onClick={handleBack}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-xs sm:text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                disabled={
                  !bookingData.startDate ||
                  !bookingData.endDate ||
                  (bookingData.driverOption === 'with-driver' && (!bookingData.pickupLocation || !bookingData.dropoffLocation)) ||
                  !bookingData.contactName ||
                  !bookingData.contactEmail ||
                  bookingData.paymentMethod === 'card'
                }
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-xs sm:text-sm font-medium"
              >
                Complete Booking
              </button>
            </div>

            {/* Desktop: Horizontal layout */}
            <div className="hidden md:flex justify-between gap-3 mt-4">
              <button
                onClick={handleBack}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                disabled={
                  !bookingData.startDate ||
                  !bookingData.endDate ||
                  (bookingData.driverOption === 'with-driver' && (!bookingData.pickupLocation || !bookingData.dropoffLocation)) ||
                  !bookingData.contactName ||
                  !bookingData.contactEmail ||
                  bookingData.paymentMethod === 'card'
                }
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Complete Booking
              </button>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  )
}