import { useState } from 'react'
import { Mail, Phone, MapPin, Clock, Send, MessageSquare, Building } from 'lucide-react'

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000))

    setIsSubmitting(false)
    setSubmitted(true)

    // Reset form after 3 seconds
    setTimeout(() => {
      setSubmitted(false)
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        category: 'general'
      })
    }, 3000)
  }

  const contactMethods = [
    {
      icon: MessageSquare,
      title: 'Live Chat',
      description: 'Chat with our support team',
      details: ['Available 24/7', 'Instant responses', 'Real-time assistance'],
      action: 'Start Chat',
      primary: true
    },
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Send us a detailed message',
      details: ['support@dirtrails.ug', '24-48 hour response', 'Detailed inquiries'],
      action: 'Send Email',
      primary: false
    },
    {
      icon: Phone,
      title: 'Phone Support',
      description: 'Speak directly with our team',
      details: ['+256 414 123 456', 'Mon-Fri 8AM-6PM EAT', 'Priority support'],
      action: 'Call Now',
      primary: false
    }
  ]

  const officeInfo = [
    {
      icon: Building,
      title: 'Head Office',
      details: ['Plot 123 Kampala Road', 'Nakawa, Kampala, Uganda', 'P.O. Box 12345']
    },
    {
      icon: Clock,
      title: 'Business Hours',
      details: ['Monday - Friday: 8:00 AM - 6:00 PM', 'Saturday: 9:00 AM - 4:00 PM', 'Sunday: Closed']
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Contact Us</h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Get in touch with our team. We're here to help you plan your perfect Ugandan adventure.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Contact Methods */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">How can we help you?</h2>
            <p className="text-lg text-slate-600">Choose the best way to reach our support team</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {contactMethods.map((method, index) => (
              <div key={index} className={`bg-white rounded-xl shadow-sm border p-8 text-center transition-all duration-200 hover:shadow-md ${
                method.primary ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200'
              }`}>
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 ${
                  method.primary ? 'bg-blue-100' : 'bg-slate-100'
                }`}>
                  <method.icon className={`h-8 w-8 ${
                    method.primary ? 'text-blue-600' : 'text-slate-600'
                  }`} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{method.title}</h3>
                <p className="text-slate-600 mb-6">{method.description}</p>
                <ul className="text-sm text-slate-600 space-y-1 mb-6">
                  {method.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
                <button className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                  method.primary
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}>
                  {method.action}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Contact Form */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Send us a Message</h2>
              <p className="text-slate-600">Fill out the form below and we'll get back to you within 24 hours.</p>
            </div>

            {submitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Send className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Message Sent!</h3>
                <p className="text-slate-600">
                  Thank you for contacting us. We'll get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-2">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="booking">Booking Support</option>
                    <option value="technical">Technical Support</option>
                    <option value="partnership">Partnership</option>
                    <option value="complaint">Complaint</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Brief description of your inquiry"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    placeholder="Please provide details about your inquiry..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Office Information */}
          <div className="space-y-8">
            {officeInfo.map((info, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                      <info.icon className="h-6 w-6 text-slate-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">{info.title}</h3>
                    <div className="space-y-1">
                      {info.details.map((detail, idx) => (
                        <p key={idx} className="text-slate-600">{detail}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Map Placeholder */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-slate-900 mb-2">Find Us</h4>
                  <p className="text-slate-600">Interactive map coming soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}