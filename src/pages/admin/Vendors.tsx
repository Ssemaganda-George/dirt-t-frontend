import { useEffect, useState } from 'react'
import { formatDate, getStatusColor } from '../../lib/utils'
import { Check, X, Eye, Store } from 'lucide-react'
import { getAllVendors, updateVendorStatus, Vendor } from '../../lib/database'

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
      setLoading(true)
      const data = await getAllVendors()
      setVendors(data)
    } catch (error) {
      console.error('Error fetching vendors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateVendorStatus = async (vendorId: string, status: 'approved' | 'rejected') => {
    try {
      await updateVendorStatus(vendorId, status)
      // Refresh the vendors list
      await fetchVendors()
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
                      onClick={() => handleUpdateVendorStatus(selectedVendor.id, 'approved')}
                      className="btn-primary flex items-center"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleUpdateVendorStatus(selectedVendor.id, 'rejected')}
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