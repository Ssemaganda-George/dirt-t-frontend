import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Search, MessageCircle, Phone, Mail, BookOpen, Users, CreditCard, MapPin } from 'lucide-react'
import { useState } from 'react'

const faqCategories = [
  {
    id: 'booking',
    name: 'Booking & Reservations',
    icon: MapPin,
    faqs: [
      {
        question: "How do I book a service?",
        answer: "Browse our categories (hotels, tours, restaurants, transport) and click on any service to view details. Select your preferred options and click 'Book Now' to complete your reservation."
      },
      {
        question: "Can I modify or cancel my booking?",
        answer: "Yes, you can modify or cancel most bookings through your account dashboard. Contact the service provider directly for changes, or reach out to our support team for assistance."
      },
      {
        question: "Can I book for multiple people?",
        answer: "Yes, most services allow you to book for multiple guests. Specify the number of guests during the booking process, and pricing will be adjusted accordingly."
      }
    ]
  },
  {
    id: 'payment',
    name: 'Payment & Billing',
    icon: CreditCard,
    faqs: [
      {
        question: "What payment methods do you accept?",
        answer: "We accept major credit cards, debit cards, mobile money (MTN/Airtel), and bank transfers. All payments are processed securely through our payment partners."
      },
      {
        question: "Are there any booking fees?",
        answer: "DirtTrails charges a small service fee for bookings, which varies by service type. The fee is clearly displayed before you complete your booking."
      }
    ]
  },
  {
    id: 'account',
    name: 'Account & Access',
    icon: Users,
    faqs: [
      {
        question: "How do I reset my password?",
        answer: "Click 'Forgot Password' on the login page, enter your email address, and we'll send you a reset link. Follow the instructions in the email to create a new password."
      },
      {
        question: "How do I become a service provider?",
        answer: "Visit our vendor portal at /vendor-login to register your business. We'll review your application and guide you through the onboarding process."
      }
    ]
  },
  {
    id: 'support',
    name: 'Support & Issues',
    icon: MessageCircle,
    faqs: [
      {
        question: "What should I do if I have an issue with my booking?",
        answer: "Contact our support team immediately through the contact form below, or call our hotline. We'll work with you and the service provider to resolve any issues."
      }
    ]
  }
]

const guides = [
  {
    title: "Getting Started Guide",
    description: "Learn the basics of using DirtTrails to book services in Uganda.",
    icon: BookOpen,
    link: "#"
  },
  {
    title: "Booking Tutorial",
    description: "Step-by-step guide to making your first booking.",
    icon: MapPin,
    link: "#"
  },
  {
    title: "Vendor Onboarding",
    description: "Guide for service providers to join our platform.",
    icon: Users,
    link: "#"
  },
  {
    title: "Payment Guide",
    description: "Understanding payments, refunds, and billing.",
    icon: CreditCard,
    link: "#"
  }
]

export default function HelpCenter() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const allFaqs = faqCategories.flatMap(cat => cat.faqs.map(faq => ({ ...faq, category: cat.id })))

  const filteredFaqs = allFaqs.filter(faq =>
    (selectedCategory === 'all' || faq.category === selectedCategory) &&
    (faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
     faq.answer.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Help Center</h1>
            <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
              Find answers to common questions and get the help you need to make the most of your DirtTrails experience.
            </p>

            {/* Search Bar */}
            <div className="max-w-lg mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search for help..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-8">
              <h3 className="font-semibold text-slate-900 mb-4">Categories</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All Topics
                </button>
                {faqCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center ${
                      selectedCategory === category.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <category.icon className="h-4 w-4 mr-2" />
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Contact Card */}
              <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-medium text-slate-900 mb-3">Need More Help?</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-slate-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>+256 414 123 456</span>
                  </div>
                  <div className="flex items-center text-slate-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span>support@dirtrails.ug</span>
                  </div>
                </div>
                <Link
                  to="/contact"
                  className="mt-3 inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Contact Support →
                </Link>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* FAQ Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Frequently Asked Questions</h2>
                <span className="text-sm text-slate-500">{filteredFaqs.length} results</span>
              </div>

              {filteredFaqs.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No FAQs found matching your search.</p>
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setSelectedCategory('all')
                    }}
                    className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFaqs.map((faq, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset transition-colors"
                      >
                        <span className="font-medium text-slate-900 pr-4">{faq.question}</span>
                        {expandedFaq === index ? (
                          <ChevronUp className="h-5 w-5 text-slate-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-500 flex-shrink-0" />
                        )}
                      </button>

                      {expandedFaq === index && (
                        <div className="px-6 pb-5 border-t border-slate-100">
                          <p className="text-slate-600 leading-relaxed pt-4">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Guides Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Helpful Guides</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {guides.map((guide, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-6 hover:shadow-md hover:border-slate-300 transition-all duration-200">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                          <guide.icon className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-2">{guide.title}</h3>
                        <p className="text-slate-600 text-sm mb-4 leading-relaxed">{guide.description}</p>
                        <Link
                          to={guide.link}
                          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm group"
                        >
                          Read Guide
                          <ChevronDown className="h-4 w-4 ml-1 transform rotate-[-90deg] group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}