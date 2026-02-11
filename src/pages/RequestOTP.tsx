import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createEventOTP, getServiceById } from '../lib/database'
import { useAuth } from '../contexts/AuthContext'

export default function RequestOTPPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [service, setService] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const loadService = async () => {
      if (!id) return
      try {
        const svc = await getServiceById(id)
        setService(svc)
      } catch (err: any) {
        console.error('Error loading service:', err)
      }
    }
    loadService()
  }, [id])

  const requestOTP = async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      await createEventOTP(id)
      setSuccess(true)

      // Redirect to scan page after 2 seconds
      setTimeout(() => {
        navigate(`/scan/${id}`)
      }, 2000)
    } catch (err: any) {
      setError(err?.message || 'Failed to request OTP')
    } finally {
      setLoading(false)
    }
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Expired</h1>
          <p className="text-gray-600 mb-4">
            Your verification code has expired. Request a new one to continue scanning tickets for:
          </p>
          <h2 className="text-xl font-semibold text-blue-600">{service.title}</h2>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-600 text-sm">
              OTP sent successfully! Redirecting you back to the scan page...
            </p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={requestOTP}
            disabled={loading || success}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Requesting OTP...
              </div>
            ) : success ? (
              'OTP Sent!'
            ) : (
              'Request New Verification Code'
            )}
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Return to Home
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>The verification code will be sent to the event organizer.</p>
          <p className="mt-1">Please check your email or contact the organizer directly.</p>
        </div>
      </div>
    </div>
  )
}