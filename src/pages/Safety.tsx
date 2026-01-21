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
      description: "Take necessary health precautions before and during your trip to Uganda.",
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Safety & Security</h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Your safety is our top priority. Learn about safety measures and emergency contacts for a worry-free experience.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Safety Features */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Safety Commitments</h2>
            <p className="text-lg text-slate-600">How we ensure your safety throughout your journey</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {safetyFeatures.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center hover:shadow-md transition-shadow duration-200">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <feature.icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Tips */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Essential Safety Tips</h2>
            <p className="text-lg text-slate-600">Prepare for a safe and enjoyable trip to Uganda</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {safetyTips.map((tip, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <tip.icon className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">{tip.title}</h3>
                    <p className="text-slate-600 mb-6 leading-relaxed">{tip.description}</p>
                    <ul className="space-y-2">
                      {tip.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start text-slate-600">
                          <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="leading-relaxed">{detail}</span>
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
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Emergency Contacts</h2>
            <p className="text-lg text-slate-600">Important numbers to keep handy during your trip</p>
          </div>

          <div className="max-w-md mx-auto">
            {emergencyContacts.map((category, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                    <category.icon className="h-5 w-5 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">{category.category}</h3>
                </div>

                <div className="space-y-4">
                  {category.contacts.map((contact, idx) => (
                    <div key={idx} className="flex justify-between items-center py-3 px-4 bg-slate-50 rounded-lg">
                      <span className="text-slate-700 font-medium">{contact.name}</span>
                      <a
                        href={`tel:${contact.number}`}
                        className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Safety Policy</h2>
            <p className="text-lg text-slate-600">Comprehensive measures for your peace of mind</p>
          </div>

          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600 mb-6 leading-relaxed">
              At DirtTrails, we are committed to providing a safe and secure platform for travelers and service providers alike.
              Our comprehensive safety measures include:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 text-lg">For Travelers:</h4>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span>Rigorous verification of all service providers</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span>Secure payment processing and protection</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span>24/7 emergency support hotline</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span>Regular safety audits of partner services</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 text-lg">For Service Providers:</h4>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span>Background checks and credential verification</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span>Training on safety and customer service standards</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span>Regular quality and safety inspections</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span>Dedicated support team for compliance</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-800 mb-2">Important Notice</h4>
                  <p className="text-amber-700 leading-relaxed">
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
    </div>
  )
}