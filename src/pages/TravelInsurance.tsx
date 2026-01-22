import { Link } from 'react-router-dom'
import { Shield, CheckCircle, AlertTriangle, Phone, Mail, FileText, MessageCircle, Clock } from 'lucide-react'

export default function TravelInsurance() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <Shield className="h-16 w-16 text-white mx-auto mb-4" />
            <h1 className="text-4xl font-black text-white mb-4 tracking-tight antialiased">Travel Insurance</h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-snug antialiased">
              Protect your journey with comprehensive travel insurance coverage for Uganda and beyond.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Coverage Options */}
        <div className="bg-white shadow-sm border border-gray-200 p-8 mb-16">
          <h2 className="text-3xl font-black text-black mb-8 tracking-tight antialiased">Insurance Coverage Options</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="border border-gray-200 bg-white p-8 hover:bg-gray-50 transition-all duration-200">
              <div className="flex items-center mb-6">
                <CheckCircle className="h-8 w-8 text-black mr-4" />
                <h3 className="text-xl font-bold text-black tracking-tight antialiased">Basic Coverage</h3>
              </div>
              <ul className="space-y-3 text-gray-700 mb-6 leading-snug antialiased">
                <li>• Medical emergencies up to $50,000</li>
                <li>• Trip cancellation/interruption</li>
                <li>• Lost luggage coverage</li>
                <li>• 24/7 emergency assistance</li>
              </ul>
              <p className="text-3xl font-black text-black">$29<span className="text-lg font-normal text-gray-600">/person</span></p>
            </div>

            <div className="border-2 border-black bg-gray-50 p-8 hover:bg-gray-100 transition-all duration-200">
              <div className="flex items-center mb-6">
                <CheckCircle className="h-8 w-8 text-black mr-4" />
                <h3 className="text-xl font-bold text-black tracking-tight antialiased">Premium Coverage</h3>
              </div>
              <ul className="space-y-3 text-gray-700 mb-6 leading-snug antialiased">
                <li>• Medical emergencies up to $100,000</li>
                <li>• Trip cancellation/interruption</li>
                <li>• Lost luggage coverage</li>
                <li>• Adventure sports coverage</li>
                <li>• 24/7 emergency assistance</li>
                <li>• Legal assistance</li>
              </ul>
              <p className="text-3xl font-black text-black">$59<span className="text-lg font-normal text-gray-600">/person</span></p>
            </div>
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="bg-white shadow-sm border border-gray-200 p-8 mb-16">
          <h2 className="text-3xl font-black text-black mb-8 tracking-tight antialiased">Why Choose DirtTrails Travel Insurance?</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-black mb-4 tracking-tight antialiased">Local Expertise</h3>
              <p className="text-gray-700 leading-snug antialiased">Specialized coverage for Uganda and East African travel with local emergency contacts.</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-black mb-4 tracking-tight antialiased">Quick Claims</h3>
              <p className="text-gray-700 leading-snug antialiased">Fast claim processing with dedicated support for international travelers.</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
                <Phone className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-black mb-4 tracking-tight antialiased">24/7 Support</h3>
              <p className="text-gray-700 leading-snug antialiased">Round-the-clock emergency assistance in multiple languages.</p>
            </div>
          </div>
        </div>

        {/* Important Information */}
        <div className="bg-white shadow-sm border border-gray-200 p-8 mb-16">
          <h2 className="text-3xl font-black text-black mb-8 tracking-tight antialiased">Important Information</h2>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <AlertTriangle className="h-6 w-6 text-black mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-black mb-2 tracking-tight antialiased">Coverage Start</h3>
                <p className="text-gray-700 leading-snug antialiased">Coverage begins from your departure date and ends upon return.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <Clock className="h-6 w-6 text-black mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-black mb-2 tracking-tight antialiased">Pre-Existing Conditions</h3>
                <p className="text-gray-700 leading-snug antialiased">Pre-existing conditions may require additional coverage purchased within 30 days of booking.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <FileText className="h-6 w-6 text-black mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-black mb-2 tracking-tight antialiased">Documentation</h3>
                <p className="text-gray-700 leading-snug antialiased">Keep all receipts and documentation for claims. Contact emergency services immediately in case of accidents.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white shadow-sm border border-gray-200 p-8">
          <h2 className="text-3xl font-black text-black mb-8 tracking-tight antialiased">Need Help with Insurance?</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold text-black mb-6 tracking-tight antialiased">Emergency Contact</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Phone className="h-6 w-6 text-black mr-4" />
                  <span className="text-gray-700 font-medium">+256 414 320 000 (24/7)</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-6 w-6 text-black mr-4" />
                  <span className="text-gray-700 font-medium">insurance@dirtrails.com</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-black mb-6 tracking-tight antialiased">Claims & Support</h3>
              <div className="space-y-4">
                <Link to="/contact" className="flex items-center text-black hover:text-gray-700 transition-colors">
                  <FileText className="h-6 w-6 mr-4" />
                  <span className="font-medium">File a Claim</span>
                </Link>
                <Link to="/help" className="flex items-center text-black hover:text-gray-700 transition-colors">
                  <MessageCircle className="h-6 w-6 mr-4" />
                  <span className="font-medium">Get Support</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}