import { FileText, Shield, Scale, AlertCircle, CheckCircle, Clock } from 'lucide-react'

export default function TermsOfService() {
  const keyTerms = [
    {
      icon: FileText,
      title: "Acceptance of Terms",
      description: "By using DirtTrails, you agree to be bound by these terms and conditions.",
      details: [
        "Access constitutes acceptance",
        "Applicable to all users",
        "Regular review recommended"
      ]
    },
    {
      icon: Shield,
      title: "User Responsibilities",
      description: "Maintain account security and provide accurate information.",
      details: [
        "Secure account credentials",
        "Accurate information required",
        "Report unauthorized access"
      ]
    },
    {
      icon: Scale,
      title: "Booking Terms",
      description: "All bookings subject to availability and provider policies.",
      details: [
        "Subject to availability",
        "Prices may change",
        "Provider-specific policies"
      ]
    },
    {
      icon: AlertCircle,
      title: "Liability Limitations",
      description: "Platform connecting users with service providers.",
      details: [
        "Third-party services",
        "Users assume risks",
        "Limited liability scope"
      ]
    }
  ]

  const detailedSections = [
    {
      number: "1",
      title: "Service Description",
      content: "DirtTrails is an online platform that connects travelers with tourism service providers, including hotels, tours, restaurants, transportation, and events. We facilitate bookings and payments between users and verified service providers.",
      subsections: [
        "Platform for tourism services",
        "Verified service providers only",
        "Booking and payment facilitation",
        "Available throughout and outside Africa"
      ]
    },
    {
      number: "2",
      title: "User Accounts",
      content: "To access certain features of our platform, you must create an account. You are responsible for maintaining the security of your account credentials and for all activities that occur under your account.",
      subsections: [
        "Account creation required for advanced operations",
        "User responsible for security",
        "Immediate notification of breaches",
      ]
    },
    {
      number: "3",
      title: "Booking and Payment",
      content: "When you make a booking through our platform, you enter into a direct contract with the service provider. Payment processing is handled securely through third-party payment providers. All fees and applicable taxes are clearly displayed before payment.",
      subsections: [
        "Direct contract with provider",
        "Secure payment processing",
        "Transparent fee structure",
        "Confirmation upon payment"
      ]
    },
    {
      number: "4",
      title: "Cancellation and Refunds",
      content: "Cancellation policies vary by service provider and are clearly stated during the booking process. Generally, cancellations made 24-48 hours in advance may be eligible for partial refunds, subject to provider policies.",
      subsections: [
        "Provider-specific policies",
        "24-48 hour advance notice preferred",
        "Partial refunds possible",
        "No refunds for no-shows"
      ]
    },
    {
      number: "5",
      title: "User Conduct",
      content: "You agree to use the platform responsibly and not engage in any unlawful activities. This includes not attempting to gain unauthorized access to our systems or interfere with the platform's proper functioning.",
      subsections: [
        "Lawful use only",
        "No system interference",
        "Respect other users",
        "Report violations"
      ]
    },
    {
      number: "6",
      title: "Content and Intellectual Property",
      content: "All content on the platform, including text, graphics, logos, and software, is owned by DirtTrails or our licensors and is protected by intellectual property laws. You may not reproduce or distribute content without permission.",
      subsections: [
        "Platform content ownership",
        "Intellectual property protection",
        "Limited use permissions",
        "User-generated content guidelines"
      ]
    },
    {
      number: "7",
      title: "Privacy Policy",
      content: "Your privacy is important to us. Our Privacy Policy, which governs your use of the platform, explains how we collect, use, and protect your personal information. Please review it carefully.",
      subsections: [
        "Data collection practices",
        "Information usage policies",
        "Security measures",
        "User rights and choices"
      ]
    },
    {
      number: "8",
      title: "Disclaimers",
      content: "The platform is provided 'as is' without warranties of any kind. We do not guarantee the accuracy, completeness, or reliability of any content or services offered through our platform.",
      subsections: [
        "No warranties provided",
        "Content accuracy not guaranteed",
        "Service quality varies",
        "Use at your own risk"
      ]
    },
    {
      number: "9",
      title: "Limitation of Liability",
      content: "In no event shall DirtTrails be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of the platform or services booked through it.",
      subsections: [
        "Limited liability scope",
        "No consequential damages",
        "Maximum liability caps",
        "Force majeure exceptions"
      ]
    },
    {
      number: "10",
      title: "Governing Law",
      content: "These terms are governed by the laws of the Republic of Uganda. Any disputes arising from these terms or your use of the platform shall be resolved in the courts of Uganda.",
      subsections: [
        "Ugandan law applies",
        "Court jurisdiction in Uganda",
        "Dispute resolution process",
        "Applicable legal framework"
      ]
    },
    {
      number: "11",
      title: "Changes to Terms",
      content: "We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting on the platform. Continued use of the platform constitutes acceptance of modified terms.",
      subsections: [
        "Right to modify terms",
        "Immediate effect upon posting",
        "User notification methods",
        "Continued use implies acceptance"
      ]
    },
    {
      number: "12",
      title: "Contact Information",
      content: "If you have questions about these terms or need to report violations, please contact our legal team. We are committed to addressing your concerns promptly and fairly.",
      subsections: [
        "Legal team contact",
        "Questions and concerns",
        "Violation reporting",
        "Response time commitment"
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-black border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-black text-white mb-4 tracking-tight antialiased">Terms of Service</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4 leading-snug antialiased">
              Please read these terms carefully before using the DirtTrails platform.
            </p>
            <div className="flex items-center justify-center space-x-2 text-gray-500">
              <Clock className="h-5 w-5" />
              <span className="text-sm font-semibold tracking-tight antialiased">
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Key Terms Overview */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-black mb-4 tracking-tight antialiased">Key Terms Overview</h2>
            <p className="text-lg text-gray-600 leading-snug antialiased">Important points you should know about using DirtTrails</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {keyTerms.map((term, index) => (
              <div key={index} className="bg-white shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-black flex items-center justify-center">
                      <term.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-black mb-3 tracking-tight antialiased">{term.title}</h3>
                    <p className="text-gray-700 mb-4 leading-snug antialiased">{term.description}</p>
                    <ul className="space-y-2">
                      {term.details.map((detail, idx) => (
                        <li key={idx} className="flex items-center text-gray-700 text-sm">
                          <CheckCircle className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
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

        {/* Detailed Terms */}
        <div className="bg-white shadow-sm border border-gray-200 p-8 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-black mb-4 tracking-tight antialiased">Detailed Terms and Conditions</h2>
            <p className="text-lg text-gray-700 leading-snug antialiased">Complete terms governing your use of DirtTrails</p>
          </div>

          <div className="space-y-12">
            {detailedSections.map((section, index) => (
              <div key={index} className="border-b border-gray-100 pb-8 last:border-b-0 last:pb-0">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-gray-600">{section.number}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-black mb-4 tracking-tight antialiased">{section.title}</h3>
                    <p className="text-gray-700 leading-snug antialiased mb-6">{section.content}</p>

                    <div className="bg-gray-50 p-6">
                      <h4 className="font-bold text-black mb-3 tracking-tight antialiased">Key Points:</h4>
                      <ul className="space-y-2">
                        {section.subsections.map((subsection, idx) => (
                          <li key={idx} className="flex items-start text-gray-700">
                            <CheckCircle className="h-5 w-5 text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
                            <span className="leading-snug antialiased">{subsection}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agreement and Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Agreement Section */}
          <div className="bg-white border border-gray-200 p-8">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xl font-bold text-black mb-3 tracking-tight antialiased">Agreement to Terms</h3>
                <p className="text-gray-700 leading-snug antialiased mb-4">
                  By accessing and using DirtTrails, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
                </p>
                <p className="text-gray-600 text-sm leading-snug antialiased">
                  If you do not agree to these terms, please discontinue use of our platform immediately.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-white border border-gray-200 p-8">
            <div className="flex items-start space-x-3">
              <FileText className="h-6 w-6 text-gray-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xl font-bold text-black mb-3 tracking-tight antialiased">Questions About Terms?</h3>
                <p className="text-gray-700 leading-snug antialiased mb-4">
                  If you have questions about these terms or need clarification on any section, our legal team is here to help.
                </p>
                <div className="space-y-2 text-sm text-gray-700">
                  <p className="leading-snug antialiased"><strong>Email:</strong> legal@dirtrails.com</p>
                  <p className="leading-snug antialiased"><strong>Phone:</strong> +256 414 123 456</p>
                  <p className="leading-snug antialiased"><strong>Response Time:</strong> Within 24 hours</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 pt-8 border-t border-gray-200">
          <p className="text-gray-500 mb-2 leading-snug antialiased">
            These terms were last updated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
          </p>
          <p className="text-gray-600 text-sm leading-snug antialiased">
            We reserve the right to update these terms at any time. Continued use of DirtTrails constitutes acceptance of any changes.
          </p>
        </div>
      </div>
    </div>
  )
}