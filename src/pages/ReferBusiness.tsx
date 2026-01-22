import { Link } from 'react-router-dom'
import { Users, DollarSign, TrendingUp, CheckCircle, AlertTriangle, Phone, Mail, Share } from 'lucide-react'

export default function ReferBusiness() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <Share className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Refer a Business</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Earn commissions by referring quality businesses to join the DirtTrails platform. Help grow our community while earning rewards.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Commission Structure */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Commission Structure</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Referral Fee</h3>
              <p className="text-gray-600 mb-4">One-time payment when business signs up</p>
              <p className="text-3xl font-bold text-blue-600">$50</p>
              <p className="text-sm text-gray-500">per successful referral</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Revenue Share</h3>
              <p className="text-gray-600 mb-4">Ongoing commission on bookings</p>
              <p className="text-3xl font-bold text-green-600">5%</p>
              <p className="text-sm text-gray-500">of booking value</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Performance Bonus</h3>
              <p className="text-gray-600 mb-4">Additional rewards for top referrers</p>
              <p className="text-3xl font-bold text-purple-600">$100</p>
              <p className="text-sm text-gray-500">monthly bonus</p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How the Referral Program Works</h2>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold text-lg">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Find Business</h3>
              <p className="text-gray-600">Identify quality businesses in tourism, hospitality, or related services.</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold text-lg">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Submit Referral</h3>
              <p className="text-gray-600">Use our referral form to submit business details and contact information.</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold text-lg">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">We Qualify</h3>
              <p className="text-gray-600">Our team reviews and contacts the business for partnership discussions.</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold text-lg">4</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Earn Rewards</h3>
              <p className="text-gray-600">Receive commissions when the business joins and starts generating bookings.</p>
            </div>
          </div>
        </div>

        {/* Business Types */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Types of Businesses We Seek</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Hospitality & Accommodation</h3>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Hotels and resorts</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Lodges and camps</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Guest houses</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Vacation rentals</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Food & Dining</h3>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Restaurants and cafes</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Food tours and experiences</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Local cuisine specialists</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Catering services</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transportation</h3>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Car rental companies</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Taxi and transfer services</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Tour operators</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Airport shuttles</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Events & Experiences</h3>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Safari operators</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Adventure events</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Cultural experiences</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-gray-600">Guided tours</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Referral Program Terms</h3>
              <ul className="text-yellow-700 space-y-1">
                <li>• Referral fees are paid only after successful business onboarding</li>
                <li>• Revenue share commissions are paid monthly for active businesses</li>
                <li>• Businesses must meet our quality and service standards</li>
                <li>• Program terms may change with advance notice to participants</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Ready to Start Referring?</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Get Started</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-500 mr-3" />
                  <span className="text-gray-600">+256 414 320 000</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-500 mr-3" />
                  <span className="text-gray-600">referrals@dirtrails.com</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link to="/contact" className="flex items-center text-blue-600 hover:text-blue-800">
                  <Share className="h-5 w-5 mr-3" />
                  Submit Referral
                </Link>
                <Link to="/help" className="flex items-center text-blue-600 hover:text-blue-800">
                  <Users className="h-5 w-5 mr-3" />
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}