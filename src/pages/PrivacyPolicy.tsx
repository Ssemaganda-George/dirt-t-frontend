import { Clock, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function PrivacyPolicy() {
  const navigate = useNavigate()
  const lastUpdated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="text-center relative">
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              title="Back"
              className="absolute left-3 -top-2 sm:top-2 z-30 inline-flex items-center justify-center h-11 w-11 text-sm text-gray-700 bg-white border border-gray-200 shadow-sm rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-1">Privacy Policy</h1>
            <p className="text-sm text-gray-600 mb-2">How DirtTrails collects, uses and protects personal data.</p>
            <div className="flex items-center justify-center space-x-2 text-gray-500">
              <Clock className="h-4 w-4" />
              <span className="text-xs sm:text-sm font-medium">Last updated: {lastUpdated}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
        <section className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Summary</h2>
          <p className="text-sm text-gray-700">We collect the minimum data needed to provide services: contact details, booking and payment information, and optional profile data. We respect your rights under major privacy frameworks (GDPR, UK DPA, CCPA, PIPEDA and others).</p>
        </section>

        <section className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">What we collect</h2>
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-start"><CheckCircle className="h-4 w-4 text-emerald-600 mr-2 mt-0.5"/>Contact & identity (name, email, phone)</li>
            <li className="flex items-start"><CheckCircle className="h-4 w-4 text-emerald-600 mr-2 mt-0.5"/>Booking details and transaction records</li>
            <li className="flex items-start"><CheckCircle className="h-4 w-4 text-emerald-600 mr-2 mt-0.5"/>Optional profile or preference data you provide</li>
            <li className="flex items-start"><CheckCircle className="h-4 w-4 text-emerald-600 mr-2 mt-0.5"/>Aggregated analytics and device identifiers</li>
          </ul>
        </section>

        <section className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">How we use data</h2>
          <p className="text-sm text-gray-700">To deliver bookings and payments, communicate with you, detect fraud, improve the service, and meet legal obligations. We only use data for clear, legitimate purposes and limit retention as required.</p>
        </section>

        <section className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Sharing & transfers</h2>
          <p className="text-sm text-gray-700">We share necessary data with service providers and payment processors. Cross-border transfers are protected by standard contractual clauses or equivalent safeguards where required.</p>
        </section>

        <section className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Your rights</h2>
          <p className="text-sm text-gray-700">Depending on your jurisdiction you may access, correct, delete, or export your personal data, or object to certain processing. To exercise rights, contact safaris.dirttrails@gmail.com; we’ll respond within applicable timeframes.</p>
        </section>

        <section className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Security</h2>
          <p className="text-sm text-gray-700">We use standard industry controls to protect data in transit and at rest. No system is perfect — promptly report suspected breaches to safaris.dirttrails@gmail.com.</p>
        </section>

        <section className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Children</h2>
          <p className="text-sm text-gray-700">Our services are not for children under 16. We do not knowingly collect data from minors; if discovered we will delete it promptly.</p>
        </section>

        <section className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Contact</h2>
          <p className="text-sm text-gray-700">Email: safaris.dirttrails@gmail.com</p>
        </section>

      </div>
    </div>
  )
}
