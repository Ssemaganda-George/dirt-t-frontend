import { Shield, AlertTriangle, Phone, MapPin, Heart, Users, Car, Home } from 'lucide-react'

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
      category: "Medical Emergencies",
      contacts: [
        { name: "Ambulance", number: "911 or 112" },
        { name: "International Hospital Kampala", number: "+256 414 320 000" },
        { name: "Case Hospital", number: "+256 414 595 945" },
        { name: "Travel Health Clinic", number: "+256 414 301 000" }
      ]
    },
    {
      category: "Police & Security",
      contacts: [
        { name: "Police Emergency", number: "999" },
        { name: "Tourist Police", number: "+256 414 595 945" },
        { name: "Kampala Metropolitan Police", number: "+256 414 595 945" },
        { name: "Uganda Police Force", number: "999" }
      ]
    },
    {
      category: "DirtTrails Support",
      contacts: [
        { name: "24/7 Support Hotline", number: "+256 414 123 456" },
        { name: "Emergency WhatsApp", number: "+256 701 234 567" },
        { name: "Email Support", number: "emergency@dirtrails.ug" }
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Safety & Security</h1>
            <p className="text-lg text-gray-600">
              Your safety is our top priority. Learn about safety measures and emergency contacts for a worry-free experience.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Safety Features */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Our Safety Commitments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {safetyFeatures.map((feature, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Tips */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Essential Safety Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {safetyTips.map((tip, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <tip.icon className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{tip.title}</h3>
                    <p className="text-gray-600 mb-4">{tip.description}</p>
                    <ul className="space-y-1">
                      {tip.details.map((detail, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-center">
                          <span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-2 flex-shrink-0"></span>
                          {detail}
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
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Emergency Contacts</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {emergencyContacts.map((category, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-red-600" />
                  {category.category}
                </h3>
                <div className="space-y-3">
                  {category.contacts.map((contact, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-gray-700 font-medium">{contact.name}</span>
                      <a
                        href={`tel:${contact.number}`}
                        className="text-blue-600 hover:text-blue-800 font-semibold"
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
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Safety Policy</h2>
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-4">
              At DirtTrails, we are committed to providing a safe and secure platform for travelers and service providers alike.
              Our comprehensive safety measures include:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">For Travelers:</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>• Rigorous verification of all service providers</li>
                  <li>• Secure payment processing and protection</li>
                  <li>• 24/7 emergency support hotline</li>
                  <li>• Regular safety audits of partner services</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">For Service Providers:</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>• Background checks and credential verification</li>
                  <li>• Training on safety and customer service standards</li>
                  <li>• Regular quality and safety inspections</li>
                  <li>• Dedicated support team for compliance</li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800 mb-1">Important Notice</h4>
                  <p className="text-yellow-700 text-sm">
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