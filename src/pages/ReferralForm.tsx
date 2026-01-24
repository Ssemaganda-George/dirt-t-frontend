import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Building, User, Send, ArrowLeft, CheckCircle } from 'lucide-react'
import { createBusinessReferral } from '../lib/database'

export default function ReferralForm() {
  const [formData, setFormData] = useState({
    referrerName: '',
    referrerEmail: '',
    referrerPhone: '',
    businessName: '',
    businessLocation: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    businessDescription: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.referrerName.trim()) {
      newErrors.referrerName = 'Your name is required'
    }

    if (!formData.referrerEmail.trim()) {
      newErrors.referrerEmail = 'Your email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.referrerEmail)) {
      newErrors.referrerEmail = 'Please enter a valid email address'
    }

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required'
    }

    if (!formData.businessLocation.trim()) {
      newErrors.businessLocation = 'Business location is required'
    }

    if (!formData.contactPerson.trim()) {
      newErrors.contactPerson = 'Contact person is required'
    }

    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address'
    }

    if (!formData.businessDescription.trim()) {
      newErrors.businessDescription = 'Business description is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      console.log('Submitting referral with data:', formData)

      // Create business referral in partnerships
      const result = await createBusinessReferral({
        referrer_name: formData.referrerName,
        referrer_email: formData.referrerEmail,
        referrer_phone: formData.referrerPhone,
        name: formData.businessName,
        email: formData.contactEmail,
        phone: formData.contactPhone,
        company: formData.businessName,
        contact_person: formData.contactPerson,
        business_location: formData.businessLocation,
        message: formData.businessDescription
      })

      console.log('Referral submitted successfully:', result)

      setIsSubmitting(false)
      setSubmitted(true)

      // Reset form after showing success message
      setTimeout(() => {
        setSubmitted(false)
        setFormData({
          referrerName: '',
          referrerEmail: '',
          referrerPhone: '',
          businessName: '',
          businessLocation: '',
          contactPerson: '',
          contactEmail: '',
          contactPhone: '',
          businessDescription: ''
        })
      }, 5000)

    } catch (error) {
      console.error('Error submitting referral:', error)
      setIsSubmitting(false)

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          alert('This referral may have already been submitted. Please try again.')
        } else if (error.message.includes('permission denied')) {
          alert('You do not have permission to submit referrals. Please contact support.')
        } else {
          alert(`Failed to submit referral: ${error.message}`)
        }
      } else {
        alert('Failed to submit referral. Please check your connection and try again.')
      }
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Referral Recorded!</h2>
          <p className="text-gray-600 mb-6">
            Thank you for referring this business. Your submission has been recorded and will be reviewed by our team.
          </p>
          <Link
            to="/refer-business"
            className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Referrals
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            to="/refer-business"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Refer Business
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Submit Business Referral</h1>
          <p className="text-lg text-gray-600 mt-2">
            Help us grow our network by referring quality businesses in the tourism industry.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Your Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-6 w-6 mr-2 text-blue-600" />
                Your Information
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="referrerName" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    id="referrerName"
                    name="referrerName"
                    required
                    value={formData.referrerName}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.referrerName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your name"
                  />
                  {errors.referrerName && (
                    <p className="mt-1 text-sm text-red-600">{errors.referrerName}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="referrerEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Email *
                  </label>
                  <input
                    type="email"
                    id="referrerEmail"
                    name="referrerEmail"
                    required
                    value={formData.referrerEmail}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.referrerEmail ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="your.email@example.com"
                  />
                  {errors.referrerEmail && (
                    <p className="mt-1 text-sm text-red-600">{errors.referrerEmail}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="referrerPhone" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Phone *
                  </label>
                  <input
                    type="tel"
                    id="referrerPhone"
                    name="referrerPhone"
                    required
                    value={formData.referrerPhone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+256 XXX XXX XXX"
                  />
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Building className="h-6 w-6 mr-2 text-blue-600" />
                Business Information
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    id="businessName"
                    name="businessName"
                    required
                    value={formData.businessName}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.businessName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter business name"
                  />
                  {errors.businessName && (
                    <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="businessLocation" className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    id="businessLocation"
                    name="businessLocation"
                    required
                    value={formData.businessLocation}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.businessLocation ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="City, District, Uganda"
                  />
                  {errors.businessLocation && (
                    <p className="mt-1 text-sm text-red-600">{errors.businessLocation}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Person */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Mail className="h-6 w-6 mr-2 text-blue-600" />
                Contact Person
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    id="contactPerson"
                    name="contactPerson"
                    required
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.contactPerson ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Person to contact"
                  />
                  {errors.contactPerson && (
                    <p className="mt-1 text-sm text-red-600">{errors.contactPerson}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="contactEmail"
                    name="contactEmail"
                    required
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.contactEmail ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="contact@business.com"
                  />
                  {errors.contactEmail && (
                    <p className="mt-1 text-sm text-red-600">{errors.contactEmail}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="contactPhone"
                    name="contactPhone"
                    required
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+256 XXX XXX XXX"
                  />
                </div>
              </div>
            </div>

            {/* Business Description */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Business Description</h2>
              <div>
                <label htmlFor="businessDescription" className="block text-sm font-medium text-gray-700 mb-2">
                  Tell us about this business *
                </label>
                <textarea
                  id="businessDescription"
                  name="businessDescription"
                  required
                  rows={4}
                  value={formData.businessDescription}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.businessDescription ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="What does this business do? What services do they offer? Why would they be a good fit for DirtTrails?"
                />
                {errors.businessDescription && (
                  <p className="mt-1 text-sm text-red-600">{errors.businessDescription}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Submitting Referral...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Submit Referral
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}