import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { getCurrentUser } from '../services/AuthService'
import { Clock, AlertCircle, CheckCircle } from 'lucide-react'

export default function VendorPending() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const [refreshing, setRefreshing] = useState(false)
  const [refreshedStatus, setRefreshedStatus] = useState<string | null>(null)

  const handleRefreshStatus = async () => {
    setRefreshing(true)
    try {
      const user = await getCurrentUser()
      if (!user) return
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('status')
        .eq('user_id', user.id)
        .single()
      if (vendorData?.status) {
        setRefreshedStatus(vendorData.status)
        if (vendorData.status === 'approved') {
          window.location.reload()
        }
      }
    } catch (e) {
      console.error('Failed to refresh status:', e)
    } finally {
      setRefreshing(false)
    }
  }

  const getStatusInfo = () => {
    // Use profile status to determine account state
    const status = refreshedStatus || profile?.status
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="h-12 w-12 text-yellow-500" />,
          title: 'Account Under Review',
          message: 'Your business account is currently under review by our team. You will receive an email notification once a decision has been made.',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        }
      case 'rejected':
        return {
          icon: <AlertCircle className="h-12 w-12 text-red-500" />,
          title: 'Account Rejected',
          message: 'We regret to inform you that your business account application has been declined. If you require further details, please contact our support team.',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        }
      case 'suspended':
        return {
          icon: <AlertCircle className="h-12 w-12 text-orange-500" />,
          title: 'Account Suspended',
          message: 'Your business account has been suspended. Please contact our support team for assistance.',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        }
      case 'approved':
        return {
          icon: <CheckCircle className="h-12 w-12 text-green-500" />,
          title: 'Account Approved!',
          message: 'Congratulations! Your business account has been approved. You may now access the business dashboard.',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        }
      default:
        return {
          icon: <Clock className="h-12 w-12 text-gray-400" />,
          title: 'Business Account Status',
          message: 'Your business account is being reviewed. Please check back later or contact support if you need assistance.',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
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

          {profile?.status === 'pending' && (
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
                      <li>Our team will review the information you submitted.</li>
                      <li>We will verify the business details and any supporting documentation.</li>
                      <li>You will receive an email notification once a decision has been made.</li>
                      <li>Review typically takes 1–3 business days.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {profile?.status === 'approved' ? (
              <button
                onClick={() => navigate('/vendor')}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 transition-colors"
              >
                Go to Business Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="w-full flex justify-center py-3 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
              >
                Return to Home
              </button>
            )}

            {(refreshedStatus || profile?.status) === 'pending' && (
              <button
                onClick={handleRefreshStatus}
                disabled={refreshing}
                className="w-full flex justify-center py-3 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {refreshing ? 'Checking…' : 'Check Approval Status'}
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="w-full flex justify-center py-3 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
            >
              Sign Out
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Need help? <a href="mailto:safaris.dirttrails@gmail.com" className="font-medium text-emerald-700 hover:text-emerald-800">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}