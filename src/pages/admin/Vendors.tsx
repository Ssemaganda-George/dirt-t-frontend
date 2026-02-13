import { useEffect, useState } from 'react'
import { formatDate, getStatusColor } from '../../lib/utils'
import { Check, X, Eye, Store, UserCog } from 'lucide-react'
import { getAllVendors, updateVendorStatus, Vendor } from '../../lib/database'
import { getActiveTiers } from '../../lib/commissionService'
import { VendorTier } from '../../types'
import { supabase } from '../../lib/supabaseClient'

const getCurrentTierDisplay = (vendor: Vendor) => {
  if (vendor.manual_tier_id) {
    const tierName = vendor.manual_tier_id === '1' ? 'Bronze' : 
                    vendor.manual_tier_id === '2' ? 'Silver' : 'Gold';
    const isExpired = vendor.manual_tier_expires_at && new Date(vendor.manual_tier_expires_at) < new Date();
    return (
      <div className="flex flex-col">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          isExpired ? 'bg-gray-100 text-gray-600' : 'bg-purple-100 text-purple-800'
        }`}>
          {tierName} (Manual)
        </span>
        {vendor.manual_tier_expires_at && (
          <span className="text-xs text-gray-500 mt-1">
            Expires: {formatDate(vendor.manual_tier_expires_at)}
          </span>
        )}
      </div>
    );
  } else {
    const tierName = vendor.current_tier_id === '1' ? 'Bronze' : 
                    vendor.current_tier_id === '2' ? 'Silver' : 'Gold';
    return (
      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
        {tierName} (Auto)
      </span>
    );
  }
};

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [showTierModal, setShowTierModal] = useState(false)
  const [tierVendor, setTierVendor] = useState<Vendor | null>(null)
  const [availableTiers, setAvailableTiers] = useState<VendorTier[]>([])
  const [tierForm, setTierForm] = useState({
    tierId: '',
    expiresAt: '',
    reason: ''
  })

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

  const loadAvailableTiers = async () => {
    try {
      const tiers = await getActiveTiers()
      setAvailableTiers(tiers)
    } catch (error) {
      console.error('Error loading tiers:', error)
    }
  }

  const handleAssignTier = (vendor: Vendor) => {
    setTierVendor(vendor)
    setTierForm({
      tierId: vendor.manual_tier_id || '',
      expiresAt: vendor.manual_tier_expires_at ? new Date(vendor.manual_tier_expires_at).toISOString().split('T')[0] : '',
      reason: vendor.manual_tier_reason || ''
    })
    setShowTierModal(true)
    loadAvailableTiers()
  }

  const handleSaveTierAssignment = async () => {
    if (!tierVendor || !tierForm.tierId) return

    try {
      const updateData: any = {
        manual_tier_id: tierForm.tierId,
        manual_tier_assigned_at: new Date().toISOString(),
        manual_tier_reason: tierForm.reason || null
      }

      if (tierForm.expiresAt) {
        updateData.manual_tier_expires_at = new Date(tierForm.expiresAt).toISOString()
      } else {
        updateData.manual_tier_expires_at = null
      }

      // Update vendor with manual tier assignment
      const { error } = await supabase
        .from('vendors')
        .update(updateData)
        .eq('id', tierVendor.id)

      if (error) throw error

      // Update the vendor's current commission rate to match the assigned tier
      const selectedTier = availableTiers.find(t => t.id === tierForm.tierId)
      if (selectedTier) {
        await supabase
          .from('vendors')
          .update({
            current_commission_rate: selectedTier.commission_rate,
            current_tier_id: selectedTier.id
          })
          .eq('id', tierVendor.id)
      }

      await fetchVendors()
      setShowTierModal(false)
      setTierVendor(null)
    } catch (error) {
      console.error('Error saving tier assignment:', error)
    }
  }

  const handleRemoveManualTier = async (vendor: Vendor) => {
    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          manual_tier_id: null,
          manual_tier_assigned_at: null,
          manual_tier_expires_at: null,
          manual_tier_reason: null
        })
        .eq('id', vendor.id)

      if (error) throw error

      await fetchVendors()
    } catch (error) {
      console.error('Error removing manual tier:', error)
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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Vendors</h1>
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
                  ? 'bg-blue-50 text-blue-700'
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
                  Current Tier
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
                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Store className="h-5 w-5 text-blue-600" />
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getCurrentTierDisplay(vendor)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(vendor.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedVendor(vendor)}
                        className="text-blue-600 hover:text-blue-900"
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
                      <button
                        onClick={() => handleAssignTier(vendor)}
                        className="text-purple-600 hover:text-purple-900"
                        title="Assign Tier"
                      >
                        <UserCog className="h-4 w-4" />
                      </button>
                      {vendor.manual_tier_id && (
                        <button
                          onClick={() => handleRemoveManualTier(vendor)}
                          className="text-orange-600 hover:text-orange-900"
                          title="Remove Manual Tier"
                        >
                          <X className="h-4 w-4" />
                        </button>
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-xl rounded-xl bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Vendor Details</h3>
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

      {/* Tier Assignment Modal */}
      {showTierModal && tierVendor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-xl rounded-xl bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Assign Tier to {tierVendor.business_name}</h3>
                <button
                  onClick={() => setShowTierModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Tier
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    {getCurrentTierDisplay(tierVendor)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign New Tier
                  </label>
                  <select
                    value={tierForm.tierId}
                    onChange={(e) => setTierForm(prev => ({ ...prev, tierId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a tier...</option>
                    {availableTiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.name} ({tier.commission_rate}% commission)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={tierForm.expiresAt}
                    onChange={(e) => setTierForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty for permanent assignment
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Assignment
                  </label>
                  <textarea
                    value={tierForm.reason}
                    onChange={(e) => setTierForm(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Explain why this tier is being assigned..."
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-6">
                <button
                  onClick={handleSaveTierAssignment}
                  className="btn-primary flex items-center"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Assign Tier
                </button>
                <button
                  onClick={() => setShowTierModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}