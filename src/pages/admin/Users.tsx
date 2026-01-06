import { useEffect, useState } from 'react'
import { formatDate, getStatusColor } from '../../lib/utils'
import { Check, X, Eye, User, Store } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

// Database types
interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string
  avatar_url?: string
  role: 'tourist' | 'vendor' | 'admin'
  created_at: string
  updated_at: string
}

interface Vendor {
  id: string
  user_id: string
  business_name: string
  business_description?: string
  business_address?: string
  business_phone?: string
  business_email?: string
  business_website?: string
  business_type?: string
  operating_hours?: string
  years_in_business?: string
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  created_at: string
  updated_at: string
  profiles?: Profile
}

interface Tourist {
  id: string
  user_id: string
  first_name?: string
  last_name?: string
  phone?: string
  emergency_contact?: string
  emergency_phone?: string
  travel_preferences?: string
  dietary_restrictions?: string
  medical_conditions?: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

interface UserWithDetails {
  profile: Profile
  vendor?: Vendor
  tourist?: Tourist
  isVerified: boolean
}

export default function Users() {
  const [users, setUsers] = useState<UserWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null)
  const [filter, setFilter] = useState<'all' | 'tourist' | 'vendor' | 'pending' | 'verified' | 'rejected'>('all')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)

      // Fetch profiles with their associated vendor/tourist data using joins
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          vendors (*),
          tourists (*)
        `)
        .neq('role', 'admin') // Exclude admin users
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // Transform the data to match our interface
      const usersWithDetails: UserWithDetails[] = profiles.map(profile => {
        return {
          profile: {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            phone: profile.phone,
            avatar_url: profile.avatar_url,
            role: profile.role,
            created_at: profile.created_at,
            updated_at: profile.updated_at
          },
          vendor: profile.vendors?.[0] || null, // vendors is an array, take first item
          tourist: profile.tourists?.[0] || null, // tourists is an array, take first item
          isVerified: profile.vendors?.[0] ? profile.vendors[0].status === 'approved' : true
        }
      })

      setUsers(usersWithDetails)
    } catch (error) {
      console.error('Error fetching users:', error)
      // You could add a toast notification here
    } finally {
      setLoading(false)
    }
  }

  const updateVendorStatus = async (vendorId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          status,
          approved_at: status === 'approved' ? new Date().toISOString() : null,
          approved_by: null // You might want to add current admin user ID here
        })
        .eq('id', vendorId)

      if (error) throw error

      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.vendor?.id === vendorId
            ? {
                ...user,
                vendor: user.vendor ? { ...user.vendor, status } : undefined,
                isVerified: status === 'approved'
              }
            : user
        )
      )

      setSelectedUser(null)
    } catch (error) {
      console.error('Error updating vendor status:', error)
    }
  }

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true
    if (filter === 'tourist') return user.profile.role === 'tourist'
    if (filter === 'vendor') return user.profile.role === 'vendor'
    if (filter === 'pending') return user.vendor?.status === 'pending'
    if (filter === 'verified') return user.isVerified
    if (filter === 'rejected') return user.vendor?.status === 'rejected'
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-600">
          Review and verify user registrations
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setFilter('tourist')}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              filter === 'tourist'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tourists ({users.filter(u => u.profile.role === 'tourist').length})
          </button>
          <button
            onClick={() => setFilter('vendor')}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              filter === 'vendor'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Vendors ({users.filter(u => u.profile.role === 'vendor').length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              filter === 'pending'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending ({users.filter(u => u.vendor?.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('verified')}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              filter === 'verified'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Verified ({users.filter(u => u.isVerified).length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              filter === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            Rejected ({users.filter(u => u.vendor?.status === 'rejected').length})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredUsers.map((user) => (
            <li key={user.profile.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                        {user.profile.role === 'vendor' ? (
                          <Store className="h-5 w-5 text-primary-600" />
                        ) : (
                          <User className="h-5 w-5 text-primary-600" />
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.profile.full_name || 'Unnamed User'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.profile.email}
                      </div>
                      {user.vendor && (
                        <div className="text-sm text-gray-500">
                          {user.vendor.business_name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-900 capitalize">
                        {user.profile.role}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(user.profile.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {user.vendor && (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.vendor.status)}`}>
                          {user.vendor.status}
                        </span>
                      )}
                      {user.profile.role === 'tourist' && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Verified
                        </span>
                      )}
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Review Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {user.vendor?.status === 'pending' && (
                        <>
                          <button
                            onClick={() => user.vendor && updateVendorStatus(user.vendor.id, 'approved')}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => user.vendor && updateVendorStatus(user.vendor.id, 'rejected')}
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'all' ? 'No users have registered yet.' : `No users match the "${filter}" filter.`}
          </p>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">User Details</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Profile Information */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Profile Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p><span className="font-medium">Name:</span> {selectedUser.profile.full_name || 'Not provided'}</p>
                    <p><span className="font-medium">Email:</span> {selectedUser.profile.email}</p>
                    <p><span className="font-medium">Phone:</span> {selectedUser.profile.phone || 'Not provided'}</p>
                    <p><span className="font-medium">Role:</span> <span className="capitalize">{selectedUser.profile.role}</span></p>
                    <p><span className="font-medium">Joined:</span> {formatDate(selectedUser.profile.created_at)}</p>
                  </div>
                </div>

                {/* Vendor Information */}
                {selectedUser.vendor && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Business Information</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <p><span className="font-medium">Business Name:</span> {selectedUser.vendor.business_name}</p>
                      <p><span className="font-medium">Description:</span> {selectedUser.vendor.business_description || 'Not provided'}</p>
                      <p><span className="font-medium">Address:</span> {selectedUser.vendor.business_address || 'Not provided'}</p>
                      <p><span className="font-medium">Phone:</span> {selectedUser.vendor.business_phone || 'Not provided'}</p>
                      <p><span className="font-medium">Email:</span> {selectedUser.vendor.business_email || 'Not provided'}</p>
                      <p><span className="font-medium">Website:</span> {selectedUser.vendor.business_website || 'Not provided'}</p>
                      <p><span className="font-medium">Business Type:</span> {selectedUser.vendor.business_type || 'Not provided'}</p>
                      <p><span className="font-medium">Operating Hours:</span> {selectedUser.vendor.operating_hours || 'Not provided'}</p>
                      <p><span className="font-medium">Years in Business:</span> {selectedUser.vendor.years_in_business || 'Not provided'}</p>
                      <p><span className="font-medium">Status:</span>
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedUser.vendor.status)}`}>
                          {selectedUser.vendor.status}
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Tourist Information */}
                {selectedUser.tourist && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Tourist Information</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <p><span className="font-medium">First Name:</span> {selectedUser.tourist.first_name || 'Not provided'}</p>
                      <p><span className="font-medium">Last Name:</span> {selectedUser.tourist.last_name || 'Not provided'}</p>
                      <p><span className="font-medium">Phone:</span> {selectedUser.tourist.phone || 'Not provided'}</p>
                      <p><span className="font-medium">Emergency Contact:</span> {selectedUser.tourist.emergency_contact || 'Not provided'}</p>
                      <p><span className="font-medium">Emergency Phone:</span> {selectedUser.tourist.emergency_phone || 'Not provided'}</p>
                      <p><span className="font-medium">Travel Preferences:</span> {selectedUser.tourist.travel_preferences || 'Not provided'}</p>
                      <p><span className="font-medium">Dietary Restrictions:</span> {selectedUser.tourist.dietary_restrictions || 'Not provided'}</p>
                      <p><span className="font-medium">Medical Conditions:</span> {selectedUser.tourist.medical_conditions || 'Not provided'}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {selectedUser.vendor?.status === 'pending' && (
                  <div className="flex space-x-3 pt-4 border-t">
                    <button
                      onClick={() => updateVendorStatus(selectedUser.vendor!.id, 'approved')}
                      className="btn-primary flex items-center"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve Vendor
                    </button>
                    <button
                      onClick={() => updateVendorStatus(selectedUser.vendor!.id, 'rejected')}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject Vendor
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}