import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type Status = 'idle' | 'verifying' | 'success' | 'error'

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setStatus('error')
      setMessage('Invalid or missing verification token.')
      return
    }

    let isCancelled = false

    const verify = async () => {
      setStatus('verifying')

      try {
        const { error } = await supabase.functions.invoke('verify-email', {
          body: { token },
        })

        if (isCancelled) return

        if (error) {
          console.error('Email verification error:', error)
          setStatus('error')
          setMessage(
            error.message ||
              'Unable to verify your email. The link may have expired or already been used.'
          )
          return
        }

        setStatus('success')
        setMessage('Your email has been verified successfully. You can now log in.')
      } catch (err: any) {
        if (isCancelled) return
        console.error('Unexpected error during email verification:', err)
        setStatus('error')
        setMessage(
          'An unexpected error occurred while verifying your email. Please try again or request a new link.'
        )
      }
    }

    verify()

    return () => {
      isCancelled = true
    }
  }, [searchParams])

  const handleGoToLogin = () => {
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow-sm rounded-lg p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Email Verification</h1>

        {status === 'verifying' && (
          <div>
            <p className="text-gray-700 mb-2">Verifying your email...</p>
            <p className="text-sm text-gray-500">This should only take a moment.</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <p className="text-green-700 mb-4">{message}</p>
            <button
              onClick={handleGoToLogin}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Go to login
            </button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <p className="text-red-700 mb-4">{message}</p>
            <button
              onClick={handleGoToLogin}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Go to login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default VerifyEmail
