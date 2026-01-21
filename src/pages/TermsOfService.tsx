import { FileText, Shield, Scale, AlertCircle } from 'lucide-react'

export default function TermsOfService() {
  const sections = [
    {
      icon: FileText,
      title: "Acceptance of Terms",
      content: `By accessing and using DirtTrails ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.`
    },
    {
      icon: Shield,
      title: "User Responsibilities",
      content: `Users are responsible for maintaining the confidentiality of their account credentials and for all activities that occur under their account. You agree to provide accurate and complete information when creating an account or making a booking.`
    },
    {
      icon: Scale,
      title: "Booking Terms",
      content: `All bookings are subject to availability and confirmation. Prices are subject to change without notice. Payment is required at the time of booking for most services. Cancellations and refunds are subject to the specific policies of each service provider.`
    },
    {
      icon: AlertCircle,
      title: "Liability Limitations",
      content: `DirtTrails acts as a platform connecting travelers with service providers. We are not responsible for the quality, safety, or legality of services provided by third-party vendors. Users assume all risks associated with using our platform.`
    }
  ]

  const detailedTerms = [
    {
      title: "1. Service Description",
      content: `DirtTrails is an online platform that connects travelers with tourism service providers in Uganda, including hotels, tours, restaurants, transportation, and activities.`
    },
    {
      title: "2. User Accounts",
      content: `To access certain features, you must create an account. You are responsible for maintaining the security of your account and password. You agree to notify us immediately of any unauthorized use of your account.`
    },
    {
      title: "3. Booking and Payment",
      content: `When you make a booking through our platform, you enter into a contract directly with the service provider. Payment processing is handled by third-party payment providers. All fees and charges are clearly displayed before payment.`
    },
    {
      title: "4. Cancellation and Refunds",
      content: `Cancellation policies vary by service provider. Generally, cancellations made 24-48 hours in advance may be eligible for partial refunds. No refunds for no-shows or last-minute cancellations.`
    },
    {
      title: "5. User Conduct",
      content: `You agree not to use the platform for any unlawful purpose or to conduct any unlawful activity. You must not attempt to gain unauthorized access to our systems or interfere with the proper functioning of the platform.`
    },
    {
      title: "6. Content and Intellectual Property",
      content: `All content on the platform, including text, graphics, logos, and software, is owned by DirtTrails or our licensors. You may not reproduce, distribute, or create derivative works without permission.`
    },
    {
      title: "7. Privacy Policy",
      content: `Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the platform, to understand our practices.`
    },
    {
      title: "8. Disclaimers",
      content: `The platform is provided "as is" without warranties of any kind. We do not guarantee the accuracy, completeness, or reliability of any content or services.`
    },
    {
      title: "9. Limitation of Liability",
      content: `In no event shall DirtTrails be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of the platform.`
    },
    {
      title: "10. Governing Law",
      content: `These terms are governed by the laws of Uganda. Any disputes shall be resolved in the courts of Uganda.`
    },
    {
      title: "11. Changes to Terms",
      content: `We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting on the platform. Continued use constitutes acceptance of the modified terms.`
    },
    {
      title: "12. Contact Information",
      content: `If you have questions about these terms, please contact us at legal@dirtrails.ug or +256 414 123 456.`
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-lg text-gray-600">
              Please read these terms carefully before using DirtTrails platform.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {sections.map((section, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <section.icon className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{section.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{section.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Terms */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Detailed Terms and Conditions</h2>

          <div className="space-y-8">
            {detailedTerms.map((term, index) => (
              <div key={index} className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{term.title}</h3>
                <p className="text-gray-600 leading-relaxed">{term.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Agreement Section */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-8">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Agreement to Terms</h3>
              <p className="text-yellow-700 mb-4">
                By using DirtTrails, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                If you do not agree to these terms, please do not use our platform.
              </p>
              <p className="text-yellow-700 text-sm">
                For questions about these terms or to report violations, please contact our legal team at legal@dirtrails.ug
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200">
          <p className="text-gray-600">
            These terms were last updated on {new Date().toLocaleDateString()}.
            We reserve the right to update these terms at any time.
          </p>
        </div>
      </div>
    </div>
  )
}