import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { verifyTicketByCode } from '../lib/database'

export default function VerifyTicket() {
  const { ticketCode } = useParams<{ ticketCode: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<{
    valid: boolean
    message: string
    ticket?: any
    serviceSlug?: string
  } | null>(null)

  useEffect(() => {
    const verifyTicket = async () => {
      if (!ticketCode) {
        setResult({ valid: false, message: 'Invalid ticket code' })
        setLoading(false)
        return
      }

      try {
        const serviceSlug = searchParams.get('service') || undefined
        console.log('Verifying ticket:', ticketCode, 'for service:', serviceSlug)

        const verificationResult = await verifyTicketByCode(ticketCode, serviceSlug ? undefined : undefined)

        if (verificationResult.valid) {
          const alreadyUsed = (verificationResult as any).already_used || false
          setResult({
            valid: true,
            message: alreadyUsed
              ? 'Ticket verified (previously used)'
              : 'Ticket verified successfully!',
            ticket: verificationResult.ticket,
            serviceSlug
          })
        } else {
          setResult({
            valid: false,
            message: verificationResult.message || 'Invalid ticket',
            serviceSlug
          })
        }
      } catch (error: any) {
        console.error('Error verifying ticket:', error)
        setResult({
          valid: false,
          message: error.message || 'Error verifying ticket',
          serviceSlug: searchParams.get('service') || undefined
        })
      } finally {
        setLoading(false)
      }
    }

    verifyTicket()
  }, [ticketCode, searchParams])

  const handleViewService = () => {
    if (result?.serviceSlug) {
      navigate(`/service/${result.serviceSlug}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying ticket...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          {result?.valid ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Ticket Verified!</h1>
              <p className="text-gray-600 mb-6">{result.message}</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Ticket</h1>
              <p className="text-gray-600 mb-6">{result?.message || 'Ticket not found'}</p>
            </>
          )}

          {result?.serviceSlug && (
            <button
              onClick={handleViewService}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              View Service
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="w-full mt-3 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}