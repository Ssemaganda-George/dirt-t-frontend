import { useEffect, useState } from 'react'
import { formatDate, getStatusColor } from '../../lib/utils'
import { Check, X, Eye, User, Store, RefreshCw, Ban } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useServiceCategories } from '../../hooks/hook'

// Database types
interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string
  avatar_url?: string
  role: 'tourist' | 'vendor' | 'admin'
  status?: 'active' | 'suspended'
  suspended_at?: string
  suspension_period?: string
  suspension_end_at?: string
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
  const [filter, setFilter] = useState<'all' | 'tourist' | 'vendor' | 'pending' | 'verified' | 'rejected' | 'suspended'>('all')
  const { categories } = useServiceCategories()
  const [vendorCategories, setVendorCategories] = useState<{[vendorId: string]: string[]}>({})

  // Suspension modal state
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [suspendTarget, setSuspendTarget] = useState<{type: 'vendor' | 'user', id: string, name: string} | null>(null)
  const [suspendPeriod, setSuspendPeriod] = useState<'1day' | '1week' | '1month' | 'permanent'>('1week')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)

      // Fetch all user profiles from the database profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin') // Exclude admin users
        .order('created_at', { ascending: false })

      if (profilesError) {
        console.error('Error fetching profiles from database:', profilesError)
        throw profilesError
      }

      // Fetch related vendor and tourist data from their respective tables
      const [vendorsResult, touristsResult] = await Promise.all([
        supabase.from('vendors').select('*'),
        supabase.from('tourists').select('*')
      ])

      if (vendorsResult.error) {
        console.error('Error fetching vendors from database:', vendorsResult.error)
        throw vendorsResult.error
      }

      if (touristsResult.error) {
        console.error('Error fetching tourists from database:', touristsResult.error)
        throw touristsResult.error
      }

      // Combine profile data with vendor/tourist details for comprehensive user management
      const usersWithDetails: UserWithDetails[] = profiles.map(profile => {
        const vendor = vendorsResult.data?.find(v => v.user_id === profile.id)
        const tourist = touristsResult.data?.find(t => t.user_id === profile.id)

        return {
          profile,
          vendor,
          tourist,
          isVerified: vendor ? vendor.status === 'approved' : true // Tourists are auto-verified
        }
      })

      setUsers(usersWithDetails)
    } catch (error) {
      console.error('Error fetching users from database:', error)
      // In a production app, you would show a user-friendly error message here
    } finally {
      setLoading(false)
    }
  }

  const updateVendorStatus = async (vendorId: string, status: 'approved' | 'rejected' | 'suspended') => {
    try {
      // Update vendor status in database
      const { error } = await supabase
        .from('vendors')
        .update({
          status,
          approved_at: status === 'approved' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', vendorId)

      if (error) {
        console.error('Database error updating vendor status:', error)
        throw error
      }

      // Update local state to reflect database changes
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.vendor?.id === vendorId
            ? {
                ...user,
                vendor: user.vendor ? {
                  ...user.vendor,
                  status,
                  approved_at: status === 'approved' ? new Date().toISOString() : null,
                  updated_at: new Date().toISOString()
                } : undefined,
                isVerified: status === 'approved'
              }
            : user
        )
      )

      setSelectedUser(null)
      console.log(`Vendor ${vendorId} ${status} successfully`)
    } catch (error) {
      console.error('Error updating vendor status:', error)
      // You could add a toast notification here for user feedback
    }
  }

  const updateUserStatus = async (userId: string, status: 'active' | 'suspended') => {
    try {
      // Update user status in database
      const { error } = await supabase
        .from('profiles')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        console.error('Database error updating user status:', error)
        throw error
      }

      // Update local state to reflect database changes
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.profile.id === userId
            ? {
                ...user,
                profile: {
                  ...user.profile,
                  status,
                  updated_at: new Date().toISOString()
                }
              }
            : user
        )
      )

      setSelectedUser(null)
      console.log(`User ${userId} ${status} successfully`)
    } catch (error) {
      console.error('Error updating user status:', error)
      // You could add a toast notification here for user feedback
    }
  }

  const openSuspendModal = (type: 'vendor' | 'user', id: string, name: string) => {
    setSuspendTarget({ type, id, name })
    setSuspendPeriod('1week')
    setShowSuspendModal(true)
  }

  const handleSuspendConfirm = async () => {
    if (!suspendTarget) return

    try {
      const now = new Date()
      let suspensionEndAt: Date | null = null

      // Calculate suspension end date based on period
      switch (suspendPeriod) {
        case '1day':
          suspensionEndAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          break
        case '1week':
          suspensionEndAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          break
        case '1month':
          suspensionEndAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          break
        case 'permanent':
          suspensionEndAt = null
          break
      }

      if (suspendTarget.type === 'vendor') {
        // Update vendor status
        const { error } = await supabase
          .from('vendors')
          .update({
            status: 'suspended',
            updated_at: now.toISOString()
          })
          .eq('id', suspendTarget.id)

        if (error) throw error

        // Update local state
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.vendor?.id === suspendTarget!.id
              ? {
                  ...user,
                  vendor: user.vendor ? {
                    ...user.vendor,
                    status: 'suspended',
                    updated_at: now.toISOString()
                  } : undefined
                }
              : user
          )
        )
      } else {
        // Update user status with suspension details
        const { error } = await supabase
          .from('profiles')
          .update({
            status: 'suspended',
            suspended_at: now.toISOString(),
            suspension_period: suspendPeriod,
            suspension_end_at: suspensionEndAt?.toISOString() || null,
            updated_at: now.toISOString()
          })
          .eq('id', suspendTarget.id)

        if (error) throw error

        // Update local state
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.profile.id === suspendTarget!.id
              ? {
                  ...user,
                  profile: {
                    ...user.profile,
                    status: 'suspended',
                    suspended_at: now.toISOString(),
                    suspension_period: suspendPeriod,
                    suspension_end_at: suspensionEndAt?.toISOString() || undefined,
                    updated_at: now.toISOString()
                  }
                }
              : user
          )
        )
      }

      setShowSuspendModal(false)
      setSuspendTarget(null)
      console.log(`${suspendTarget.type} ${suspendTarget.id} suspended successfully`)
    } catch (error) {
      console.error('Error suspending:', error)
    }
  }

  const assignCategoryToVendor = async (vendorId: string, categoryId: string) => {
    try {
      // For now, we'll store categories in local state
      // In a real implementation, this would update a vendor_categories table
      setVendorCategories(prev => ({
        ...prev,
        [vendorId]: [...(prev[vendorId] || []), categoryId]
      }))
      console.log(`Category ${categoryId} assigned to vendor ${vendorId}`)
    } catch (error) {
      console.error('Error assigning category to vendor:', error)
    }
  }

  const removeCategoryFromVendor = async (vendorId: string, categoryId: string) => {
    try {
      setVendorCategories(prev => ({
        ...prev,
        [vendorId]: (prev[vendorId] || []).filter(id => id !== categoryId)
      }))
      console.log(`Category ${categoryId} removed from vendor ${vendorId}`)
    } catch (error) {
      console.error('Error removing category from vendor:', error)
    }
  }

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true
    if (filter === 'tourist') return user.profile.role === 'tourist'
    if (filter === 'vendor') return user.profile.role === 'vendor'
    if (filter === 'pending') return user.vendor?.status === 'pending'
    if (filter === 'verified') return user.isVerified
    if (filter === 'rejected') return user.vendor?.status === 'rejected'
    if (filter === 'suspended') return user.vendor?.status === 'suspended' || user.profile.status === 'suspended'
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage users from the database - review profiles, verify vendors, and track registrations
            </p>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Users Table */}
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
          <button
            onClick={() => setFilter('suspended')}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              filter === 'suspended'
                ? 'bg-orange-600 text-white'
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            }`}
          >
            Suspended ({users.filter(u => u.vendor?.status === 'suspended' || u.profile.status === 'suspended').length})
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
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.profile.status === 'suspended' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                          {user.profile.status === 'suspended' ? 'Suspended' : 'Active'}
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
                      {user.vendor?.status === 'approved' && (
                        <button
                          onClick={() => user.vendor && openSuspendModal('vendor', user.vendor.id, user.vendor.business_name || user.profile.full_name || 'Vendor')}
                          className="text-orange-600 hover:text-orange-900"
                          title="Suspend"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                      {user.vendor?.status === 'suspended' && (
                        <button
                          onClick={() => user.vendor && updateVendorStatus(user.vendor.id, 'approved')}
                          className="text-green-600 hover:text-green-900"
                          title="Unsuspend"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      {user.profile.role === 'tourist' && user.profile.status !== 'suspended' && (
                        <button
                          onClick={() => openSuspendModal('user', user.profile.id, user.profile.full_name || 'User')}
                          className="text-orange-600 hover:text-orange-900"
                          title="Suspend User"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                      {user.profile.role === 'tourist' && user.profile.status === 'suspended' && (
                        <button
                          onClick={() => updateUserStatus(user.profile.id, 'active')}
                          className="text-green-600 hover:text-green-900"
                          title="Unsuspend User"
                        >
                          <Check className="h-4 w-4" />
                        </button>
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
                    <p><span className="font-medium">Status:</span> <span className={`capitalize ${selectedUser.profile.status === 'suspended' ? 'text-orange-600 font-semibold' : 'text-green-600'}`}>{selectedUser.profile.status || 'active'}</span></p>
                    <p><span className="font-medium">Joined:</span> {formatDate(selectedUser.profile.created_at)}</p>
                    {selectedUser.profile.status === 'suspended' && (
                      <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                        <p className="text-orange-800 text-sm">
                          <strong>Suspended:</strong> {selectedUser.profile.suspended_at ? formatDate(selectedUser.profile.suspended_at) : 'Unknown'}
                        </p>
                        {selectedUser.profile.suspension_period && (
                          <p className="text-orange-700 text-sm">
                            <strong>Period:</strong> {selectedUser.profile.suspension_period === 'permanent' ? 'Permanent' : selectedUser.profile.suspension_period}
                          </p>
                        )}
                        {selectedUser.profile.suspension_end_at && (
                          <p className="text-orange-700 text-sm">
                            <strong>Ends:</strong> {formatDate(selectedUser.profile.suspension_end_at)}
                          </p>
                        )}
                      </div>
                    )}
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

                {/* Category Management for Verified Vendors */}
                {selectedUser.vendor && selectedUser.vendor.status === 'approved' && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Service Categories</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Assigned Categories:</h5>
                        <div className="flex flex-wrap gap-2">
                          {(vendorCategories[selectedUser.vendor!.id] || []).map(categoryId => {
                            const category = categories.find(c => c.id === categoryId)
                            return category ? (
                              <span key={categoryId} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {category.name}
                                <button
                                  onClick={() => removeCategoryFromVendor(selectedUser.vendor!.id, categoryId)}
                                  className="ml-1 text-blue-600 hover:text-blue-800"
                                  title="Remove category"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ) : null
                          })}
                          {(vendorCategories[selectedUser.vendor!.id] || []).length === 0 && (
                            <p className="text-sm text-gray-500">No categories assigned</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Available Categories:</h5>
                        <div className="flex flex-wrap gap-2">
                          {categories
                            .filter(category => !(vendorCategories[selectedUser.vendor!.id] || []).includes(category.id))
                            .map(category => (
                              <button
                                key={category.id}
                                onClick={() => assignCategoryToVendor(selectedUser.vendor!.id, category.id)}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                title="Assign category"
                              >
                                + {category.name}
                              </button>
                            ))}
                        </div>
                      </div>
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

      {/* Suspension Confirmation Modal */}
      {showSuspendModal && suspendTarget && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Confirm Suspension</h3>
                <button
                  onClick={() => setShowSuspendModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Ban className="h-5 w-5 text-red-600 mr-2" />
                    <span className="text-gray-900 font-medium">Suspension Warning</span>
                  </div>
                  <p className="text-gray-700 text-sm mt-1">
                    You are about to suspend <strong>{suspendTarget.name}</strong>.
                    {suspendTarget.type === 'vendor' ? ' This vendor will not be able to access their account or services.' : ' This user will not be able to access their account.'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suspension Period
                  </label>
                  <select
                    value={suspendPeriod}
                    onChange={(e) => setSuspendPeriod(e.target.value as typeof suspendPeriod)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="1day">1 Day</option>
                    <option value="1week">1 Week</option>
                    <option value="1month">1 Month</option>
                    <option value="permanent">Permanent</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {suspendPeriod === 'permanent' ? 'Account will remain suspended until manually unsuspended by an admin.' : `Account will be automatically unsuspended after the selected period.`}
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowSuspendModal(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSuspendConfirm}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Confirm Suspension
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}