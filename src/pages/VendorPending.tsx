import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Clock, AlertCircle, CheckCircle } from 'lucide-react'

export default function VendorPending() {
  const { vendor, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/vendor-login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getStatusInfo = () => {
    switch (vendor?.status) {
      case 'pending':
        return {
          icon: <Clock className="h-12 w-12 text-yellow-500" />,
          title: 'Account Under Review',
          message: 'Your vendor account is currently being reviewed by our administrators. You will receive an email notification once your account is approved.',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        }
      case 'rejected':
        return {
          icon: <AlertCircle className="h-12 w-12 text-red-500" />,
          title: 'Account Rejected',
          message: 'Unfortunately, your vendor account application has been rejected. Please contact support for more information.',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        }
      case 'suspended':
        return {
          icon: <AlertCircle className="h-12 w-12 text-orange-500" />,
          title: 'Account Suspended',
          message: 'Your vendor account has been suspended. Please contact support for assistance.',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        }
      default:
        return {
          icon: <CheckCircle className="h-12 w-12 text-green-500" />,
          title: 'Account Approved',
          message: 'Your vendor account has been approved! You should be able to access the vendor panel now.',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className={`mx-auto flex items-center justify-center h-20 w-20 rounded-full ${statusInfo.bgColor} border-4 ${statusInfo.borderColor} mb-6`}>
            {statusInfo.icon}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {statusInfo.title}
          </h2>

          <p className="text-gray-600 mb-8">
            {statusInfo.message}
          </p>

          {vendor?.status === 'pending' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    What happens next?
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Our team will review your business information</li>
                      <li>We'll verify your business details and documentation</li>
                      <li>You'll receive an email once approved</li>
                      <li>Approval typically takes 1-3 business days</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={() => navigate('/')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Return to Home
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Sign Out
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Need help? <a href="mailto:support@dirttrails.com" className="font-medium text-primary-600 hover:text-primary-500">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}