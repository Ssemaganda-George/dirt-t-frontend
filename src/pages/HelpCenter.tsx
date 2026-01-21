import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Search, MessageCircle, Phone, Mail } from 'lucide-react'
import { useState } from 'react'

const faqs = [
  {
    question: "How do I book a service?",
    answer: "Browse our categories (hotels, tours, restaurants, transport) and click on any service to view details. Select your preferred options and click 'Book Now' to complete your reservation."
  },
  {
    question: "Can I modify or cancel my booking?",
    answer: "Yes, you can modify or cancel most bookings through your account dashboard. Contact the service provider directly for changes, or reach out to our support team for assistance."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept major credit cards, debit cards, mobile money (MTN/Airtel), and bank transfers. All payments are processed securely through our payment partners."
  },
  {
    question: "How do I become a service provider?",
    answer: "Visit our vendor portal at /vendor-login to register your business. We'll review your application and guide you through the onboarding process."
  },
  {
    question: "What should I do if I have an issue with my booking?",
    answer: "Contact our support team immediately through the contact form below, or call our hotline. We'll work with you and the service provider to resolve any issues."
  },
  {
    question: "Are there any booking fees?",
    answer: "DirtTrails charges a small service fee for bookings, which varies by service type. The fee is clearly displayed before you complete your booking."
  },
  {
    question: "How do I reset my password?",
    answer: "Click 'Forgot Password' on the login page, enter your email address, and we'll send you a reset link. Follow the instructions in the email to create a new password."
  },
  {
    question: "Can I book for multiple people?",
    answer: "Yes, most services allow you to book for multiple guests. Specify the number of guests during the booking process, and pricing will be adjusted accordingly."
  }
]

const guides = [
  {
    title: "Getting Started Guide",
    description: "Learn the basics of using DirtTrails to book services in Uganda.",
    link: "#"
  },
  {
    title: "Booking Tutorial",
    description: "Step-by-step guide to making your first booking.",
    link: "#"
  },
  {
    title: "Vendor Onboarding",
    description: "Guide for service providers to join our platform.",
    link: "#"
  },
  {
    title: "Payment Guide",
    description: "Understanding payments, refunds, and billing.",
    link: "#"
  }
]

export default function HelpCenter() {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Help Center</h1>
            <p className="text-lg text-gray-600 mb-6">
              Find answers to common questions and get the help you need
            </p>

            {/* Search Bar */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for help..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* FAQ Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>

              {filteredFaqs.length === 0 ? (
                <p className="text-gray-600">No FAQs found matching your search.</p>
              ) : (
                <div className="space-y-4">
                  {filteredFaqs.map((faq, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                      >
                        <span className="font-medium text-gray-900">{faq.question}</span>
                        {expandedFaq === index ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                      </button>

                      {expandedFaq === index && (
                        <div className="px-6 pb-4">
                          <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Guides Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Helpful Guides</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {guides.map((guide, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h3 className="font-semibold text-gray-900 mb-2">{guide.title}</h3>
                    <p className="text-gray-600 text-sm mb-3">{guide.description}</p>
                    <Link
                      to={guide.link}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Read Guide →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Support */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Still Need Help?</h3>
              <p className="text-gray-600 mb-4">
                Can't find what you're looking for? Our support team is here to help.
              </p>

              <div className="space-y-3">
                <Link
                  to="/contact"
                  className="flex items-center w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <MessageCircle className="h-5 w-5 mr-3" />
                  Contact Support
                </Link>

                <div className="flex items-center text-gray-600">
                  <Phone className="h-5 w-5 mr-3" />
                  <div>
                    <p className="font-medium">Call Us</p>
                    <p className="text-sm">+256 414 123 456</p>
                  </div>
                </div>

                <div className="flex items-center text-gray-600">
                  <Mail className="h-5 w-5 mr-3" />
                  <div>
                    <p className="font-medium">Email Us</p>
                    <p className="text-sm">support@dirtrails.ug</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/contact" className="text-blue-600 hover:text-blue-800">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link to="/safety" className="text-blue-600 hover:text-blue-800">
                    Safety Information
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-blue-600 hover:text-blue-800">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/partner" className="text-blue-600 hover:text-blue-800">
                    Partner with Us
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}