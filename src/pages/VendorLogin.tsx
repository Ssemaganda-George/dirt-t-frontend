import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { getServiceClient } from '../lib/serviceClient'
import { Eye, EyeOff, Store, User, Shield } from 'lucide-react'

export default function VendorLogin() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessPhoneCountryCode, setBusinessPhoneCountryCode] = useState('+256')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  // Countries array for phone codes
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signIn(email, password)
      navigate('/vendor', { replace: true })
    } catch (error: any) {
      setError(error.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      // Split full name into first and last name
      const nameParts = fullName.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      // First create the user account (this also creates profile and basic vendor record)
      await signUp(email, password, firstName, lastName, 'vendor')

      // Get the current user
      const { data: user } = await supabase.auth.getUser()
      if (user.user) {
        // Ensure profile exists
        const { error: profileCheckError } = await supabase.from('profiles').upsert({
          id: user.user.id,
          email: email,
          full_name: fullName,
          role: 'vendor',
        }, { onConflict: 'id' })

        if (profileCheckError) {
          console.error('Profile creation error:', profileCheckError)
        }

        // Get the Bronze tier ID (default tier for new vendors)
        const { data: bronzeTier, error: tierError } = await supabase
          .from('vendor_tiers')
          .select('id, commission_type, commission_value, commission_rate')
          .eq('name', 'Bronze')
          .eq('is_active', true)
          .single();

        if (tierError) {
          console.error('Error fetching Bronze tier:', tierError);
          setError('Account created but tier assignment failed. Please contact support.');
          return;
        }

        // Update or create the vendor record with business details and default Bronze tier
        const serviceClient = getServiceClient()
        const { error: vendorError } = await serviceClient
          .from('vendors')
          .upsert({
            user_id: user.user.id,
            business_name: businessName,
            business_email: email,
            business_phone: `${businessPhoneCountryCode}${businessPhone}`,
            status: 'pending',
            current_tier_id: bronzeTier.id,
            current_commission_rate:
              bronzeTier.commission_type === 'flat'
                ? 0
                : Number(bronzeTier.commission_rate ?? 0)
          }, { onConflict: 'user_id' })

        if (vendorError) {
          console.error('Error updating business profile:', vendorError)
          setError('Account created but business profile setup failed. Please contact support.')
          return
        }
      }

      navigate('/', { replace: true })
    } catch (error: any) {
      setError(error.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="text-center">
            <Store className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-white mx-auto mb-2 sm:mb-3 lg:mb-4" />
            <h1 className="text-xl sm:text-2xl font-black text-white mb-1 sm:mb-2 tracking-tight antialiased">Business Portal</h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed antialiased">
              Join our network of trusted service providers. Manage your listings, bookings, and grow your business with DirtTrails.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Authentication Section - Moved to Top */}
        <div className="bg-white shadow-sm border border-gray-200 p-8 mb-16">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-black mb-4 tracking-tight antialiased">
                {isSignUp ? 'Create Business Account' : 'Business Sign In'}
              </h2>
              <p className="text-gray-700 leading-snug antialiased">
                {isSignUp ? 'Join our network of trusted service providers' : 'Access your business dashboard and manage your business'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
                {error}
              </div>
            )}

            {!isSignUp ? (
              // Sign In Form
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors pr-12"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white py-3 px-6 rounded-lg font-bold text-lg hover:bg-gray-800 active:bg-gray-900 focus:bg-gray-800 hover:scale-105 active:scale-95 focus:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 shadow-md hover:shadow-lg active:shadow-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  {loading ? 'Signing in...' : 'Sign In to Business Portal'}
                </button>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true)
                    }}
                    className="bg-blue-600 text-white py-2 px-4 rounded-lg font-medium text-base hover:bg-blue-700 active:bg-blue-800 focus:bg-blue-700 hover:scale-105 active:scale-95 focus:scale-105 transition-all duration-200 shadow-md hover:shadow-lg active:shadow-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Don't have an account? Create one
                  </button>
                </div>
              </form>
            ) : (
              // Sign Up Form - Simplified Single Step Process
              <form onSubmit={handleSignUpSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                    {error}
                  </div>
                )}

                {/* Personal Information */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Full Name *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                      placeholder="Your full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Email *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                      placeholder="your@email.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Business Name *</label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                      placeholder="Your business name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Business Phone *</label>
                    <div className="flex">
                      <select
                        value={businessPhoneCountryCode}
                        onChange={(e) => setBusinessPhoneCountryCode(e.target.value)}
                        className="border border-gray-300 p-4 rounded-l-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors w-32"
                      >
                        {countries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.flag} {country.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        value={businessPhone}
                        onChange={(e) => setBusinessPhone(e.target.value)}
                        className="flex-1 border border-l-0 border-gray-300 p-4 rounded-r-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                        placeholder="700 000 000"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors pr-12"
                        placeholder="Create a password (min 6 characters)"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Confirm Password *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors pr-12"
                        placeholder="Confirm your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-bold text-lg hover:bg-green-700 active:bg-green-800 focus:bg-green-700 hover:scale-105 active:scale-95 focus:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 shadow-md hover:shadow-lg active:shadow-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {loading ? 'Creating account...' : 'Create Business Account'}
                </button>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false)
                    }}
                    className="bg-blue-600 text-white py-2 px-4 rounded-lg font-medium text-base hover:bg-blue-700 active:bg-blue-800 focus:bg-blue-700 hover:scale-105 active:scale-95 focus:scale-105 transition-all duration-200 shadow-md hover:shadow-lg active:shadow-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Benefits Section - Moved Below Auth */}
        <div className="bg-white shadow-sm border border-gray-200 p-8">
          <h2 className="text-3xl font-black text-black mb-8 tracking-tight antialiased text-center">Why Join Our Business Network?</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
                <User className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-black mb-4 tracking-tight antialiased">Easy Management</h3>
              <p className="text-gray-700 leading-snug antialiased">Simple tools to manage your listings, bookings, and customer communications all in one place.</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
                <Store className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-black mb-4 tracking-tight antialiased">Grow Your Business</h3>
              <p className="text-gray-700 leading-snug antialiased">Access thousands of travelers seeking authentic Ugandan experiences and local services.</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-black mb-4 tracking-tight antialiased">Secure & Reliable</h3>
              <p className="text-gray-700 leading-snug antialiased">Secure payment processing, verified customer reviews, and dedicated support for businesses.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
