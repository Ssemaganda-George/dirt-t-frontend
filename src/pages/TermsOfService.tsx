import { FileText, Shield, Scale, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function TermsOfService() {
  const navigate = useNavigate()
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
      content: "To access certain features of our platform, you must create an account. By using DirtTrails, you confirm that you are legally capable of entering into a binding agreement and that all information provided during registration or booking is accurate and truthful. You are responsible for maintaining the security of your account credentials and for all activities that occur under your account.",
      subsections: [
        "Account creation required for advanced operations",
        "Legal capacity and truthful information required",
        "User responsible for security",
        "Immediate notification of breaches",
      ]
    },
    {
      number: "3",
      title: "Booking and Payment",
      content: "All reservations made through the platform constitute a binding booking agreement between the Client and the selected service provider. DirtTrails facilitates bookings, payments, and communication between parties but does not own or operate accommodation providers listed on the platform. Clients agree to pay all applicable charges including accommodation costs, service fees, taxes, tourism levies, and incidental expenses incurred during their stay.",
      subsections: [
        "Direct contract with provider",
        "DirtTrails is a facilitation platform",
        "Secure payment processing",
        "Transparent fees, taxes, and levies",
        "Confirmation upon payment"
      ]
    },
    {
      number: "3A",
      title: "Pricing and Confirmed Bookings",
      content: "Prices may occasionally change due to operational costs, government taxation, currency fluctuations, or seasonal demand. However, confirmed and fully paid bookings are not affected by later price adjustments.",
      subsections: [
        "Prices may vary before confirmation",
        "Operational and regulatory factors may affect pricing",
        "Confirmed fully paid bookings are protected",
        "Displayed final charges apply at payment"
      ]
    },
    {
      number: "4",
      title: "Cancellation and Refunds",
      content: "Cancellation and refund eligibility depends on cancellation timing and the operational costs already incurred by the service provider. Policies vary by provider and are displayed during booking. Failure to appear for a confirmed reservation without notice may be treated as a no-show and charges may apply.",
      subsections: [
        "Provider-specific policies",
        "Cancellation timing affects eligibility",
        "Operational costs may reduce refund amounts",
        "No refunds for no-shows"
      ]
    },
    {
      number: "4A",
      title: "Payments, Chargebacks, and Disputes",
      content: "Payments made through cards, digital wallets, or online payment systems constitute legally valid transactions. In case of chargebacks or disputes, DirtTrails may provide booking confirmations, payment records, and communication history to financial institutions. Fraudulent or unjustified chargebacks may result in suspension of the user account and recovery of outstanding amounts.",
      subsections: [
        "Card and wallet payments are valid transactions",
        "Records may be shared for dispute handling",
        "Fraudulent chargebacks may lead to suspension",
        "Outstanding amounts may be recovered"
      ]
    },
    {
      number: "5",
      title: "User Conduct",
      content: "Clients must behave respectfully and lawfully while using services booked through the platform. Hotels or service providers may terminate services immediately in cases of misconduct including harassment, violence, illegal activity, property damage, or disruptive behavior. Where termination occurs due to client misconduct after reasons are communicated, refunds may not be issued.",
      subsections: [
        "Lawful use only",
        "No harassment, violence, or illegal activity",
        "Service providers may terminate services for misconduct",
        "Refunds may be denied for misconduct-related termination",
        "No system interference",
        "Report violations"
      ]
    },
    {
      number: "5A",
      title: "Health, Safety, and Emergency Access",
      content: "Clients are responsible for disclosing relevant medical conditions, allergies, or dietary restrictions that may affect participation in activities or food consumption during their stay. In emergency situations where a Client is unconscious, intoxicated, or unable to communicate, authorized personnel may access identification or emergency contact information solely for safety or medical assistance.",
      subsections: [
        "Disclose relevant medical and dietary information",
        "Assist safe participation in booked services",
        "Emergency contact access limited to safety purposes",
        "No broader data use under emergency access"
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
      content: "Personal data collected through the platform may include identification details, contact information, and booking information necessary for service delivery. Data is processed in accordance with international and national privacy laws including GDPR, the UK Data Protection Act 2018, CCPA, PIPEDA (Canada), Uganda's Data Protection and Privacy Act 2019, and other applicable privacy regulations.",
      subsections: [
        "Data collection practices",
        "Information usage policies",
        "Security measures",
        "User rights and choices",
        "Compliance with major international privacy frameworks"
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
      content: "DirtTrails is responsible for operating the booking platform and coordinating reservations, while accommodation providers remain responsible for safety, staff conduct, and services delivered within their premises. Each party is responsible for actions within its operational control and may be liable for damages caused by negligence or misconduct.",
      subsections: [
        "Limited liability scope",
        "Operational-control responsibility model",
        "Provider responsibility for on-premise service delivery",
        "Potential liability for negligence or misconduct",
        "Force majeure exceptions"
      ]
    },
    {
      number: "10",
      title: "Governing Law",
      content: "These Terms are interpreted under internationally recognized principles of electronic commerce and contract law, including the United Nations Convention on the Use of Electronic Communications in International Contracts, the UNCITRAL Model Law on Electronic Commerce, and the United Nations Guidelines for Consumer Protection, together with applicable national laws in jurisdictions where the platform operates.",
      subsections: [
        "International e-commerce and contract law principles",
        "UNCITRAL and UN consumer protection guidance",
        "Applicable national law by operating jurisdiction",
        "Dispute resolution process",
        "Applicable legal framework"
      ]
    },
    {
      number: "11",
      title: "Changes to Terms",
      content: "By selecting 'Accept', you confirm that you have read, understood, and agreed to these Terms and Conditions. We reserve the right to modify these terms at any time. Changes are effective upon posting, and continued use of the platform constitutes acceptance of modified terms.",
      subsections: [
        "Acceptance is confirmed when user selects 'Accept'",
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

  const summaryTerms = [
    "By selecting 'Accept', you agree to the Terms and Conditions governing the use of the DirtTrails platform and all services accessed through the application.",
    "DirtTrails operates a digital platform that connects travelers ('Clients') with licensed hotels and tourism service providers.",
    "All reservations made through the platform constitute a binding booking agreement between the Client and the selected service provider.",
    "DirtTrails facilitates bookings, payments, and communication, but does not own or operate listed accommodation providers.",
    "Clients agree to pay all applicable charges including accommodation costs, service fees, taxes, tourism levies, and incidental expenses.",
    "Prices may change due to operational costs, taxation, currency fluctuations, or seasonal demand; confirmed and fully paid bookings are not affected by later price adjustments.",
    "Cancellation and refund eligibility depends on cancellation timing and provider-incurred operational costs; no-show charges may apply.",
    "Payments through cards, digital wallets, and online systems are legally valid. Booking and payment records may be used to resolve chargebacks and disputes.",
    "Fraudulent or unjustified chargebacks may result in account suspension and recovery of outstanding amounts.",
    "Clients must act lawfully and respectfully. Providers may terminate services in cases such as harassment, violence, illegal activity, property damage, or disruptive behavior.",
    "Clients should disclose relevant medical conditions, allergies, or dietary restrictions. Emergency access to identification or contact data is limited to safety or medical assistance.",
    "Personal data is processed under applicable privacy laws including GDPR, UK DPA 2018, CCPA, PIPEDA, Uganda's Data Protection and Privacy Act 2019, and other relevant regulations.",
    "DirtTrails is responsible for platform operation and reservation coordination, while providers are responsible for safety and service delivery within their premises.",
    "These Terms are interpreted in line with international electronic commerce and contract principles, including UNCITRAL and related UN frameworks, together with applicable national laws."
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="text-center relative">
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              title="Back"
              className="absolute left-3 -top-2 sm:top-2 z-30 inline-flex items-center justify-center h-11 w-11 text-sm text-gray-700 bg-white border border-gray-200 shadow-sm rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-3 tracking-tight antialiased">Terms of Service</h1>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto mb-4 leading-relaxed antialiased">
              Please read these terms carefully before using the DirtTrails platform.
            </p>
            <div className="flex items-center justify-center space-x-2 text-gray-500">
              <Clock className="h-4 w-4" />
              <span className="text-xs sm:text-sm font-medium tracking-tight antialiased">
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Terms Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-8 sm:mb-12">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2 tracking-tight antialiased">Dirt-Trails Terms (Summary)</h2>
            <p className="text-sm text-gray-600 leading-relaxed antialiased">
              This summary highlights key terms. The detailed sections below provide the full governing terms and conditions.
            </p>
          </div>

          <ul className="space-y-3">
            {summaryTerms.map((item, index) => (
              <li key={index} className="flex items-start text-gray-700">
                <CheckCircle className="h-4 w-4 text-emerald-600 mr-2.5 mt-0.5 flex-shrink-0" />
                <span className="text-sm leading-relaxed antialiased">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Key Terms Overview */}
        <div className="mb-10 sm:mb-14">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 tracking-tight antialiased">Key Terms</h2>
            <p className="text-sm text-gray-600 leading-relaxed antialiased">Important points about using DirtTrails</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {keyTerms.map((term, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-5">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                      <term.icon className="h-4 w-4 text-gray-700" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-2 tracking-tight antialiased">{term.title}</h3>
                    <p className="text-gray-700 mb-3 leading-relaxed antialiased">{term.description}</p>
                    <ul className="space-y-2">
                      {term.details.map((detail, idx) => (
                        <li key={idx} className="flex items-center text-gray-700 text-sm">
                          <CheckCircle className="h-4 w-4 text-emerald-600 mr-2 flex-shrink-0" />
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-8 sm:mb-12">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 tracking-tight antialiased">Detailed Terms</h2>
            <p className="text-sm text-gray-700 leading-relaxed antialiased">Complete terms governing your use of DirtTrails</p>
          </div>

          <div className="space-y-8 sm:space-y-10">
            {detailedSections.map((section, index) => (
              <div key={index} className="border-b border-gray-100 pb-6 sm:pb-8 last:border-b-0 last:pb-0">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">{section.number}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 tracking-tight antialiased">{section.title}</h3>
                    <p className="text-sm text-gray-700 leading-relaxed antialiased mb-5">{section.content}</p>

                    <div className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-100">
                      <h4 className="font-semibold text-gray-900 mb-2 tracking-tight antialiased">Key Points:</h4>
                      <ul className="space-y-2">
                        {section.subsections.map((subsection, idx) => (
                          <li key={idx} className="flex items-start text-gray-700">
                            <CheckCircle className="h-4 w-4 text-emerald-600 mr-2.5 mt-0.5 flex-shrink-0" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Agreement Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 tracking-tight antialiased">Agreement to Terms</h3>
                <p className="text-gray-700 leading-relaxed antialiased mb-3">
                  By accessing and using DirtTrails, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
                </p>
                <p className="text-gray-600 text-sm leading-relaxed antialiased">
                  If you do not agree to these terms, please discontinue use of our platform immediately.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 text-gray-700 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 tracking-tight antialiased">Questions About Terms?</h3>
                <p className="text-gray-700 leading-relaxed antialiased mb-4">
                  If you have questions about these terms or need clarification on any section, our legal team is here to help.
                </p>
                <div className="space-y-2 text-sm text-gray-700">
                  <p className="leading-snug antialiased"><strong>Email:</strong> safaris.dirttrails@gmail.com</p>
                  <p className="leading-snug antialiased"><strong>Phone:</strong> +256 414 123 456</p>
                  <p className="leading-snug antialiased"><strong>Response Time:</strong> Within 24 hours</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 sm:mt-10 pt-4 sm:pt-6 border-t border-gray-200">
          <p className="text-gray-500 mb-1 antialiased text-xs sm:text-sm">
            These terms were last updated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
          </p>
          <p className="text-gray-600 text-xs sm:text-sm leading-relaxed antialiased">
            Continued use of DirtTrails constitutes acceptance of any changes.
          </p>
        </div>
      </div>
    </div>
  )
}