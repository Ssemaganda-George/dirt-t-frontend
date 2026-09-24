import { Link, useParams } from 'react-router-dom'

export default function RequestOTPPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Operator sign-in required</h1>
        <p className="text-gray-600 mb-6">
          Ticket scanning is available to the event vendor and platform admins. Sign in with your own account to continue.
        </p>
        <div className="space-y-3">
          <Link to="/vendor-login" className="block w-full py-3 px-4 rounded-md bg-emerald-700 text-white font-medium hover:bg-emerald-800">
            Vendor sign-in
          </Link>
          <Link to="/login" className="block w-full py-3 px-4 rounded-md bg-gray-200 text-gray-800 font-medium hover:bg-gray-300">
            Admin sign-in
          </Link>
          {id && <Link to={`/scan/${id}`} className="block text-emerald-700 hover:underline">Return to event scanner</Link>}
        </div>
      </div>
    </div>
  )
}
