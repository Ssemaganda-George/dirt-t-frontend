import { useEffect, useState } from 'react'
import { formatDate, getStatusColor } from '../../lib/utils'
import { Check, X, Eye, Store } from 'lucide-react'

// Mock data types
interface Profile {
  full_name: string
  email: string
  phone: string
}

interface Vendor {
  id: string
  business_name: string
  business_description: string
  business_address: string
  business_phone: string
  business_email: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  approved_at: string | null
  profiles: Profile
}

// Mock data
const mockVendors: Vendor[] = [
  {
    id: '1',
    business_name: 'Fresh Foods Market',
    business_description: 'Local organic produce and fresh groceries for the community',
    business_address: '123 Market Street, Downtown',
    business_phone: '+256-700-123456',
    business_email: 'contact@freshfoods.ug',
    status: 'pending',
    created_at: '2025-08-10T10:00:00Z',
    approved_at: null,
    profiles: {
      full_name: 'John Mukasa',
      email: 'john.mukasa@email.com',
      phone: '+256-700-123456'
    }
  },
  {
    id: '2',
    business_name: 'Tech Solutions Hub',
    business_description: 'Technology services and computer repair solutions',
    business_address: '456 Technology Avenue, Kampala',
    business_phone: '+256-700-654321',
    business_email: 'info@techsolutions.ug',
    status: 'approved',
    created_at: '2025-08-08T14:30:00Z',
    approved_at: '2025-08-09T09:15:00Z',
    profiles: {
      full_name: 'Sarah Nakato',
      email: 'sarah.nakato@email.com',
      phone: '+256-700-654321'
    }
  },
  {
    id: '3',
    business_name: 'Craft & Design Studio',
    business_description: 'Handmade crafts and custom design services',
    business_address: '789 Arts District, Entebbe',
    business_phone: '+256-700-987654',
    business_email: 'hello@craftdesign.ug',
    status: 'rejected',
    created_at: '2025-08-05T16:45:00Z',
    approved_at: null,
    profiles: {
      full_name: 'Peter Ssemakula',
      email: 'peter.ssemakula@email.com',
      phone: '+256-700-987654'
    }
  }
]

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Sort by created_at descending (newest first)
      const sortedVendors = [...mockVendors].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      setVendors(sortedVendors)
    } catch (error) {
      console.error('Error fetching vendors:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateVendorStatus = async (vendorId: string, status: 'approved' | 'rejected') => {
    try {
      // Update local state
      setVendors(prevVendors => 
        prevVendors.map(vendor => 
          vendor.id === vendorId 
            ? {
                ...vendor,
                status,
                approved_at: status === 'approved' ? new Date().toISOString() : null
              }
            : vendor
        )
      )
      
      setSelectedVendor(null)
    } catch (error) {
      console.error('Error updating vendor status:', error)
    }
  }

  const filteredVendors = vendors.filter(vendor => {
    if (filter === 'all') return true
    return vendor.status === filter
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
        <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage vendor registrations and approvals
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex space-x-4">
          {['all', 'pending', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== 'all' && (
                <span className="ml-2 bg-white px-2 py-1 rounded-full text-xs">
                  {vendors.filter(v => v.status === status).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Vendors List */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                          <Store className="h-5 w-5 text-primary-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {vendor.business_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {vendor.business_description?.substring(0, 50)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{vendor.profiles?.full_name}</div>
                    <div className="text-sm text-gray-500">{vendor.profiles?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vendor.status)}`}>
                      {vendor.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(vendor.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedVendor(vendor)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {vendor.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateVendorStatus(vendor.id, 'approved')}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => updateVendorStatus(vendor.id, 'rejected')}
                            className="text-red-600 hover:text-red-900"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor Details Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Vendor Details</h3>
                <button
                  onClick={() => setSelectedVendor(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Business Information</h4>
                  <div className="mt-2 space-y-2">
                    <p><span className="font-medium">Name:</span> {selectedVendor.business_name}</p>
                    <p><span className="font-medium">Description:</span> {selectedVendor.business_description}</p>
                    <p><span className="font-medium">Address:</span> {selectedVendor.business_address}</p>
                    <p><span className="font-medium">Phone:</span> {selectedVendor.business_phone}</p>
                    <p><span className="font-medium">Email:</span> {selectedVendor.business_email}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">Owner Information</h4>
                  <div className="mt-2 space-y-2">
                    <p><span className="font-medium">Name:</span> {selectedVendor.profiles?.full_name}</p>
                    <p><span className="font-medium">Email:</span> {selectedVendor.profiles?.email}</p>
                    <p><span className="font-medium">Phone:</span> {selectedVendor.profiles?.phone}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">Status</h4>
                  <div className="mt-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedVendor.status)}`}>
                      {selectedVendor.status}
                    </span>
                  </div>
                </div>

                {selectedVendor.status === 'pending' && (
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => updateVendorStatus(selectedVendor.id, 'approved')}
                      className="btn-primary flex items-center"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </button>
                    <button
                      onClick={() => updateVendorStatus(selectedVendor.id, 'rejected')}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
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