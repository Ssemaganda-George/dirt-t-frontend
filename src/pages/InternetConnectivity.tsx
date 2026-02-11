import { Link } from 'react-router-dom'
import { Wifi, Smartphone, Globe, CheckCircle, AlertTriangle, Phone, Mail, MapPin } from 'lucide-react'

export default function InternetConnectivity() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <Wifi className="h-20 w-20 text-white mx-auto mb-6" />
            <h1 className="text-4xl font-black text-white mb-4 tracking-tight antialiased">Internet & Connectivity</h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed antialiased">
              Stay connected during your Uganda adventure with reliable internet solutions and connectivity services.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Connectivity Options */}
        <div className="bg-white shadow-sm border border-gray-200 p-8 mb-16">
          <h2 className="text-3xl font-black text-black mb-8 tracking-tight antialiased">Connectivity Solutions</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="border border-gray-200 p-8">
              <div className="flex items-center mb-6">
                <Smartphone className="h-8 w-8 text-black mr-4" />
                <h3 className="text-xl font-bold text-black tracking-tight antialiased">Mobile Data SIM</h3>
              </div>
              <ul className="space-y-3 text-gray-700 mb-6 leading-snug antialiased">
                <li>• 4G LTE connectivity</li>
                <li>• 5GB, 10GB, or 20GB data packages</li>
                <li>• Valid for 7-30 days</li>
                <li>• MTN/Airtel network options</li>
              </ul>
              <p className="text-3xl font-black text-black">From $15<span className="text-lg font-normal text-gray-600">/SIM</span></p>
            </div>

            <div className="border border-gray-200 p-8">
              <div className="flex items-center mb-6">
                <Wifi className="h-8 w-8 text-black mr-4" />
                <h3 className="text-xl font-bold text-black tracking-tight antialiased">WiFi Hotspot Rental</h3>
              </div>
              <ul className="space-y-3 text-gray-700 mb-6 leading-snug antialiased">
                <li>• Portable 4G WiFi device</li>
                <li>• Unlimited data packages</li>
                <li>• Connect up to 10 devices</li>
                <li>• Airport pickup/delivery</li>
              </ul>
              <p className="text-3xl font-black text-black">$25<span className="text-lg font-normal text-gray-600">/day</span></p>
            </div>

            <div className="border border-gray-200 p-8">
              <div className="flex items-center mb-6">
                <Globe className="h-4 w-4 md:h-5 md:w-5 text-black mr-4" />
                <h3 className="text-xl font-bold text-black tracking-tight antialiased">eSIM Service</h3>
              </div>
              <ul className="space-y-3 text-gray-700 mb-6 leading-snug antialiased">
                <li>• Digital SIM card</li>
                <li>• Instant activation</li>
                <li>• No physical SIM needed</li>
                <li>• Compatible with modern phones</li>
              </ul>
              <p className="text-3xl font-black text-black">$12<span className="text-lg font-normal text-gray-600">/SIM</span></p>
            </div>

            <div className="border border-gray-200 p-8">
              <div className="flex items-center mb-6">
                <MapPin className="h-8 w-8 text-black mr-4" />
                <h3 className="text-xl font-bold text-black tracking-tight antialiased">WiFi Access Points</h3>
              </div>
              <ul className="space-y-3 text-gray-700 mb-6 leading-snug antialiased">
                <li>• Hotel/restaurant WiFi access</li>
                <li>• Public hotspot locations</li>
                <li>• Password assistance</li>
                <li>• Troubleshooting support</li>
              </ul>
              <p className="text-3xl font-black text-black">$5<span className="text-lg font-normal text-gray-600">/day</span></p>
            </div>
          </div>
        </div>

        {/* Coverage Map */}
        <div className="bg-white shadow-sm border border-gray-200 p-8 mb-16">
          <h2 className="text-3xl font-black text-black mb-8 tracking-tight antialiased">Network Coverage in Uganda</h2>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-bold text-black mb-6 tracking-tight antialiased">Major Cities</h3>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-black mr-4" />
                  <span className="text-gray-700 leading-snug antialiased">Kampala - Excellent 4G coverage</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-black mr-4" />
                  <span className="text-gray-700 leading-snug antialiased">Entebbe - Airport and city coverage</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-black mr-4" />
                  <span className="text-gray-700 leading-snug antialiased">Jinja - Good coverage along Nile</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-black mr-4" />
                  <span className="text-gray-700 leading-snug antialiased">Mbarara - Regional coverage</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold text-black mb-6 tracking-tight antialiased">Tourist Destinations</h3>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-black mr-4" />
                  <span className="text-gray-700 leading-snug antialiased">Queen Elizabeth National Park</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-black mr-4" />
                  <span className="text-gray-700 leading-snug antialiased">Bwindi Impenetrable Forest</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-black mr-4" />
                  <span className="text-gray-700 leading-snug antialiased">Murchison Falls</span>
                </li>
                <li className="flex items-center">
                  <AlertTriangle className="h-6 w-6 text-black mr-4" />
                  <span className="text-gray-700 leading-snug antialiased">Remote areas - Limited coverage</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tips & Best Practices */}
        <div className="bg-white shadow-sm border border-gray-200 p-8 mb-16">
          <h2 className="text-3xl font-black text-black mb-8 tracking-tight antialiased">Connectivity Tips for Travelers</h2>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-bold text-black mb-6 tracking-tight antialiased">Before You Travel</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-black mr-4 mt-1 flex-shrink-0" />
                  <span className="text-gray-700 leading-snug antialiased">Check your phone's compatibility with Ugandan networks</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-black mr-4 mt-1 flex-shrink-0" />
                  <span className="text-gray-700 leading-snug antialiased">Unlock your phone for international SIM cards</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-black mr-4 mt-1 flex-shrink-0" />
                  <span className="text-gray-700 leading-snug antialiased">Download offline maps and translation apps</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-black mr-4 mt-1 flex-shrink-0" />
                  <span className="text-gray-700 leading-snug antialiased">Inform your home network about international travel</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold text-black mb-6 tracking-tight antialiased">While in Uganda</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-black mr-4 mt-1 flex-shrink-0" />
                  <span className="text-gray-700 leading-snug antialiased">Use hotel WiFi for large downloads</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-black mr-4 mt-1 flex-shrink-0" />
                  <span className="text-gray-700 leading-snug antialiased">Monitor data usage to avoid extra charges</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-black mr-4 mt-1 flex-shrink-0" />
                  <span className="text-gray-700 leading-snug antialiased">Keep important numbers saved locally</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-black mr-4 mt-1 flex-shrink-0" />
                  <span className="text-gray-700 leading-snug antialiased">Have backup communication methods</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Important Information */}
        <div className="bg-white shadow-sm border border-gray-200 p-8 mb-16">
          <h2 className="text-3xl font-black text-black mb-8 tracking-tight antialiased">Connectivity Considerations</h2>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <AlertTriangle className="h-6 w-6 text-black mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-black mb-2 tracking-tight antialiased">Network Coverage</h3>
                <p className="text-gray-700 leading-snug antialiased">Network coverage can vary in remote areas and during safaris. Plan accordingly for offline access.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <AlertTriangle className="h-6 w-6 text-black mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-black mb-2 tracking-tight antialiased">Data Speeds</h3>
                <p className="text-gray-700 leading-snug antialiased">Data speeds may be slower in rural areas. Use local SIMs instead of international roaming.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <AlertTriangle className="h-6 w-6 text-black mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-black mb-2 tracking-tight antialiased">Power & Connectivity</h3>
                <p className="text-gray-700 leading-snug antialiased">Power outages can temporarily affect connectivity. International roaming charges can be expensive.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white shadow-sm border border-gray-200 p-8">
          <h2 className="text-3xl font-black text-black mb-8 tracking-tight antialiased">Need Connectivity Help?</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold text-black mb-6 tracking-tight antialiased">Technical Support</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Phone className="h-6 w-6 text-black mr-4" />
                  <span className="text-gray-700 font-medium">+256 414 320 000</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-6 w-6 text-black mr-4" />
                  <span className="text-gray-700 font-medium">connectivity@dirtrails.com</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-black mb-6 tracking-tight antialiased">Quick Actions</h3>
              <div className="space-y-4">
                <Link to="/contact" className="flex items-center text-black hover:text-gray-700 transition-colors">
                  <Wifi className="h-6 w-6 mr-4" />
                  <span className="font-medium">Order Connectivity</span>
                </Link>
                <Link to="/help" className="flex items-center text-black hover:text-gray-700 transition-colors">
                  <Phone className="h-6 w-6 mr-4" />
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