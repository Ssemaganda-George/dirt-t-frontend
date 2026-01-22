import { Shield, AlertTriangle, Phone, MapPin, Heart, Users, Car, Home, CheckCircle } from 'lucide-react'

export default function Safety() {
  const safetyTips = [
    {
      icon: Shield,
      title: "Travel Insurance",
      description: "Always purchase comprehensive travel insurance that covers medical emergencies, trip cancellations, and lost belongings.",
      details: [
        "Medical evacuation coverage",
        "Trip interruption protection",
        "Lost luggage compensation",
        "24/7 emergency assistance"
      ]
    },
    {
      icon: AlertTriangle,
      title: "Health Precautions",
      description: "Take necessary health precautions before and during your trip.",
      details: [
        "Consult a travel health clinic",
        "Get recommended vaccinations",
        "Carry necessary medications",
        "Stay hydrated and use sunscreen"
      ]
    },
    {
      icon: MapPin,
      title: "Local Awareness",
      description: "Stay informed about your surroundings and local conditions.",
      details: [
        "Research your destinations",
        "Keep important documents secure",
        "Be aware of local customs",
        "Learn basic local phrases"
      ]
    },
    {
      icon: Users,
      title: "Service Provider Safety",
      description: "Choose verified service providers and communicate your plans.",
      details: [
        "Book through reputable platforms",
        "Share itinerary with trusted contacts",
        "Verify provider credentials",
        "Read reviews and ratings"
      ]
    }
  ]

  const emergencyContacts = [
    {
      category: "DirtTrails Support",
      icon: Phone,
      contacts: [
        { name: "24/7 Support Hotline", number: "+256 414 123 456" },
        { name: "Emergency WhatsApp", number: "+256759918649" },
        { name: "Email Support", number: "emergency@dirtrails.com" }
      ]
    }
  ]

  const safetyFeatures = [
    {
      icon: Heart,
      title: "Verified Partners",
      description: "All our service providers undergo thorough background checks and verification processes."
    },
    {
      icon: Car,
      title: "Safe Transportation",
      description: "Our transport partners maintain vehicles to the highest safety standards with regular inspections."
    },
    {
      icon: Home,
      title: "Quality Accommodations",
      description: "Hotels and lodges in our network meet safety and hygiene standards."
    },
    {
      icon: Shield,
      title: "24/7 Support",
      description: "Round-the-clock support for any issues or emergencies during your trip."
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-black text-white mb-4 tracking-tight antialiased">Safety & Security</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-snug antialiased">
              Your safety is our top priority. Learn about safety measures and emergency contacts for a worry-free experience.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Safety Features */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-black mb-4 tracking-tight antialiased">Our Safety Commitments</h2>
            <p className="text-lg text-gray-600 leading-snug antialiased">How we ensure your safety throughout your journey</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {safetyFeatures.map((feature, index) => (
              <div key={index} className="bg-white shadow-sm border border-gray-200 p-8 text-center hover:shadow-md transition-shadow duration-200">
                <div className="w-16 h-16 bg-gray-900 flex items-center justify-center mx-auto mb-6">
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-black mb-3 tracking-tight antialiased">{feature.title}</h3>
                <p className="text-gray-700 leading-snug antialiased text-elegant">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Tips */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <div className="inline-block bg-gray-900 px-8 py-4 mb-6">
              <h2 className="text-4xl font-black text-white mb-2 tracking-tight antialiased">Essential Safety Tips</h2>
              <p className="text-lg text-gray-300 leading-snug antialiased font-semibold">Prepare for a safe and enjoyable trip</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {safetyTips.map((tip, index) => (
              <div key={index} className="bg-white shadow-sm border border-gray-200 p-8 hover:bg-gray-50 transition-all duration-200">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gray-900 flex items-center justify-center">
                      <tip.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-black mb-3 tracking-tight antialiased">{tip.title}</h3>
                    <p className="text-gray-700 mb-6 leading-snug antialiased text-elegant">{tip.description}</p>
                    <ul className="space-y-2">
                      {tip.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start text-gray-700">
                          <CheckCircle className="h-5 w-5 text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="leading-snug antialiased">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-black mb-4 tracking-tight antialiased">Emergency Contacts</h2>
            <p className="text-lg text-gray-600 leading-snug antialiased">Important numbers to keep handy during your trip</p>
          </div>

          <div className="max-w-md mx-auto">
            {emergencyContacts.map((category, index) => (
              <div key={index} className="bg-white shadow-sm border border-gray-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-gray-900 flex items-center justify-center mr-3">
                    <category.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-black tracking-tight antialiased">{category.category}</h3>
                </div>

                <div className="space-y-4">
                  {category.contacts.map((contact, idx) => (
                    <div key={idx} className="flex justify-between items-center py-3 px-4 bg-gray-50">
                      <span className="text-gray-900 font-semibold tracking-tight antialiased">{contact.name}</span>
                      <a
                        href={`tel:${contact.number}`}
                        className="text-gray-700 hover:text-black font-bold transition-colors underline tracking-tight antialiased"
                      >
                        {contact.number}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Policy */}
        <div className="bg-gray-900 shadow-sm border border-gray-200 p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-white mb-4 tracking-tight antialiased">Our Safety Policy</h2>
            <p className="text-lg text-gray-300 leading-snug antialiased">Comprehensive measures for your peace of mind</p>
          </div>

          <div className="prose prose-slate max-w-none">
            <p className="text-gray-300 mb-6 leading-snug antialiased">
              At DirtTrails, we are committed to providing a safe and secure platform for travelers and service providers alike.
              Our comprehensive safety measures include:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <h4 className="font-bold text-white text-lg tracking-tight antialiased">For Travelers:</h4>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="leading-snug antialiased">Rigorous verification of all service providers</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="leading-snug antialiased">Secure payment processing and protection</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="leading-snug antialiased">24/7 emergency support hotline</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="leading-snug antialiased">Regular safety audits of partner services</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-white text-lg tracking-tight antialiased">For Service Providers:</h4>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="leading-snug antialiased">Background checks and credential verification</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="leading-snug antialiased">Training on safety and customer service standards</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="leading-snug antialiased">Regular quality and safety inspections</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="leading-snug antialiased">Dedicated support team for compliance</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-amber-600 border border-amber-700 p-6">
              <div className="flex items-start space-x-3">
                {/* <AlertTriangle className="h-6 w-6 text-amber-200 flex-shrink-0 mt-0.5" /> */}
                <div>
                  <h4 className="font-bold text-amber-100 mb-2 tracking-tight antialiased">Important Notice</h4>
                  <p className="text-amber-50 leading-snug antialiased">
                    While we take every precaution to ensure safety, travel inherently involves some risks.
                    Always exercise caution, follow local laws, and contact emergency services if needed.
                    DirtTrails is not liable for incidents beyond our reasonable control.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h3 className="text-2xl font-black text-white mb-4 tracking-tight antialiased">Travel Safe with DirtTrails</h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto leading-snug antialiased">
              Your safety and security are our highest priorities. We're here to ensure you have a worry-free experience.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-gray-400" />
                <span className="text-gray-300 font-semibold tracking-tight antialiased">Verified Partners</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-gray-400" />
                <span className="text-gray-300 font-semibold tracking-tight antialiased">24/7 Support</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-gray-400" />
                <span className="text-gray-300 font-semibold tracking-tight antialiased">Safety First</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}