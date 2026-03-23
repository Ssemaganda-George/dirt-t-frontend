import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CreditCard, CheckCircle, XCircle, Copy } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { createBooking as createVendorBooking } from '../store/vendorStore'
import { createBooking as createDatabaseBooking } from '../lib/database'
import { supabase } from '../lib/supabaseClient'
import SimilarServicesCarousel from '../components/SimilarServicesCarousel'
import CityPickerModal from '../components/CityPickerModal'
import MapModal from '../components/MapModal'

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
  // Optional transport/fuel metadata (may be present for transport services)
  avgSpeedKmph?: number
  fuel_km_per_liter?: number
  fuelKmPerL?: number
  fuel_consumption_per_100km?: number
  price_within_town?: number
  price_upcountry?: number
  vehicle_engine?: string
  vehicle_ccs?: number
  fuel_type?: string
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
  const [bookingResult, setBookingResult] = useState<any | null>(null)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [pollingMessage, setPollingMessage] = useState('')
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false)
  const backupPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [selectedImage, setSelectedImage] = useState('')
  const [bookingData, setBookingData] = useState({
    date: '', // No longer pre-filled from URL params
    pickupLocation: service.pickup_locations?.[0] || '',
    dropoffLocation: service.dropoff_locations?.[0] || '',
    passengers: 1,
    returnTrip: false,
    specialRequests: '',
    tripSetoff: '',
    tripStopovers: '',
    tripDestination: '',
    tripReturnOption: '',
    // Journey estimation inputs
    avgSpeedKmph: 60,
    fuelConsumptionPer100Km: 10,
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

  const [journeyStep, setJourneyStep] = useState<'setoff' | 'stopovers' | 'destination'>('setoff')

  // Whether the user has saved the journey summary
  const [journeySaved, setJourneySaved] = useState(false)

  const buildJourneySummary = () => {
    const parts: string[] = []
    if ((bookingData as any).tripSetoff) parts.push('Set-off: ' + (bookingData as any).tripSetoff)
    if (stopovers && stopovers.length > 0) parts.push('Stop-overs: ' + stopovers.map(s => `${s.label} (${s.durationHours}h)`).join(' ; '))
    else if ((bookingData as any).tripStopovers) parts.push('Stop-overs: ' + (bookingData as any).tripStopovers)
    if ((bookingData as any).tripDestination) parts.push('Destination: ' + (bookingData as any).tripDestination)
    if ((bookingData as any).tripReturnOption) parts.push('Return option: ' + ((bookingData as any).tripReturnOption === 'return' ? 'Return to set-off point' : 'Drop and leave'))

    const coordDistance = computeTotalDistanceKm()
    if (coordDistance > 0) {
      const { hours, liters } = computeEstimatesFromDistance(
        coordDistance,
        Number((bookingData as any).avgSpeedKmph || 60),
        Number((bookingData as any).fuelConsumptionPer100Km || 10),
        Number((bookingData as any).fuel_km_per_liter || (bookingData as any).fuelKmPerL || 0)
      )
      parts.push(`Estimated hours: ${hours.toFixed(1)} hrs`)
      parts.push(`Estimated distance: ${coordDistance.toFixed(1)} km`)
      parts.push(`Estimated fuel: ${liters.toFixed(1)} L`)
      const routeCheck = detectAbnormalRoute()
      if (routeCheck.abnormal) parts.push('Route anomaly: ' + routeCheck.reasons.join(' ; '))
    } else {
      const estHours = calculateHours(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)
      if (estHours > 0) {
        const { distanceKm, liters } = estimateFuel(
          estHours,
          Number((bookingData as any).avgSpeedKmph || 60),
          Number((bookingData as any).fuelConsumptionPer100Km || 10),
          Number((bookingData as any).fuel_km_per_liter || (bookingData as any).fuelKmPerL || 0)
        )
        parts.push(`Estimated hours: ${estHours.toFixed(1)} hrs`)
        if (distanceKm > 0) parts.push(`Estimated distance: ${distanceKm.toFixed(1)} km`)
        parts.push(`Estimated fuel: ${liters.toFixed(1)} L`)
      }
    }

    return parts.join('\n')
  }

  const saveJourney = () => {
    const summary = buildJourneySummary()
    setBookingData(prev => ({ ...prev, journeySummary: summary }))
    setJourneySaved(true)
  }

  // Spinner state for return option calculation
  const [isCalculatingReturn, setIsCalculatingReturn] = useState(false)
  const calcTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleReturnOptionChange = (option: 'return' | 'drop') => {
    // Set the selection immediately so the radio updates, then show a brief spinner
    setBookingData(prev => ({ ...prev, tripReturnOption: option }))
    setIsCalculatingReturn(true)
    if (calcTimeoutRef.current) {
      clearTimeout(calcTimeoutRef.current)
      calcTimeoutRef.current = null
    }
    calcTimeoutRef.current = setTimeout(() => {
      setIsCalculatingReturn(false)
      calcTimeoutRef.current = null
    }, 5000)
  }

  useEffect(() => {
    return () => {
      if (calcTimeoutRef.current) {
        clearTimeout(calcTimeoutRef.current)
        calcTimeoutRef.current = null
      }
    }
  }, [])

  const hasDestination = Boolean((bookingData as any).tripDestination && (bookingData as any).tripDestination.toString().trim())
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

  // City picker modal for selecting destination
  const [isCityModalOpen, setIsCityModalOpen] = useState(false)

  const handleCitySelect = (city: string, country: string) => {
    const label = `${city}, ${country}`
    handleInputChange('tripDestination', label)
    // Try to geocode the selected city to get coordinates so distance estimates can use them
    ;(async () => {
      try {
        const q = encodeURIComponent(label)
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${q}&limit=1`
        const res = await fetch(url, { headers: { Accept: 'application/json' } })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            const d = data[0]
            setDestinationLocation({ lat: Number(d.lat), lng: Number(d.lon), label: d.display_name || label })
          }
        }
      } catch (e) {
        // ignore geocode failures — estimates will fall back to time-based calculation
        console.warn('City geocode failed', e)
      }
    })()
    setIsCityModalOpen(false)
  }

  // Map modal state used for picking set-off / stopovers / destination
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [mapModalMode, setMapModalMode] = useState<'setoff' | 'stopover' | 'destination' | null>(null)
  const [mapInitialMarker, setMapInitialMarker] = useState<{ lat: number; lng: number; label?: string } | undefined>(undefined)

  // set-off location stored separately for lat/lng; keep bookingData.tripSetoff string for compatibility
  const [setoffLocation, setSetoffLocation] = useState<{ lat: number; lng: number; label: string } | null>(null)

  // destination location stored separately when selected on map
  const [destinationLocation, setDestinationLocation] = useState<{ lat: number; lng: number; label: string } | null>(null)
  
  // Map search/autocomplete state
  const [activeSearchTarget, setActiveSearchTarget] = useState<'setoff' | 'destination' | 'stopover' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<any>>([])
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // stopovers as structured array with duration (hours)
  const [stopovers, setStopovers] = useState<Array<{ id: string; lat: number; lng: number; label: string; durationHours: number }>>([])

  const openMapFor = (mode: 'setoff' | 'stopover' | 'destination') => {
    setMapModalMode(mode)
    setIsMapModalOpen(true)
    // set initial marker depending on existing data
    if (mode === 'setoff' && setoffLocation) setMapInitialMarker({ lat: setoffLocation.lat, lng: setoffLocation.lng, label: setoffLocation.label })
    else if (mode === 'destination' && destinationLocation) setMapInitialMarker({ lat: destinationLocation.lat, lng: destinationLocation.lng, label: destinationLocation.label })
    else setMapInitialMarker(undefined)
  }

  const handleMapSelect = (lat: number, lng: number, label?: string) => {
    const place = label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    if (mapModalMode === 'setoff') {
      setSetoffLocation({ lat, lng, label: place })
      handleInputChange('tripSetoff', place)
    } else if (mapModalMode === 'destination') {
      // store both a human readable label and structured coords when selecting destination on map
      // call handleInputChange first (which will clear any previous coords), then set structured coords
      handleInputChange('tripDestination', place)
      setDestinationLocation({ lat, lng, label: place })
    } else if (mapModalMode === 'stopover') {
      const id = `s_${Date.now().toString(36).slice(2,8)}`
      const next = [...stopovers, { id, lat, lng, label: place, durationHours: 1 }]
      setStopovers(next)
      // store serialized stopovers in bookingData.tripStopovers for persistence
      handleInputChange('tripStopovers', JSON.stringify(next))
    }
    // clear modal mode
    setMapModalMode(null)
  }

  const removeStopover = (id: string) => {
    const next = stopovers.filter(s => s.id !== id)
    setStopovers(next)
    handleInputChange('tripStopovers', next.length ? JSON.stringify(next) : '')
  }

  const updateStopoverDuration = (id: string, hours: number) => {
    const next = stopovers.map(s => s.id === id ? { ...s, durationHours: hours } : s)
    setStopovers(next)
    handleInputChange('tripStopovers', next.length ? JSON.stringify(next) : '')
  }

  // Pre-fill dates from navigation state if available
  useEffect(() => {
    if (location.state) {
      const { startDate, endDate, selectedDate } = location.state as any
      const { transportZone: incomingZone } = location.state as any
      if (startDate && endDate) {
        setBookingData(prev => ({
          ...prev,
          startDate,
          endDate
        }))
        if (incomingZone) setTransportZone(incomingZone)
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

  // Populate booking defaults from service transport metadata (fuel, engine, etc.)
  useEffect(() => {
    if (!service) return
    try {
      const fuelKmPerL = (service as any).fuel_km_per_liter ?? (service as any).fuelKmPerL ?? null
      const fuelPer100Km = (service as any).fuel_consumption_per_100km ?? (fuelKmPerL ? Number((100 / Number(fuelKmPerL)).toFixed(2)) : null)
      // If the service provides fuel metadata, prefer it and override defaults so estimates use vendor values
      if (fuelKmPerL || fuelPer100Km) {
        setBookingData(prev => ({
          ...prev,
          avgSpeedKmph: service?.avgSpeedKmph ?? prev.avgSpeedKmph ?? 60,
          fuelConsumptionPer100Km: fuelPer100Km ?? (fuelKmPerL ? Number((100 / Number(fuelKmPerL)).toFixed(2)) : prev.fuelConsumptionPer100Km ?? 10),
          fuel_km_per_liter: fuelKmPerL ?? (prev as any).fuel_km_per_liter,
          fuelKmPerL: fuelKmPerL ?? (prev as any).fuelKmPerL
        }))
      }
    } catch (e) {
      console.warn('Failed to populate booking defaults from service:', e)
    }
  }, [service])

  function getTransportUnitPrice(): number | null {
    const rawWithin = (service as any).price_within_town
    const rawUp = (service as any).price_upcountry
    const within = rawWithin !== undefined && rawWithin !== null ? Number(rawWithin) : undefined
    const up = rawUp !== undefined && rawUp !== null ? Number(rawUp) : undefined
    const fallback = service.price !== undefined && service.price !== null ? Number(service.price) : null
    if (service.service_categories?.name?.toLowerCase() !== 'transport') return fallback
    if (transportZone === 'within') return !isNaN(within as number) ? (within as number) : fallback
    if (transportZone === 'upcountry') return !isNaN(up as number) ? (up as number) : fallback
    // No selection: if only one exists, return that, otherwise fallback to service.price
    if (!isNaN(within as number) && (isNaN(up as number) || up === undefined)) return within as number
    if (!isNaN(up as number) && (isNaN(within as number) || within === undefined)) return up as number
    return fallback
  }

  const [transportZone, setTransportZone] = useState<'within' | 'upcountry' | ''>('')

  // Auto-default transport zone when only one transport price exists
  useEffect(() => {
    try {
      const hasWithin = typeof (service as any).price_within_town === 'number' && (service as any).price_within_town !== null
      const hasUp = typeof (service as any).price_upcountry === 'number' && (service as any).price_upcountry !== null
      if (service.service_categories?.name?.toLowerCase() === 'transport') {
        if (hasWithin && !hasUp) setTransportZone('within')
        else if (!hasWithin && hasUp) setTransportZone('upcountry')
      }
    } catch (e) {
      // ignore
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
        // Only enforce an upper bound when the service specifies a capacity
        const maxCapacity = (service.vehicle_capacity ?? service.max_capacity) ?? null
        if (bookingData.passengers < 1 || (maxCapacity !== null && bookingData.passengers > maxCapacity)) {
          alert(`Number of passengers must be between 1 and ${maxCapacity !== null ? maxCapacity : 'unlimited'}.`)
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

      // If completing booking (step 1), handle payment then create booking
      if (currentStep === 1) {
        setBookingError(null)

        if (bookingData.paymentMethod === 'mobile') {
          // Validate phone number
          const rawPhone = phoneNumber.trim().replace(/^\+256/, '')
          const phone = rawPhone.startsWith('+') ? rawPhone : `+256${rawPhone.replace(/^0/, '')}`
          if (!phone || phone.length < 12) {
            setBookingError('Please enter a valid mobile money phone number (e.g. 0712345678).')
            return
          }
          if (!bookingData.mobileProvider) {
            setBookingError('Please select a mobile money provider (MTN or Airtel).')
            return
          }

          setIsPaymentProcessing(true)
          setPollingMessage('Initiating payment…')

          try {
            const { data: session } = await supabase.auth.getSession()
            const tempRef = `bk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

            const collectRes = await fetch(`${supabaseUrl}/functions/v1/marzpay-collect`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({
                amount: Math.round(totalPrice),
                phone_number: phone,
                booking_id: tempRef,
                description: `${service.title} transport booking`,
                user_id: session?.session?.user?.id || undefined,
              }),
            })

            let resultBody: any = {}
            try {
              const text = await collectRes.text()
              try { resultBody = JSON.parse(text) } catch { resultBody = { raw: text } }
            } catch (e) {
              resultBody = { error: 'Failed to read response body' }
            }

            if (!collectRes.ok) {
              const msg = resultBody?.error || resultBody?.message || resultBody?.raw || JSON.stringify(resultBody)
              console.error('marzpay-collect failed', collectRes.status, msg)
              setBookingError(`Payment initiation failed: ${msg}`)
              setPollingMessage('')
              setIsPaymentProcessing(false)
              return
            }

            const ref = resultBody?.data?.reference || resultBody?.reference || (resultBody?.data && resultBody.data.reference)
            if (!ref) {
              const msg = resultBody?.error || resultBody?.message || 'No payment reference returned'
              console.error('marzpay-collect missing reference', msg, resultBody)
              setBookingError(`Payment initiation failed: ${msg}`)
              setPollingMessage('')
              setIsPaymentProcessing(false)
              return
            }
            setPollingMessage('Confirm the payment on your phone. Waiting for confirmation…')

            const checkStatus = async (): Promise<'completed' | 'failed' | null> => {
              try {
                const res = await fetch(
                  `${supabaseUrl}/functions/v1/marzpay-payment-status?reference=${encodeURIComponent(ref)}`,
                  { headers: { Authorization: `Bearer ${supabaseAnonKey}` } }
                )
                const data = await res.json().catch(() => ({})) as { status?: string }
                if (data?.status === 'completed') return 'completed'
                if (data?.status === 'failed') return 'failed'
                return null
              } catch { return null }
            }

            const finalise = async () => {
              setPollingMessage('Payment confirmed! Creating booking…')
              await createTransportBooking('paid')
            }

            const channel = supabase
              .channel(`payment_trp_${ref}`)
              .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments', filter: `reference=eq.${ref}` },
                async (payload) => {
                  const row = payload.new as { status: string }
                  if (row.status === 'completed') {
                    channel.unsubscribe()
                    if (backupPollRef.current) { clearInterval(backupPollRef.current); backupPollRef.current = null }
                    await finalise()
                  } else if (row.status === 'failed') {
                    channel.unsubscribe()
                    if (backupPollRef.current) { clearInterval(backupPollRef.current); backupPollRef.current = null }
                    setPollingMessage('')
                    setIsPaymentProcessing(false)
                    setBookingError('Payment was not completed or was declined. Please try again.')
                  }
                })
              .subscribe()

            const immediate = await checkStatus()
            if (immediate === 'completed') {
              channel.unsubscribe()
              await finalise()
              return
            } else if (immediate === 'failed') {
              channel.unsubscribe()
              setPollingMessage('')
              setIsPaymentProcessing(false)
              setBookingError('Payment was not completed or was declined. Please try again.')
              return
            }

            backupPollRef.current = setInterval(async () => {
              const status = await checkStatus()
              if (status === 'completed') {
                channel.unsubscribe()
                if (backupPollRef.current) { clearInterval(backupPollRef.current); backupPollRef.current = null }
                await finalise()
              } else if (status === 'failed') {
                channel.unsubscribe()
                if (backupPollRef.current) { clearInterval(backupPollRef.current); backupPollRef.current = null }
                setPollingMessage('')
                setIsPaymentProcessing(false)
                setBookingError('Payment was not completed or was declined. Please try again.')
              }
            }, 4000)
            setTimeout(() => {
              if (backupPollRef.current) { clearInterval(backupPollRef.current); backupPollRef.current = null }
            }, 120000)

          } catch (err: any) {
            console.error('Payment error:', err)
            setPollingMessage('')
            setIsPaymentProcessing(false)
            setBookingError(err?.message || 'Payment failed. Please try again.')
          }
          return
        }

        // Non-mobile-money: create booking directly
        await createTransportBooking('pending')
        return
      }
      setCurrentStep(currentStep + 1)
    }
  }

  const createTransportBooking = async (paymentStatus: 'paid' | 'pending') => {
    try {
      // Compute journey estimates (prefer coords) and prepare persisted journey fields
      const _coordDistance = computeTotalDistanceKm()
      let _estHours = 0
      let _estDistance = 0
      let _estLiters = 0
      if (_coordDistance > 0) {
        const res = computeEstimatesFromDistance(
          _coordDistance,
          Number((bookingData as any).avgSpeedKmph || 60),
          Number((bookingData as any).fuelConsumptionPer100Km || 10),
          Number((bookingData as any).fuel_km_per_liter || (bookingData as any).fuelKmPerL || 0)
        )
        _estHours = res.hours
        _estLiters = res.liters
        _estDistance = _coordDistance
      } else {
        const _estH = calculateHours(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)
        if (_estH > 0) {
          const res = estimateFuel(
            _estH,
            Number((bookingData as any).avgSpeedKmph || 60),
            Number((bookingData as any).fuelConsumptionPer100Km || 10),
            Number((bookingData as any).fuel_km_per_liter || (bookingData as any).fuelKmPerL || 0)
          )
          _estHours = _estH
          _estDistance = res.distanceKm
          _estLiters = res.liters
        }
      }

      // Save to vendor localStorage for demo panel
      createVendorBooking(service.vendor_id || 'vendor_demo', {
        service_id: service.id,
        vendor_id: service.vendor_id || 'vendor_demo',
        booking_date: new Date().toISOString(),
        service_date: bookingData.startDate,
        guests: bookingData.passengers,
        total_amount: totalPrice,
        currency: service.currency,
        status: 'confirmed' as const,
        special_requests: (() => {
          const parts = [] as string[]
          if ((bookingData as any).tripSetoff) parts.push('Set-off: ' + (bookingData as any).tripSetoff)
          if (stopovers && stopovers.length > 0) {
            parts.push('Stop-overs: ' + stopovers.map(s => `${s.label} (${s.durationHours}h)`).join(' ; '))
          } else if ((bookingData as any).tripStopovers) {
            parts.push('Stop-overs: ' + (bookingData as any).tripStopovers)
          }
          if ((bookingData as any).tripDestination) parts.push('Destination: ' + (bookingData as any).tripDestination)
          if ((bookingData as any).tripReturnOption) parts.push('Return option: ' + ((bookingData as any).tripReturnOption === 'return' ? 'Return to set-off point' : 'Drop and leave'))
          const estHours = calculateHours(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)
          // Prefer coordinate-based distance estimates when possible
          const coordDistance = computeTotalDistanceKm()
          if (coordDistance > 0) {
            const { hours, liters } = computeEstimatesFromDistance(
              coordDistance,
              Number((bookingData as any).avgSpeedKmph || 60),
              Number((bookingData as any).fuelConsumptionPer100Km || 10),
              Number((bookingData as any).fuel_km_per_liter || (bookingData as any).fuelKmPerL || 0)
            )
            parts.push(`Estimated hours: ${hours.toFixed(1)} hrs`)
            parts.push(`Estimated distance: ${coordDistance.toFixed(1)} km`)
            parts.push(`Estimated fuel: ${liters.toFixed(1)} L`)
            // Route sanity check
            const routeCheck = detectAbnormalRoute()
            if (routeCheck.abnormal) parts.push('Route anomaly: ' + routeCheck.reasons.join(' ; '))
          } else if (estHours > 0) {
            const { distanceKm, liters } = estimateFuel(
              estHours,
              Number((bookingData as any).avgSpeedKmph || 60),
              Number((bookingData as any).fuelConsumptionPer100Km || 10),
              Number((bookingData as any).fuel_km_per_liter || (bookingData as any).fuelKmPerL || 0)
            )
            parts.push(`Estimated hours: ${estHours.toFixed(1)} hrs`)
            if (distanceKm > 0) parts.push(`Estimated distance: ${distanceKm.toFixed(1)} km`)
            parts.push(`Estimated fuel: ${liters.toFixed(1)} L`)
          }
          if (bookingData.specialRequests) parts.push(bookingData.specialRequests)
          return parts.join('\n')
        })(),
        pickup_location: bookingData.driverOption === 'with-driver' ? bookingData.pickupLocation : undefined,
        dropoff_location: bookingData.driverOption === 'with-driver' ? bookingData.dropoffLocation : undefined,
        driver_option: bookingData.driverOption,
        return_trip: bookingData.returnTrip,
        start_time: bookingData.startTime,
        end_time: bookingData.endTime,
        end_date: bookingData.endDate,
        trip_setoff: (bookingData as any).tripSetoff || null,
        trip_setoff_lat: setoffLocation?.lat ?? null,
        trip_setoff_lng: setoffLocation?.lng ?? null,
        trip_destination: (bookingData as any).tripDestination || null,
        trip_destination_lat: destinationLocation?.lat ?? null,
        trip_destination_lng: destinationLocation?.lng ?? null,
        trip_stopovers: stopovers && stopovers.length > 0 ? JSON.stringify(stopovers) : ((bookingData as any).tripStopovers ? (bookingData as any).tripStopovers : null),
        trip_return_option: (bookingData as any).tripReturnOption || null,
        journey_estimated_hours: _estHours || null,
        journey_estimated_distance: _estDistance || null,
        journey_estimated_fuel: _estLiters || null,
        journey_summary: (bookingData as any).journeySummary || buildJourneySummary()
      } as any)

      const result = await createDatabaseBooking({
        service_id: service.id,
        tourist_id: user?.id,
        vendor_id: service.vendor_id || 'vendor_demo',
        booking_date: new Date().toISOString(),
        service_date: bookingData.startDate,
        guests: bookingData.passengers,
        total_amount: totalPrice,
        currency: service.currency,
        status: 'confirmed' as const,
        payment_status: paymentStatus as any,
        special_requests: `${(bookingData as any).tripSetoff ? 'Set-off: ' + (bookingData as any).tripSetoff + '\n' : ''}${stopovers && stopovers.length > 0 ? 'Stop-overs: ' + stopovers.map(s => `${s.label} (${s.durationHours}h)`).join(' ; ') + '\n' : ((bookingData as any).tripStopovers ? 'Stop-overs: ' + (bookingData as any).tripStopovers + '\n' : '')}${(bookingData as any).tripDestination ? 'Destination: ' + (bookingData as any).tripDestination + '\n' : ''}${(bookingData as any).tripReturnOption ? 'Return option: ' + ((bookingData as any).tripReturnOption === 'return' ? 'Return to set-off point' : 'Drop and leave') + '\n\n' : ''}${bookingData.specialRequests || ''}`,
        trip_setoff: (bookingData as any).tripSetoff || null,
        trip_setoff_lat: setoffLocation?.lat ?? null,
        trip_setoff_lng: setoffLocation?.lng ?? null,
        trip_destination: (bookingData as any).tripDestination || null,
        trip_destination_lat: destinationLocation?.lat ?? null,
        trip_destination_lng: destinationLocation?.lng ?? null,
        trip_destination_extra: (typeof (bookingData as any).tripDestinationExtra === 'number' && !isNaN((bookingData as any).tripDestinationExtra)) ? (bookingData as any).tripDestinationExtra : 0.0,
        trip_stopovers: stopovers && stopovers.length > 0 ? JSON.stringify(stopovers) : ((bookingData as any).tripStopovers ? (bookingData as any).tripStopovers : null),
        trip_return_option: (bookingData as any).tripReturnOption || null,
        journey_estimated_hours: (_estHours as number) || null,
        journey_estimated_distance: (_estDistance as number) || null,
        journey_estimated_fuel: (_estLiters as number) || null,
        journey_summary: (bookingData as any).journeySummary || buildJourneySummary(),
        guest_name: profile ? undefined : bookingData.contactName,
        guest_email: profile ? undefined : bookingData.contactEmail,
        guest_phone: profile ? undefined : `${bookingData.countryCode}${bookingData.contactPhone}`,
        pickup_location: bookingData.driverOption === 'with-driver' ? bookingData.pickupLocation : undefined,
        dropoff_location: bookingData.driverOption === 'with-driver' ? bookingData.dropoffLocation : undefined,
        driver_option: bookingData.driverOption,
        return_trip: bookingData.returnTrip,
        start_time: bookingData.startTime,
        end_time: bookingData.endTime,
        end_date: bookingData.endDate
      } as any)

      if (result && result.id) {
        setBookingResult(result)
        setBookingConfirmed(true)
        setPollingMessage('')
        setIsPaymentProcessing(false)
        setCurrentStep(2)
      } else {
        setBookingError('Booking could not be confirmed. Please try again.')
        setIsPaymentProcessing(false)
      }
    } catch (error: any) {
      setBookingError(error?.message || 'Booking could not be confirmed. Please try again.')
      setIsPaymentProcessing(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      navigate(`/service/${service.slug || service.id}`)
    }
  }

  const handleInputChange = (field: string, value: string | number | boolean | undefined) => {
    // Clear blocked error on change
    setBlockedError(null)
    setBookingData(prev => ({ ...prev, [field]: value }))

    // If user edited destination or setoff as text or via city picker, clear any previously stored coordinates
    if (field === 'tripDestination') {
      setDestinationLocation(null)
    }
    if (field === 'tripSetoff') {
      setSetoffLocation(null)
    }

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

  const calculateHours = (startDate: string, startTime: string, endDate: string, endTime: string): number => {
    if (!startDate || !endDate) return 0
    const start = new Date(`${startDate}T${startTime}`)
    const end = new Date(`${endDate}T${endTime}`)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0
    const diffMs = end.getTime() - start.getTime()
    if (diffMs <= 0) return 0
    return diffMs / (1000 * 60 * 60)
  }

  const FUEL_ERROR_PCT = 0.15 // 15% buffer for extreme conditions

  const estimateFuel = (hours: number, avgSpeedKmph: number, fuelPer100Km?: number, fuelKmPerL?: number, errorPct = FUEL_ERROR_PCT) => {
    if (!hours || !avgSpeedKmph) return { distanceKm: 0, liters: 0 }
    const distance = hours * avgSpeedKmph
    let liters = 0
    if (fuelKmPerL && fuelKmPerL > 0) {
      liters = distance / fuelKmPerL
    } else if (fuelPer100Km && fuelPer100Km > 0) {
      liters = (distance * fuelPer100Km) / 100
    }
    liters = liters * (1 + (errorPct || 0))
    return { distanceKm: distance, liters }
  }

  // Haversine distance between two points (km)
  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const toRad = (v: number) => (v * Math.PI) / 180
    const R = 6371 // Earth radius km
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Build waypoints from setoff, stopovers, destination and compute total distance (optionally doubling for return)
  const computeTotalDistanceKm = (): number => {
    const pts: Array<{ lat: number; lng: number }> = []
    if (setoffLocation) pts.push({ lat: setoffLocation.lat, lng: setoffLocation.lng })
    if (stopovers && stopovers.length > 0) {
      for (const s of stopovers) pts.push({ lat: s.lat, lng: s.lng })
    }
    if (destinationLocation) pts.push({ lat: destinationLocation.lat, lng: destinationLocation.lng })

    if (pts.length < 2) return 0

    let total = 0
    for (let i = 0; i < pts.length - 1; i++) {
      total += haversineKm(pts[i].lat, pts[i].lng, pts[i + 1].lat, pts[i + 1].lng)
    }

    // If the user selected 'return', approximate by doubling the outbound distance
    // If driver needs to return (either explicit return or drop-and-leave where driver returns), double outbound distance
    if ((bookingData as any).tripReturnOption === 'return' || (bookingData as any).tripReturnOption === 'drop') total = total * 2
    return total
  }

  const computeEstimatesFromDistance = (distanceKm: number, avgSpeedKmph: number, fuelPer100Km?: number, fuelKmPerL?: number, errorPct = FUEL_ERROR_PCT) => {
    if (!distanceKm || !avgSpeedKmph) return { hours: 0, liters: 0 }
    const hours = distanceKm / avgSpeedKmph
    let liters = 0
    if (fuelKmPerL && fuelKmPerL > 0) {
      liters = distanceKm / fuelKmPerL
    } else if (fuelPer100Km && fuelPer100Km > 0) {
      liters = (distanceKm * fuelPer100Km) / 100
    }
    liters = liters * (1 + (errorPct || 0))
    return { hours, liters }
  }

  // Detect abnormal routing: large legs, huge detours vs direct distance, or very long totals
  const detectAbnormalRoute = () => {
    const pts: Array<{ lat: number; lng: number }> = []
    if (setoffLocation) pts.push({ lat: setoffLocation.lat, lng: setoffLocation.lng })
    if (stopovers && stopovers.length > 0) {
      for (const s of stopovers) pts.push({ lat: s.lat, lng: s.lng })
    }
    if (destinationLocation) pts.push({ lat: destinationLocation.lat, lng: destinationLocation.lng })

    const reasons: string[] = []
    if (pts.length < 2) return { abnormal: false, reasons }

    const direct = (setoffLocation && destinationLocation) ? haversineKm(setoffLocation.lat, setoffLocation.lng, destinationLocation.lat, destinationLocation.lng) : 0
    let total = 0
    for (let i = 0; i < pts.length - 1; i++) {
      const leg = haversineKm(pts[i].lat, pts[i].lng, pts[i + 1].lat, pts[i + 1].lng)
      total += leg
      if (leg > 2000) reasons.push(`Very long leg: ${leg.toFixed(1)} km between waypoint ${i + 1} and ${i + 2}`)
    }
    if ((bookingData as any).tripReturnOption === 'return' || (bookingData as any).tripReturnOption === 'drop') total = total * 2

    if (direct > 0 && total > direct * 3) reasons.push(`Total route ${total.toFixed(1)} km is > 3× direct distance ${direct.toFixed(1)} km`)
    if (total > 5000) reasons.push(`Total route unusually long: ${total.toFixed(0)} km`)

    return { abnormal: reasons.length > 0, reasons }
  }

  // Perform a debounced Nominatim search for suggestions
  const performSearch = async (q: string) => {
    if (!q || q.trim().length < 2) {
      setSearchResults([])
      return
    }
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(q)}&limit=6`
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
      const data = await res.json()
      if (Array.isArray(data)) {
        setSearchResults(data.map((d: any) => ({ place_id: d.place_id, display_name: d.display_name, lat: d.lat, lon: d.lon })))
      } else {
        setSearchResults([])
      }
    } catch (e) {
      console.warn('Map search failed', e)
      setSearchResults([])
    }
  }

  // Trigger debounced search when query changes
  useEffect(() => {
    if (!activeSearchTarget) return
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [searchQuery, activeSearchTarget])

  const selectSuggestion = (target: 'setoff' | 'destination' | 'stopover', item: any) => {
    const label = item.display_name || `${item.lat}, ${item.lon}`
    if (target === 'setoff') {
      setSetoffLocation({ lat: Number(item.lat), lng: Number(item.lon), label })
      handleInputChange('tripSetoff', label)
    } else if (target === 'destination') {
      setDestinationLocation({ lat: Number(item.lat), lng: Number(item.lon), label })
      handleInputChange('tripDestination', label)
    } else {
      // add a stopover entry
      const id = `s_${Date.now().toString(36).slice(2,8)}`
      const next = [...stopovers, { id, lat: Number(item.lat), lng: Number(item.lon), label, durationHours: 1 }]
      setStopovers(next)
      handleInputChange('tripStopovers', JSON.stringify(next))
    }
    setSearchResults([])
    setActiveSearchTarget(null)
    setSearchQuery('')
  }

  // Geocode a free-text place label using Nominatim (returns {lat,lng,display_name} or null)
  const geocodeLabel = async (label: string) => {
    if (!label || !label.trim()) return null
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(label)}&limit=1`
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) return null
      const data = await res.json()
      if (!Array.isArray(data) || data.length === 0) return null
      const d = data[0]
      return { lat: Number(d.lat), lng: Number(d.lon), display_name: d.display_name }
    } catch (e) {
      console.warn('geocodeLabel error', e)
      return null
    }
  }

  // Ensure coordinates exist for setoff/destination when user provides text labels
  const geocodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    // debounce to avoid rapid geocoding while typing
    if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current)
    geocodeTimeoutRef.current = setTimeout(async () => {
      try {
        if (!setoffLocation && (bookingData as any).tripSetoff && (bookingData as any).tripSetoff.toString().trim().length > 3) {
          const res = await geocodeLabel((bookingData as any).tripSetoff)
          if (res) setSetoffLocation({ lat: res.lat, lng: res.lng, label: res.display_name || (bookingData as any).tripSetoff })
        }
        if (!destinationLocation && (bookingData as any).tripDestination && (bookingData as any).tripDestination.toString().trim().length > 3) {
          const res = await geocodeLabel((bookingData as any).tripDestination)
          if (res) setDestinationLocation({ lat: res.lat, lng: res.lng, label: res.display_name || (bookingData as any).tripDestination })
        }
      } catch (e) {
        // ignore
      }
    }, 400)
    return () => { if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current) }
  }, [(bookingData as any).tripSetoff, (bookingData as any).tripDestination, stopovers.length])

  // ...existing code...

  // Generate and download a PDF receipt using jsPDF
  const downloadReceiptPDF = (result: any) => {
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const left = 40
      let y = 48

      const vendorName = service.vendors?.business_name || 'DIRT TRAILS'
      const receiptShort = (result.id || '').toString().replace(/-/g, '').slice(0, 8).toUpperCase()

      // Header - Vendor name and receipt title
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.text(vendorName, left, y)
      y += 20
      doc.setFontSize(13)
      doc.setFont('helvetica', 'normal')
      doc.text('Adventure Booking Receipt', left, y)
      y += 20

      // Receipt meta
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(`Receipt #: ${receiptShort}`, left, y)
      doc.setFont('helvetica', 'normal')
      doc.text(new Date().toLocaleDateString(), pageWidth - left, y, { align: 'right' })
      y += 18

      // Status
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('BOOKING CONFIRMED', left, y)
      y += 18

      // Customer info
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('CUSTOMER INFORMATION', left, y)
      y += 14
      doc.setFont('helvetica', 'normal')
      doc.text(`Name: ${bookingData.contactName || 'N/A'}`, left + 8, y)
      y += 12
      doc.text(`Email: ${bookingData.contactEmail || 'N/A'}`, left + 8, y)
      y += 12
      doc.text(`Phone: ${bookingData.countryCode || ''}${bookingData.contactPhone || ''}`, left + 8, y)
      y += 18

      // Service details
      doc.setFont('helvetica', 'bold')
      doc.text('SERVICE DETAILS', left, y)
      y += 14
      doc.setFont('helvetica', 'normal')
      doc.text(`Activity: ${service.title}`, left + 8, y)
      y += 12
      doc.text(`Location: ${service.location || 'N/A'}`, left + 8, y)
      y += 12
      doc.text(`Category: ${service.service_categories?.name || 'N/A'}`, left + 8, y)
      y += 12
      const dateText = bookingData.startDate ? new Date(bookingData.startDate).toLocaleDateString() : 'N/A'
      doc.text(`Date: ${dateText}`, left + 8, y)
      y += 12
      const durationHours = Math.max(0, Math.floor(calculateHours(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)))
      doc.text(`Duration: ${durationHours} hours`, left + 8, y)
      y += 12
      doc.text(`Participants: ${bookingData.passengers || 1}`, left + 8, y)
      y += 18

      // Provider
      doc.setFont('helvetica', 'bold')
      doc.text('SERVICE PROVIDER', left, y)
      y += 14
      doc.setFont('helvetica', 'normal')
      doc.text(`Provider: ${service.vendors?.business_name || 'N/A'}`, left + 8, y)
      y += 12
      doc.text(`Contact: ${service.vendors?.business_phone || 'N/A'}`, left + 8, y)
      y += 18

      // Trip details (pickup/dropoff, duration, locations, special requests)
      doc.setFont('helvetica', 'bold')
      doc.text('TRIP DETAILS', left, y)
      y += 14
      doc.setFont('helvetica', 'normal')
      const pickupTxt = `${bookingData.startDate || 'N/A'}${bookingData.startTime ? ' at ' + bookingData.startTime : ''}`
      const dropTxt = `${bookingData.endDate || 'N/A'}${bookingData.endTime ? ' at ' + bookingData.endTime : ''}`
      doc.text(`Pick-up: ${pickupTxt}`, left + 8, y)
      y += 12
      doc.text(`Drop-off: ${dropTxt}`, left + 8, y)
      y += 12
      const durDays = bookingData.startDate && bookingData.endDate ? calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime) : null
      const durHours = bookingData.startDate && bookingData.endDate ? Math.max(0, Math.floor(calculateHours(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime))) : null
      doc.text(`Duration: ${durDays !== null ? `${durDays} days` : 'N/A'} ${durHours !== null ? `(${durHours} hrs)` : ''}`, left + 8, y)
      y += 12
      doc.text(`Pick-up Location: ${bookingData.pickupLocation || 'N/A'}`, left + 8, y)
      y += 12
      doc.text(`Drop-off Location: ${bookingData.dropoffLocation || 'N/A'}`, left + 8, y)
      y += 12
      doc.text(`Driver Option: ${bookingData.driverOption === 'with-driver' ? 'With Driver' : 'Without Driver'}`, left + 8, y)
      y += 12
      doc.text(`Special Requests: ${bookingData.specialRequests || 'None'}`, left + 8, y)
      y += 16

      // Payment Summary
      doc.setFont('helvetica', 'bold')
      doc.text('PAYMENT SUMMARY', left, y)
      y += 14
      doc.setFont('helvetica', 'normal')
      const unitPrice = basePrice || 0
      doc.text(`Unit Price: ${unitPrice ? formatCurrencyWithConversion(unitPrice, service.currency) : `UGXNaN`}`, left + 8, y)
      y += 12
      doc.text(`Quantity: ${bookingData.passengers || 1}`, left + 8, y)
      y += 12
      doc.setFont('helvetica', 'bold')
      doc.text(`TOTAL: ${formatCurrencyWithConversion(totalPrice, service.currency)}`, left + 8, y)
      y += 20

      doc.setFont('helvetica', 'normal')
      doc.text('Thank you for choosing Dirt Trails!', left, y)
      y += 18

      doc.setFontSize(10)
      doc.text(`Booking Reference: ${result.id || ''}`, left, y)

      doc.save(`receipt-${result.id || 'booking'}.pdf`)
    } catch (e) {
      console.error('Failed to generate PDF receipt:', e)
      alert('Failed to download PDF receipt.')
    }
  }

  const totalPrice = (() => {
    // compute using transport-specific unit price when available
    const unit = getTransportUnitPrice()
    const days = calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)
    const base = (unit || 0) * days
    const driverCostLocal = (bookingData.driverOption === 'with-driver' && !service.driver_included) ? base * 0.3 : 0
    return base + driverCostLocal
  })()
  // Expose basePrice and driverCost for UI breakdown
  const [unitPrice, setUnitPrice] = useState<number | null>(() => getTransportUnitPrice())
  useEffect(() => {
    setUnitPrice(getTransportUnitPrice())
  }, [transportZone, service])

  const basePrice = (unitPrice || service.price || 0) * calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Journey Design</label>
              <div className="mb-3">
                <div className="flex items-center gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setJourneyStep('setoff')}
                    className={`px-3 py-1 rounded-md ${journeyStep === 'setoff' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    Set-off
                  </button>
                  <button
                    type="button"
                    onClick={() => setJourneyStep('stopovers')}
                    className={`px-3 py-1 rounded-md ${journeyStep === 'stopovers' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    Stop-overs
                  </button>
                  <button
                    type="button"
                    onClick={() => setJourneyStep('destination')}
                    className={`px-3 py-1 rounded-md ${journeyStep === 'destination' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    Destination
                  </button>
                </div>

                <div className="p-3 border border-gray-200 rounded-lg bg-white">
                  {journeyStep === 'setoff' && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Set-off</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Enter start point and time (e.g., Kampala, 08:00)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          value={(bookingData as any).tripSetoff}
                          onFocus={() => { setActiveSearchTarget('setoff'); setSearchQuery((bookingData as any).tripSetoff || '') }}
                          onBlur={() => { setTimeout(() => setActiveSearchTarget(null), 150) }}
                          onChange={(e) => { handleInputChange('tripSetoff', e.target.value); setSearchQuery(e.target.value) }}
                        />
                        <button
                          type="button"
                          onClick={() => openMapFor('setoff')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-white border border-gray-200 rounded-md hover:bg-gray-50"
                        >
                          Map
                        </button>

                        {activeSearchTarget === 'setoff' && searchResults && searchResults.length > 0 && (
                          <ul className="absolute left-0 right-0 mt-12 z-50 bg-white border border-gray-200 rounded shadow max-h-56 overflow-auto text-sm">
                            {searchResults.map(r => (
                              <li key={r.place_id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onMouseDown={() => selectSuggestion('setoff', r)}>
                                {r.display_name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {setoffLocation && <p className="text-xs text-gray-500 mt-2">Picked: {setoffLocation.label}</p>}
                    </div>
                  )}

                  {journeyStep === 'stopovers' && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Stop-overs</label>
                      <div className="space-y-2">
                        {stopovers.length === 0 && <p className="text-xs text-gray-400">No stop-overs added yet.</p>}
                        <div className="mt-2">
                          <label className="sr-only">Add stop-over by typing</label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Type to search stop-over..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              onFocus={() => { setActiveSearchTarget('stopover'); setSearchQuery('') }}
                              onBlur={() => { setTimeout(() => setActiveSearchTarget(null), 150) }}
                              value={activeSearchTarget === 'stopover' ? searchQuery : ''}
                              onChange={(e) => { setSearchQuery(e.target.value) }}
                            />
                            <button
                              type="button"
                              onClick={() => openMapFor('stopover')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-white border border-gray-200 rounded-md hover:bg-gray-50"
                            >
                              Map
                            </button>

                            {activeSearchTarget === 'stopover' && searchResults && searchResults.length > 0 && (
                              <ul className="absolute left-0 right-0 mt-12 z-50 bg-white border border-gray-200 rounded shadow max-h-56 overflow-auto text-sm">
                                {searchResults.map(r => (
                                  <li key={r.place_id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onMouseDown={() => selectSuggestion('stopover', r)}>
                                    {r.display_name}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                        {stopovers.map(s => (
                          <div key={s.id} className="flex items-center gap-2">
                            <div className="flex-1 text-sm">
                              <div className="font-medium">{s.label}</div>
                              <div className="text-xs text-gray-500">{s.lat.toFixed(5)}, {s.lng.toFixed(5)}</div>
                            </div>
                            <div className="w-28">
                              <label className="text-xs text-gray-500">Duration (hrs)</label>
                              <input type="number" min={0} step={0.5} value={s.durationHours} onChange={(e) => updateStopoverDuration(s.id, Number(e.target.value || 0))} className="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
                            </div>
                            <button type="button" onClick={() => removeStopover(s.id)} className="text-red-600 text-sm">Remove</button>
                          </div>
                        ))}

                        
                      </div>
                    </div>
                  )}

                  {journeyStep === 'destination' && !journeySaved && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Destination</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Final drop-off destination"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          value={(bookingData as any).tripDestination}
                          onFocus={() => { setActiveSearchTarget('destination'); setSearchQuery((bookingData as any).tripDestination || '') }}
                          onBlur={() => { setTimeout(() => setActiveSearchTarget(null), 150) }}
                          onChange={(e) => { handleInputChange('tripDestination', e.target.value); setSearchQuery(e.target.value) }}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openMapFor('destination')}
                            className="px-2 py-1 text-xs bg-white border border-gray-200 rounded-md hover:bg-gray-50"
                          >
                            Map
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCityModalOpen(true)}
                            className="px-2 py-1 text-xs bg-white border border-gray-200 rounded-md hover:bg-gray-50"
                          >
                            List
                          </button>
                        </div>

                        {activeSearchTarget === 'destination' && searchResults && searchResults.length > 0 && (
                          <ul className="absolute left-0 right-0 mt-12 z-50 bg-white border border-gray-200 rounded shadow max-h-56 overflow-auto text-sm">
                            {searchResults.map(r => (
                              <li key={r.place_id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onMouseDown={() => selectSuggestion('destination', r)}>
                                {r.display_name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-700 mb-2">Return option</label>
                        <div className="flex gap-3 items-center">
                          <label className="inline-flex items-center text-sm">
                            <input
                              type="radio"
                              name="tripReturnOption"
                              value="return"
                              checked={(bookingData as any).tripReturnOption === 'return'}
                              onChange={() => handleReturnOptionChange('return')}
                              disabled={isCalculatingReturn || !((bookingData as any).tripDestination && (bookingData as any).tripDestination.toString().trim())}
                              className="mr-2"
                            />
                            Return back to set-off point
                          </label>
                          <label className="inline-flex items-center text-sm">
                            <input
                              type="radio"
                              name="tripReturnOption"
                              value="drop"
                              checked={(bookingData as any).tripReturnOption === 'drop'}
                              onChange={() => handleReturnOptionChange('drop')}
                              disabled={isCalculatingReturn || !((bookingData as any).tripDestination && (bookingData as any).tripDestination.toString().trim())}
                              className="mr-2"
                            />
                            Drop and leave
                          </label>

                        {/* Require a destination before allowing return-option selection */}
                        {!(bookingData as any).tripDestination || !(bookingData as any).tripDestination.toString().trim() ? (
                          <p className="text-xs text-gray-500 mt-2">Enter or select a destination first to enable return options.</p>
                        ) : null}
                        </div>

                        {/** Show estimation inputs and results only after user explicitly selects a return option and a destination exists */}
                        {hasDestination ? (
                          (bookingData as any).tripReturnOption ? (
                            isCalculatingReturn ? (
                              <div className="mt-3 flex items-center gap-3 text-sm text-gray-700">
                                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                </svg>
                                <span>Calculating journey estimates…</span>
                              </div>
                            ) : (
                              <>
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Average speed (km/h)</label>
                                    <input
                                      type="number"
                                      min={1}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                      value={(bookingData as any).avgSpeedKmph}
                                      onChange={(e) => handleInputChange('avgSpeedKmph', Number(e.target.value || 0))}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Fuel efficiency (km / L)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      step={0.1}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                      value={(bookingData as any).fuel_km_per_liter ?? (bookingData as any).fuelKmPerL ?? ((bookingData as any).fuelConsumptionPer100Km ? Number((100 / (bookingData as any).fuelConsumptionPer100Km).toFixed(2)) : '')}
                                      onChange={(e) => {
                                        const kmPerL = e.target.value ? Number(e.target.value) : undefined
                                        const per100km = kmPerL ? Number((100 / kmPerL).toFixed(2)) : undefined
                                        handleInputChange('fuel_km_per_liter', kmPerL)
                                        // keep legacy field in sync for any code paths relying on it
                                        handleInputChange('fuelConsumptionPer100Km', per100km ?? 0)
                                      }}
                                    />
                                  </div>
                                </div>

                                <div className="mt-3 text-sm text-gray-700">
                                  {(() => {
                                    // Prefer coordinate-based estimates when coordinates are available
                                    const coordDistance = computeTotalDistanceKm()
                                    if (coordDistance > 0) {
                                      const { hours, liters } = computeEstimatesFromDistance(
                                        coordDistance,
                                        Number((bookingData as any).avgSpeedKmph || 60),
                                        Number((bookingData as any).fuelConsumptionPer100Km || 10),
                                        Number((bookingData as any).fuel_km_per_liter || (bookingData as any).fuelKmPerL || 0)
                                      )
                                      return (
                                          <div className="space-y-1">
                                            <div>Estimated hours: <span className="font-medium">{hours > 0 ? `${hours.toFixed(1)} hrs` : '—'}</span></div>
                                            <div>Estimated distance: <span className="font-medium">{coordDistance > 0 ? `${coordDistance.toFixed(1)} km` : '—'}</span></div>
                                            <div>Estimated fuel: <span className="font-medium">{liters > 0 ? `${liters.toFixed(1)} L` : '—'}</span></div>
                                            {(() => {
                                              const rc = detectAbnormalRoute()
                                              if (rc.abnormal) return (<div className="mt-2 text-xs text-red-700">Route warning: {rc.reasons.join(' ; ')}</div>)
                                              return null
                                            })()}
                                          </div>
                                        )
                                    }
                                    const estHours = calculateHours(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)
                                    const { distanceKm, liters } = estimateFuel(
                                      estHours,
                                      Number((bookingData as any).avgSpeedKmph || 60),
                                      Number((bookingData as any).fuelConsumptionPer100Km || 10),
                                      Number((bookingData as any).fuel_km_per_liter || (bookingData as any).fuelKmPerL || 0)
                                    )
                                    return (
                                      <div className="space-y-1">
                                        <div>Estimated hours: <span className="font-medium">{estHours > 0 ? `${estHours.toFixed(1)} hrs` : '—'}</span></div>
                                        <div>Estimated distance: <span className="font-medium">{distanceKm > 0 ? `${distanceKm.toFixed(1)} km` : '—'}</span></div>
                                        <div>Estimated fuel: <span className="font-medium">{liters > 0 ? `${liters.toFixed(1)} L` : '—'}</span></div>
                                      </div>
                                    )
                                  })()}
                                </div>
                              </>
                            )
                          ) : (
                            <div className="mt-3 text-sm text-gray-500">Select a return option to run journey estimates.</div>
                          )
                        ) : null}
                      </div>
                    </div>
                  )}

                  

                  {journeySaved ? (
                    <div className="mt-4 p-4 border rounded-md bg-gray-50">
                      <div className="text-sm whitespace-pre-line text-gray-800">{(bookingData as any).journeySummary || buildJourneySummary()}</div>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => { setJourneySaved(false); setJourneyStep('destination') }}
                          className="px-3 py-2 bg-yellow-500 text-white rounded-md"
                        >
                          Edit trip
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between mt-3">
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            if (journeyStep === 'setoff') setJourneyStep('setoff')
                            else if (journeyStep === 'stopovers') setJourneyStep('setoff')
                            else setJourneyStep('stopovers')
                          }}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md mr-2"
                        >
                          Back
                        </button>
                      </div>
                      <div>
                        {/** Disable Next on Destination until a return option is selected */}
                        <button
                          type="button"
                          onClick={() => {
                            if (journeyStep === 'setoff') setJourneyStep('stopovers')
                            else if (journeyStep === 'stopovers') setJourneyStep('destination')
                            else saveJourney()
                          }}
                          disabled={journeyStep === 'destination' && ((!(bookingData as any).tripReturnOption) || !hasDestination)}
                          className={`px-3 py-2 rounded-md ${(journeyStep === 'destination' && ((!(bookingData as any).tripReturnOption) || !hasDestination)) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white'}`}
                        >
                          {journeyStep === 'destination' ? 'Save my trip' : 'Next'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Special Requests</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Any special requirements..."
                  value={bookingData.specialRequests}
                  onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                />
              </div>
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

              {/* Mobile Money Phone + Provider */}
              {bookingData.paymentMethod === 'mobile' && (
                <div className="space-y-3 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Money Number *</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="0712345678 or +256712345678"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Provider *</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleInputChange('mobileProvider', 'MTN')}
                        className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 ${bookingData.mobileProvider === 'MTN' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                      >
                        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><rect width="18" height="14" rx="2" fill="#FFD200"/><text x="9" y="10" fill="#000" fontSize="7" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">MTN</text></svg>
                        <span className="text-sm font-medium">MTN</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInputChange('mobileProvider', 'Airtel')}
                        className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 ${bookingData.mobileProvider === 'Airtel' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                      >
                        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><rect width="18" height="14" rx="2" fill="#E60000"/><text x="9" y="10" fill="#fff" fontSize="6" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">A</text></svg>
                        <span className="text-sm font-medium">Airtel</span>
                      </button>
                    </div>
                  </div>
                  {pollingMessage && (
                    <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">{pollingMessage}</p>
                  )}
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

              {/* Booking reference & quick actions */}
              {bookingResult?.id && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <div className="bg-gray-100 px-3 py-2 rounded-lg text-sm flex items-center gap-3">
                    <span className="font-semibold">Reference:</span>
                    <span className="break-all">{bookingResult.id}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => { try { await navigator.clipboard.writeText(bookingResult.id); alert('Booking reference copied'); } catch { /* ignore */ } }}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm"
                    >
                      Copy reference
                    </button>
                    <button
                      onClick={() => downloadReceiptPDF(bookingResult || {})}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm"
                    >
                      Download receipt (PDF)
                    </button>
                    <button
                      onClick={() => navigate(`/service/${service.slug || service.id}/inquiry`)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm"
                    >
                      Message provider
                    </button>
                  </div>
                </div>
              )}
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
              <div className="pt-6">
                <h3 className="text-sm font-semibold mb-3">Other services you may like</h3>
                <SimilarServicesCarousel
                  categoryId={service.category_id}
                  excludeServiceId={service.id}
                  limit={8}
                />
              </div>
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
      <>
      <div className="max-w-md mx-auto px-2 sm:px-4 pt-8 sm:pt-12 pb-0 min-h-[60vh] bg-white rounded-none shadow-md border border-gray-200 text-sm leading-relaxed">
        <div className="space-y-3 sm:space-y-4">
          {/* Vendor-style compact receipt header with responsive image */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="w-full sm:w-40 flex-shrink-0">
              <img
                src={selectedImage || service.images?.[0] || 'https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg'}
                alt={service.title}
                className="w-full h-28 sm:h-24 object-cover rounded-lg"
              />
              {service.images && service.images.length > 0 && (
                <div className="mt-1 text-xs text-gray-500 text-center sm:text-left">{currentImageIndex + 1} / {service.images.length}</div>
              )}
            </div>

            <div className="flex-1">
              <div className="text-xl font-bold">{service.vendors?.business_name || 'DIRT TRAILS'}</div>
              <div className="text-xs text-gray-500">Adventure Booking Receipt</div>
              <div className="mt-3 flex flex-col sm:flex-row items-center sm:items-start sm:justify-start gap-4">
                <div className="text-center sm:text-left">
                  <div className="text-xs text-gray-400">Receipt #</div>
                  <div className="font-mono font-semibold text-sm">{(bookingResult?.id || '').toString().replace(/-/g, '').slice(0,8).toUpperCase()}</div>
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-xs text-gray-400">Date</div>
                  <div className="text-sm">
                    {new Date().toLocaleDateString('en-GB')}
                    <span className="mx-2 text-gray-400">·</span>
                    <span className="text-sm text-gray-700">{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">BOOKING CONFIRMED</div>
            </div>
          </div>

          {/* Two-column compact sections */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-500 font-semibold">Customer</div>
                <div className="text-sm font-medium">{bookingData.contactName || 'N/A'}</div>
                <div className="text-sm break-all">{bookingData.contactEmail || 'N/A'}</div>
                <div className="text-sm">{(bookingData.countryCode || '') + (bookingData.contactPhone || '')}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 font-semibold">Service</div>
                <div className="text-sm font-medium">{service.title}</div>
                <div className="text-sm">{service.location || 'N/A'}</div>
                <div className="text-sm">{service.service_categories?.name || 'N/A'}</div>
                <div className="text-sm mt-1">Date: {bookingData.startDate || 'N/A'}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-500 font-semibold">Provider</div>
                <div className="text-sm font-medium">{service.vendors?.business_name || 'N/A'}</div>
                <div className="text-sm">{service.vendors?.business_email || 'N/A'}</div>
                <div className="text-sm">{service.vendors?.business_phone || 'N/A'}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 font-semibold">Payment</div>
                <div className="text-sm">Unit Price: {basePrice ? formatCurrencyWithConversion(basePrice, service.currency) : 'UGXNaN'}</div>
                <div className="text-sm">Quantity: {bookingData.passengers || 1}</div>
                <div className="text-sm font-bold">TOTAL: {formatCurrencyWithConversion(totalPrice, service.currency)}</div>
              </div>
            </div>
          </div>

          

          {/* Trip Details - clean two-column layout */}
          <div className="pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500 font-semibold mb-3">TRIP DETAILS</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div>
                  <div className="text-gray-500 uppercase text-xs font-medium">Pick-up</div>
                  <div className="font-medium">{bookingData.startDate || 'N/A'}{bookingData.startTime ? ` at ${bookingData.startTime}` : ''}</div>
                </div>

                <div>
                  <div className="text-gray-500 uppercase text-xs font-medium">Duration</div>
                  <div className="font-medium">{bookingData.startDate && bookingData.endDate ? `${calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)} days (${Math.max(0, Math.floor(calculateHours(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)))} hrs)` : 'N/A'}</div>
                </div>

                <div>
                  <div className="text-gray-500 uppercase text-xs font-medium">Pick-up Location</div>
                  <div className="font-medium">{bookingData.pickupLocation || 'N/A'}</div>
                </div>

                <div>
                  <div className="text-gray-500 uppercase text-xs font-medium">Driver Option</div>
                  <div className="font-medium">{bookingData.driverOption === 'with-driver' ? 'With Driver' : 'Without Driver'}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="text-gray-500 uppercase text-xs font-medium">Drop-off</div>
                  <div className="font-medium">{bookingData.endDate || 'N/A'}{bookingData.endTime ? ` at ${bookingData.endTime}` : ''}</div>
                </div>

                <div>
                  <div className="text-gray-500 uppercase text-xs font-medium">Special Requests</div>
                  <div className="font-medium">{bookingData.specialRequests || 'None'}</div>
                </div>

                <div>
                  <div className="text-gray-500 uppercase text-xs font-medium">Drop-off Location</div>
                  <div className="font-medium">{bookingData.dropoffLocation || 'N/A'}</div>
                </div>

                {bookingData.paymentMethod === 'mobile' && (
                  <div>
                    <div className="text-gray-500 uppercase text-xs font-medium">Payment Provider</div>
                    <div className="font-medium">{bookingData.mobileProvider || 'N/A'}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Booking ref and actions (compact) */}
          <div className="pt-2 border-t border-gray-100 text-center">
            <div className="text-xs text-gray-500">Booking Reference</div>
            <div className="mt-1 flex items-center justify-center gap-2">
              <div className="font-mono break-all text-sm">{(bookingResult?.id || '')}</div>
              <button
                onClick={async () => { try { await navigator.clipboard.writeText(bookingResult?.id || ''); alert('Booking reference copied') } catch {} }}
                title="Copy reference"
                className="p-1 bg-gray-100 rounded"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-1 text-center">
              <div className="font-medium">Thank you for choosing Dirt Trails!</div>
              <div className="text-gray-500">Keep this receipt for your records</div>
            </div>

            {/* download moved to actions below */}

            {/* Support strip (inside receipt) */}
            <div className="mt-4 -mx-2 sm:-mx-4">
              <div className="bg-gray-900 text-white rounded-none px-4 py-2 border-t border-gray-800">
                <div className="text-sm font-semibold text-center sm:text-left">Should you need support</div>

                <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 w-24">Email</span>
                    <a href="mailto:safaris.dirtrails@gmail.com" className="text-emerald-300 underline">safaris.dirtrails@gmail.com</a>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 w-24">Phone</span>
                    <a href="tel:+256759918649" className="text-emerald-300 underline">+256 759 918649</a>
                  </div>
                </div>

                <div className="mt-1 text-xs text-gray-300 text-center sm:text-left">Or visit our <a href="/contact" className="text-emerald-300 underline">Contact Us</a> page</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Detached actions and related services (outside receipt) */}
      <div className="max-w-4xl mx-auto mt-4 px-4">
        <div className="flex gap-2 sm:gap-3 justify-center">
          <button
            onClick={() => navigate(`/service/${service.slug || service.id}/inquiry`)}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors text-sm"
          >
            Message Provider
          </button>
          <button
            onClick={() => downloadReceiptPDF(bookingResult || {})}
            className="flex-1 sm:flex-none bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-medium py-2 px-6 rounded-lg transition-colors text-sm"
          >
            Download (PDF)
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 sm:flex-none bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg transition-colors text-sm"
          >
            Home
          </button>
        </div>

        {service.category_id && (
          <div className="pt-6">
            <h3 className="text-sm font-semibold mb-3">Other services you may like</h3>
            <SimilarServicesCarousel
              categoryId={service.category_id}
              excludeServiceId={service.id}
              limit={8}
            />
          </div>
        )}
      </div>

      
      </>
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
      {/* City Picker Modal */}
      <CityPickerModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        onSelect={handleCitySelect}
        selectedCity={(bookingData as any).tripDestination || ''}
      />

      {/* Map Modal (used for set-off / stopovers / destination) */}
      <MapModal
        isOpen={isMapModalOpen}
        onClose={() => { setIsMapModalOpen(false); setMapModalMode(null) }}
        onSelect={handleMapSelect}
        initialMarker={mapInitialMarker}
      />

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
                    {service.service_categories?.name?.toLowerCase() === 'transport'
                      ? formatCurrencyWithConversion(unitPrice || service.price, service.currency)
                      : formatCurrencyWithConversion(totalPrice, service.currency)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {service.service_categories?.name?.toLowerCase() === 'transport'
                      ? `per day ${bookingData.startDate && bookingData.endDate ? `• ${calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)} days` : ''}`
                      : `One way ${bookingData.startDate && bookingData.endDate ? `• ${calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)} days` : ''}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Transport zone selector (move above Trip Dates & Times) */}
            {service.service_categories?.name?.toLowerCase() === 'transport' && ((service as any).price_within_town || (service as any).price_upcountry) && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Area *</label>
                <div className="flex items-center gap-4 text-sm mb-2">
                  {(service as any).price_within_town !== undefined && (
                    <label className="inline-flex items-center">
                      <input type="radio" name="transportZoneTop" value="within" checked={transportZone === 'within'} onChange={() => setTransportZone('within')} className="mr-2" />
                      <span>Within Town {typeof (service as any).price_within_town === 'number' ? `· ${formatCurrencyWithConversion((service as any).price_within_town, service.currency)}` : ''}</span>
                    </label>
                  )}
                  {(service as any).price_upcountry !== undefined && (
                    <label className="inline-flex items-center">
                      <input type="radio" name="transportZoneTop" value="upcountry" checked={transportZone === 'upcountry'} onChange={() => setTransportZone('upcountry')} className="mr-2" />
                      <span>Upcountry {typeof (service as any).price_upcountry === 'number' ? `· ${formatCurrencyWithConversion((service as any).price_upcountry, service.currency)}` : ''}</span>
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-500">Select whether this trip is within town or upcountry to see the correct price.</p>
              </div>
            )}

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
                  isPaymentProcessing ||
                  !bookingData.startDate ||
                  !bookingData.endDate ||
                  (service.service_categories?.name?.toLowerCase() === 'transport' && ((service as any).price_within_town || (service as any).price_upcountry) && !transportZone) ||
                  (bookingData.driverOption === 'with-driver' && (!bookingData.pickupLocation || !bookingData.dropoffLocation)) ||
                  !bookingData.contactName ||
                  !bookingData.contactEmail ||
                  bookingData.paymentMethod === 'card' ||
                  (bookingData.paymentMethod === 'mobile' && (!phoneNumber.trim() || !bookingData.mobileProvider))
                }
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-xs sm:text-sm font-medium"
              >
                {isPaymentProcessing ? (pollingMessage ? 'Waiting for payment…' : 'Processing...') : 'Pay with Mobile Money'}
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
                  isPaymentProcessing ||
                  !bookingData.startDate ||
                  !bookingData.endDate ||
                  (service.service_categories?.name?.toLowerCase() === 'transport' && ((service as any).price_within_town || (service as any).price_upcountry) && !transportZone) ||
                  (bookingData.driverOption === 'with-driver' && (!bookingData.pickupLocation || !bookingData.dropoffLocation)) ||
                  !bookingData.contactName ||
                  !bookingData.contactEmail ||
                  bookingData.paymentMethod === 'card' ||
                  (bookingData.paymentMethod === 'mobile' && (!phoneNumber.trim() || !bookingData.mobileProvider))
                }
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isPaymentProcessing ? (pollingMessage ? 'Waiting for payment…' : 'Processing...') : 'Pay with Mobile Money'}
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