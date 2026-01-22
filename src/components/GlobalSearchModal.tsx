import { useState, useEffect, useRef } from 'react'
import { Search, X, MapPin, HelpCircle, Shield, FileText } from 'lucide-react'
import { useServices } from '../hooks/hook'
import { Link } from 'react-router-dom'
import type { Service } from '../types'

// Support content data
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
    icon: FileText,
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
    icon: Shield,
    faqs: [
      {
        question: "How do I reset my password?",
        answer: "Click 'Forgot Password' on the login page, enter your email address, and we'll send you a reset link. Follow the instructions in the email to create a new password."
      },
      {
        question: "How do I become a service provider?",
        answer: "Visit our 'Partner With Us' page to learn about becoming a vendor. Complete the registration process and submit required documentation for approval."
      }
    ]
  }
]

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
    icon: HelpCircle,
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
    icon: Shield,
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

const termsSections = [
  {
    title: "Acceptance of Terms",
    description: "By using DirtTrails, you agree to be bound by these terms and conditions.",
    details: [
      "Access constitutes acceptance",
      "Applicable to all users",
      "Regular review recommended"
    ]
  },
  {
    title: "User Responsibilities",
    description: "Maintain account security and provide accurate information.",
    details: [
      "Secure account credentials",
      "Accurate information required",
      "Report unauthorized access"
    ]
  },
  {
    title: "Booking Terms",
    description: "All bookings subject to availability and provider policies.",
    details: [
      "Subject to availability",
      "Prices may change",
      "Provider-specific policies"
    ]
  }
]

// Combined search result type
type SearchResult = {
  type: 'service' | 'faq' | 'safety' | 'terms'
  service?: Service
  faq?: {
    question: string
    answer: string
    category: string
    categoryName: string
  }
  safety?: {
    title: string
    description: string
    details: string[]
  }
  terms?: {
    title: string
    description: string
    details: string[]
  }
}

interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { services: allServices } = useServices()

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Search functionality
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)

    const searchTerm = query.toLowerCase().trim()
    const combinedResults: SearchResult[] = []

    // Search services
    const serviceResults = allServices.filter((service) => {
      // Search in title
      if (service.title?.toLowerCase().includes(searchTerm)) return true

      // Search in description
      if (service.description?.toLowerCase().includes(searchTerm)) return true

      // Search in location
      if (service.location?.toLowerCase().includes(searchTerm)) return true

      // Search in vendor name
      if (service.vendors?.business_name?.toLowerCase().includes(searchTerm)) return true

      // Search in category name
      if (service.service_categories?.name?.toLowerCase().includes(searchTerm)) return true

      // Search in amenities
      if (service.amenities?.some(amenity => amenity.toLowerCase().includes(searchTerm))) return true

      // Search in tags/keywords (if any)
      if (service.tags?.some(tag => tag.toLowerCase().includes(searchTerm))) return true

      return false
    }).map(service => ({ type: 'service' as const, service }))

    combinedResults.push(...serviceResults)

    // Search FAQs
    const faqResults = faqCategories.flatMap(cat =>
      cat.faqs.filter(faq =>
        faq.question.toLowerCase().includes(searchTerm) ||
        faq.answer.toLowerCase().includes(searchTerm)
      ).map(faq => ({
        type: 'faq' as const,
        faq: { ...faq, category: cat.id, categoryName: cat.name }
      }))
    )

    combinedResults.push(...faqResults)

    // Search safety tips
    const safetyResults = safetyTips.filter(tip =>
      tip.title.toLowerCase().includes(searchTerm) ||
      tip.description.toLowerCase().includes(searchTerm) ||
      tip.details.some(detail => detail.toLowerCase().includes(searchTerm))
    ).map(tip => ({ type: 'safety' as const, safety: tip }))

    combinedResults.push(...safetyResults)

    // Search terms sections
    const termsResults = termsSections.filter(section =>
      section.title.toLowerCase().includes(searchTerm) ||
      section.description.toLowerCase().includes(searchTerm) ||
      section.details.some(detail => detail.toLowerCase().includes(searchTerm))
    ).map(section => ({ type: 'terms' as const, terms: section }))

    combinedResults.push(...termsResults)

    setTimeout(() => {
      // Limit to 15 results total
      setResults(combinedResults.slice(0, 15))
      setIsLoading(false)
    }, 200) // Small delay for better UX

  }, [query, allServices])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    try {
      // Validate currency code - if invalid, use UGX as fallback
      const validCurrencies = ['UGX', 'USD', 'EUR', 'GBP', 'KES', 'TZS', 'RWF']
      const currencyCode = validCurrencies.includes(currency?.toUpperCase()) ? currency.toUpperCase() : 'UGX'

      return new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
      }).format(amount)
    } catch (error) {
      // Fallback for any formatting errors
      return `UGX ${amount.toLocaleString()}`
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center pt-20 px-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Search Header */}
        <div className="flex items-center border-b border-gray-200 p-4">
          <Search className="h-5 w-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for hotels, tours, restaurants, transport, FAQs, safety tips..."
            className="flex-1 text-lg outline-none placeholder-gray-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={onClose}
            className="ml-3 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto">
          {query.trim() === '' ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Start typing to search</p>
              <p className="text-sm">Find hotels, tours, restaurants, transport, FAQs, safety tips, and more</p>
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Searching...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No results found</p>
              <p className="text-sm">Try different keywords or check your spelling</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((result, index) => {
                if (result.type === 'service' && result.service) {
                  const service = result.service
                  return (
                    <Link
                      key={`service-${service.id}`}
                      to={`/service/${service.slug}`}
                      onClick={onClose}
                      className="block p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                          {service.images && service.images.length > 0 ? (
                            <img
                              src={service.images[0]}
                              alt={service.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {service.title}
                          </h3>

                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span className="truncate">{service.location || 'Location not specified'}</span>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              {service.service_categories?.name && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                  {service.service_categories.name}
                                </span>
                              )}
                              {service.vendors?.business_name && (
                                <span className="text-gray-600">
                                  by {service.vendors.business_name}
                                </span>
                              )}
                            </div>

                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">
                                {formatCurrency(service.price, service.currency)}
                              </div>
                              {service.duration_hours && (
                                <div className="text-xs text-gray-500">
                                  {service.duration_hours}h duration
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                }

                if (result.type === 'faq' && result.faq) {
                  const faq = result.faq
                  return (
                    <Link
                      key={`faq-${index}`}
                      to="/help"
                      onClick={onClose}
                      className="block p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center">
                          <HelpCircle className="h-8 w-8 text-green-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {faq.question}
                          </h3>

                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                              FAQ - {faq.categoryName}
                            </span>
                          </div>

                          <div className="mt-2 text-sm text-gray-600 line-clamp-2">
                            {faq.answer}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                }

                if (result.type === 'safety' && result.safety) {
                  const safety = result.safety
                  return (
                    <Link
                      key={`safety-${index}`}
                      to="/safety"
                      onClick={onClose}
                      className="block p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                          <Shield className="h-8 w-8 text-red-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {safety.title}
                          </h3>

                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                              Safety Tip
                            </span>
                          </div>

                          <div className="mt-2 text-sm text-gray-600 line-clamp-2">
                            {safety.description}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                }

                if (result.type === 'terms' && result.terms) {
                  const terms = result.terms
                  return (
                    <Link
                      key={`terms-${index}`}
                      to="/terms"
                      onClick={onClose}
                      className="block p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-8 w-8 text-purple-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {terms.title}
                          </h3>

                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                              Terms & Conditions
                            </span>
                          </div>

                          <div className="mt-2 text-sm text-gray-600 line-clamp-2">
                            {terms.description}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                }

                return null
              })}

              {results.length >= 15 && (
                <div className="p-4 text-center border-t border-gray-100">
                  <Link
                    to={`/services?q=${encodeURIComponent(query)}`}
                    onClick={onClose}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View all results for "{query}"
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}