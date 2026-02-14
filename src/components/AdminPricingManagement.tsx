import { useState, useEffect } from 'react';
import {
  getActivePricingTiers,
  getVendorCountsByTier,
  createPricingTier,
  updatePricingTier,
  getAllServicePricingOverrides,
  createServicePricingOverride,
  updateServicePricingOverride,
  deleteServicePricingOverride,
  searchServices,
  PricingTier,
  ServicePricingOverride
} from '../lib/pricingService';

interface AdminPricingManagementProps {
  adminId: string;
}

export default function AdminPricingManagement({ adminId }: AdminPricingManagementProps) {
  const [activeTab, setActiveTab] = useState<'tiers' | 'overrides'>('tiers');
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [vendorCounts, setVendorCounts] = useState<Record<string, number>>({});
  const [allOverrides, setAllOverrides] = useState<ServicePricingOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTierModal, setShowTierModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [editingOverride, setEditingOverride] = useState<ServicePricingOverride | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [serviceSearchResults, setServiceSearchResults] = useState<any[]>([]);
  const [isSearchingServices, setIsSearchingServices] = useState(false);
  const [selectedService, setSelectedService] = useState<any | null>(null);

  // Form states
  const [tierForm, setTierForm] = useState({
    name: '',
    commission_type: 'percentage' as 'percentage' | 'flat',
    commission_value: 0,
    min_monthly_bookings: 0,
    min_rating: undefined as number | undefined,
    priority_order: 0,
    effective_from: new Date().toISOString().slice(0, 16), // datetime-local format
    effective_until: '',
    is_active: true
  });

  const [overrideForm, setOverrideForm] = useState({
    service_id: '',
    override_enabled: true,
    override_type: 'percentage' as 'percentage' | 'flat',
    override_value: 0,
    fee_payer: 'vendor' as 'vendor' | 'tourist' | 'shared',
    tourist_percentage: 0,
    vendor_percentage: 100,
    effective_from: new Date().toISOString().slice(0, 16), // datetime-local format
    effective_until: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  // Debounced service search
  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (serviceSearchTerm.trim()) {
        setIsSearchingServices(true);
        try {
          const results = await searchServices(serviceSearchTerm, 10);
          setServiceSearchResults(results);
        } catch (error) {
          console.error('Error searching services:', error);
          setServiceSearchResults([]);
        } finally {
          setIsSearchingServices(false);
        }
      } else {
        setServiceSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [serviceSearchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tiersData, vendorCountsData, allOverridesData] = await Promise.all([
        getActivePricingTiers(),
        getVendorCountsByTier(),
        getAllServicePricingOverrides()
      ]);

      // Remove duplicate tiers based on name, keeping the one with lowest priority_order (highest priority)
      const uniqueTiers = tiersData.reduce((acc, tier) => {
        const existing = acc.find(t => t.name === tier.name);
        if (!existing || tier.priority_order < existing.priority_order) {
          if (existing) {
            // Replace existing with higher priority (lower number)
            const index = acc.indexOf(existing);
            acc[index] = tier;
          } else {
            acc.push(tier);
          }
        }
        return acc;
      }, [] as PricingTier[]).sort((a, b) => a.priority_order - b.priority_order);

      setTiers(uniqueTiers);
      setVendorCounts(vendorCountsData);
      setAllOverrides(allOverridesData);
    } catch (error) {
      console.error('Error loading pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTier = async () => {
    try {
      await createPricingTier({
        ...tierForm,
        effective_until: tierForm.effective_until || undefined
      }, adminId);
      setShowTierModal(false);
      resetTierForm();
      loadData();
    } catch (error) {
      console.error('Error creating tier:', error);
    }
  };

  const handleUpdateTier = async () => {
    if (!editingTier) return;
    try {
      await updatePricingTier(editingTier.id, {
        ...tierForm,
        effective_until: tierForm.effective_until || undefined
      });
      setShowTierModal(false);
      setEditingTier(null);
      resetTierForm();
      loadData();
    } catch (error) {
      console.error('Error updating tier:', error);
    }
  };

  const handleCreateOverride = async () => {
    // Check if the service already has an override
    const existingOverride = allOverrides.find(override => override.service_id === overrideForm.service_id);
    if (existingOverride) {
      alert(`This service already has a pricing override. You can only edit the existing override, not create a new one.`);
      return;
    }

    // Validate fee_payer is one of the allowed values
    const validFeePayers = ['vendor', 'tourist', 'shared'];
    if (!validFeePayers.includes(overrideForm.fee_payer)) {
      alert(`Invalid fee payer: ${overrideForm.fee_payer}. Must be one of: ${validFeePayers.join(', ')}`);
      return;
    }

    try {
      // Normalize payload fields before sending
      const payload = {
        ...overrideForm,
        fee_payer: String(overrideForm.fee_payer).trim().toLowerCase(),
        override_value: Number(overrideForm.override_value) || 0,
        tourist_percentage: typeof overrideForm.tourist_percentage === 'number' ? Number(overrideForm.tourist_percentage) : (overrideForm.tourist_percentage ? Number(overrideForm.tourist_percentage) : 0),
        vendor_percentage: typeof overrideForm.vendor_percentage === 'number' ? Number(overrideForm.vendor_percentage) : (overrideForm.vendor_percentage ? Number(overrideForm.vendor_percentage) : 100),
        effective_from: new Date(overrideForm.effective_from).toISOString(),
        effective_until: overrideForm.effective_until ? new Date(overrideForm.effective_until).toISOString() : undefined
      } as any;

      await createServicePricingOverride(payload, adminId);
      setShowOverrideModal(false);
      resetOverrideForm();
      loadData();
    } catch (error) {
      // Log detailed error for debugging
      console.error('Error creating override:', error);
      try {
        console.error('Error (stringified):', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        // ignore stringify errors
      }
      // Provide a visible alert so devs can see the error in the browser
      if ((error as any)?.message) {
        // eslint-disable-next-line no-alert
        alert(`Error creating override: ${(error as any).message}`);
      } else {
        // eslint-disable-next-line no-alert
        alert('Error creating override. See console for details.');
      }
    }
  };

  const handleUpdateOverride = async () => {
    if (!editingOverride) return;

    // Validate fee_payer is one of the allowed values
    const validFeePayers = ['vendor', 'tourist', 'shared'];
    if (!validFeePayers.includes(overrideForm.fee_payer)) {
      alert(`Invalid fee payer: ${overrideForm.fee_payer}. Must be one of: ${validFeePayers.join(', ')}`);
      return;
    }

    try {
      // Normalize payload fields before sending
      const payload = {
        ...overrideForm,
        fee_payer: String(overrideForm.fee_payer).trim().toLowerCase(),
        override_value: Number(overrideForm.override_value) || 0,
        tourist_percentage: typeof overrideForm.tourist_percentage === 'number' ? Number(overrideForm.tourist_percentage) : (overrideForm.tourist_percentage ? Number(overrideForm.tourist_percentage) : 0),
        vendor_percentage: typeof overrideForm.vendor_percentage === 'number' ? Number(overrideForm.vendor_percentage) : (overrideForm.vendor_percentage ? Number(overrideForm.vendor_percentage) : 100),
        effective_from: new Date(overrideForm.effective_from).toISOString(),
        effective_until: overrideForm.effective_until ? new Date(overrideForm.effective_until).toISOString() : undefined
      } as any;

      await updateServicePricingOverride(editingOverride.id, payload);
      setShowOverrideModal(false);
      setEditingOverride(null);
      resetOverrideForm();
      loadData();
    } catch (error) {
      console.error('Error updating override:', error);
    }
  };

  const handleDeleteOverride = async (overrideId: string) => {
    if (!confirm('Are you sure you want to delete this pricing override?')) return;
    try {
      await deleteServicePricingOverride(overrideId);
      loadData();
    } catch (error) {
      console.error('Error deleting override:', error);
    }
  };

  const resetTierForm = () => {
    setTierForm({
      name: '',
      commission_type: 'percentage',
      commission_value: 0,
      min_monthly_bookings: 0,
      min_rating: undefined,
      priority_order: 0,
      effective_from: new Date().toISOString().slice(0, 16), // datetime-local format
      effective_until: '',
      is_active: true
    });
  };

  const resetOverrideForm = () => {
    setOverrideForm({
      service_id: '',
      override_enabled: true,
      override_type: 'percentage',
      override_value: 0,
      fee_payer: 'vendor',
      tourist_percentage: 0,
      vendor_percentage: 100,
      effective_from: new Date().toISOString().slice(0, 16), // datetime-local format
      effective_until: ''
    });
    setServiceSearchTerm('');
    setServiceSearchResults([]);
    setSelectedService(null);
  };

  const handleServiceSelect = (service: any) => {
    setSelectedService(service);
    setServiceSearchTerm(`${service.title} (${service.id})`);
    setOverrideForm({...overrideForm, service_id: service.id});
    setServiceSearchResults([]);
  };

  const openTierModal = (tier?: PricingTier) => {
    if (tier) {
      setEditingTier(tier);
      setTierForm({
        name: tier.name,
        commission_type: tier.commission_type,
        commission_value: tier.commission_value,
        min_monthly_bookings: tier.min_monthly_bookings,
        min_rating: tier.min_rating,
        priority_order: tier.priority_order,
        effective_from: tier.effective_from.slice(0, 16), // Convert to datetime-local format
        effective_until: tier.effective_until ? tier.effective_until.slice(0, 16) : '',
        is_active: tier.is_active
      });
    } else {
      resetTierForm();
      setEditingTier(null);
    }
    setShowTierModal(true);
  };

  const openOverrideModal = (override?: ServicePricingOverride) => {
    if (override) {
      setEditingOverride(override);
      // Ensure fee_payer is valid, default to 'vendor' if invalid
      const validFeePayers = ['vendor', 'tourist', 'shared'];
      const feePayer = validFeePayers.includes(override.fee_payer) ? override.fee_payer : 'vendor';

      setOverrideForm({
        service_id: override.service_id,
        override_enabled: override.override_enabled,
        override_type: override.override_type,
        override_value: override.override_value,
        fee_payer: feePayer as 'vendor' | 'tourist' | 'shared',
        tourist_percentage: override.tourist_percentage ?? 0,
        vendor_percentage: override.vendor_percentage ?? 100,
        effective_from: override.effective_from.slice(0, 16), // Convert to datetime-local format
        effective_until: override.effective_until ? override.effective_until.slice(0, 16) : ''
      });
      // Set the service ID as the search term for editing
      setServiceSearchTerm(override.service_id);
      setSelectedService(null); // Clear selected service since we don't have full details
    } else {
      resetOverrideForm();
      setEditingOverride(null);
    }
    setShowOverrideModal(true);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading pricing data...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('tiers')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'tiers'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Pricing Tiers
        </button>
        <button
          onClick={() => setActiveTab('overrides')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'overrides'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Service Overrides
        </button>
      </div>

      {/* Pricing Tiers Tab */}
      {activeTab === 'tiers' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Pricing Tiers</h2>
            <button
              onClick={() => openTierModal()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Create New Tier
            </button>
          </div>

          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requirements
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Vendors
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tiers.map((tier) => (
                  <tr key={tier.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{tier.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {tier.commission_type === 'flat'
                          ? `$${tier.commission_value}`
                          : `${tier.commission_value}%`
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {tier.min_monthly_bookings} bookings/month
                        {tier.min_rating && `, ${tier.min_rating}★ rating`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        tier.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {tier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {vendorCounts[tier.id] || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openTierModal(tier)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Service Overrides Tab */}
      {activeTab === 'overrides' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Service Pricing Overrides</h2>
            <button
              onClick={() => openOverrideModal()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Create Override
            </button>
          </div>

          {/* Service ID Input - Optional filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Service ID (optional - leave empty to show all overrides)
            </label>
            <input
              type="text"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              onBlur={loadData}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter service ID to filter overrides, or leave empty to show all"
            />
          </div>

          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Override
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fee Payer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Effective Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allOverrides.map((override) => (
                  <tr key={override.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {(override as any).services?.title || override.service_id}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(override as any).services?.vendors?.business_name && `by ${(override as any).services.vendors.business_name}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {override.override_type === 'flat'
                          ? `$${override.override_value}`
                          : `${override.override_value}%`
                        }
                      </div>
                      <div className="text-xs text-gray-500">
                        {override.override_enabled ? 'Enabled' : 'Disabled'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        override.fee_payer === 'vendor'
                          ? 'bg-blue-100 text-blue-800'
                          : override.fee_payer === 'tourist'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {override.fee_payer === 'vendor' ? 'Vendor' : override.fee_payer === 'tourist' ? 'Tourist' : 'Shared'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(override.effective_from).toLocaleDateString()}
                        {override.effective_until && ` - ${new Date(override.effective_until).toLocaleDateString()}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openOverrideModal(override)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteOverride(override.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tier Modal */}
      {showTierModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingTier ? 'Edit Pricing Tier' : 'Create Pricing Tier'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={tierForm.name}
                    onChange={(e) => setTierForm({...tierForm, name: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Commission Type</label>
                  <select
                    value={tierForm.commission_type}
                    onChange={(e) => setTierForm({...tierForm, commission_type: e.target.value as 'percentage' | 'flat'})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="flat">Flat Amount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Commission Value ({tierForm.commission_type === 'percentage' ? '%' : '$'})
                  </label>
                  <input
                    type="number"
                    value={tierForm.commission_value}
                    onChange={(e) => setTierForm({...tierForm, commission_value: parseFloat(e.target.value)})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Min Monthly Bookings</label>
                  <input
                    type="number"
                    value={tierForm.min_monthly_bookings}
                    onChange={(e) => setTierForm({...tierForm, min_monthly_bookings: parseInt(e.target.value)})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Min Rating (optional)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tierForm.min_rating || ''}
                    onChange={(e) => setTierForm({...tierForm, min_rating: e.target.value ? parseFloat(e.target.value) : undefined})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority Order</label>
                  <input
                    type="number"
                    value={tierForm.priority_order}
                    onChange={(e) => setTierForm({...tierForm, priority_order: parseInt(e.target.value)})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Effective From</label>
                  <input
                    type="datetime-local"
                    value={tierForm.effective_from}
                    onChange={(e) => setTierForm({...tierForm, effective_from: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Effective Until (optional)</label>
                  <input
                    type="datetime-local"
                    value={tierForm.effective_until}
                    onChange={(e) => setTierForm({...tierForm, effective_until: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={tierForm.is_active}
                    onChange={(e) => setTierForm({...tierForm, is_active: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">Active</label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowTierModal(false);
                    setEditingTier(null);
                    resetTierForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={editingTier ? handleUpdateTier : handleCreateTier}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  {editingTier ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingOverride ? 'Edit Service Override' : 'Create Service Override'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Service ID</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={serviceSearchTerm}
                      onChange={(e) => {
                        setServiceSearchTerm(e.target.value);
                        // Clear selection if user is typing manually
                        if (selectedService && e.target.value !== `${selectedService.title} (${selectedService.id})`) {
                          setSelectedService(null);
                          setOverrideForm({...overrideForm, service_id: e.target.value});
                        }
                      }}
                      placeholder="Search by service name or ID..."
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {isSearchingServices && (
                      <div className="absolute right-3 top-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                    {serviceSearchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {serviceSearchResults.map((service) => (
                          <div
                            key={service.id}
                            onClick={() => handleServiceSelect(service)}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{service.title}</div>
                            <div className="text-sm text-gray-500">
                              ID: {service.id} • Vendor: {service.vendors?.business_name} • Category: {service.service_categories?.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedService && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="text-sm">
                        <span className="font-medium">Selected:</span> {selectedService.title}
                        <br />
                        <span className="text-gray-600">Vendor: {selectedService.vendors?.business_name}</span>
                      </div>
                      {allOverrides.some(override => override.service_id === selectedService.id) && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                          ⚠️ This service already has a pricing override. You can only edit the existing override, not create a new one.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Override Type</label>
                  <select
                    value={overrideForm.override_type}
                    onChange={(e) => setOverrideForm({...overrideForm, override_type: e.target.value as 'percentage' | 'flat'})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="flat">Flat Amount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Override Value ({overrideForm.override_type === 'percentage' ? '%' : '$'})
                  </label>
                  <input
                    type="number"
                    value={overrideForm.override_value}
                    onChange={(e) => setOverrideForm({...overrideForm, override_value: parseFloat(e.target.value)})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fee Payer</label>
                  <select
                    value={overrideForm.fee_payer}
                    onChange={(e) => {
                      const newFeePayer = e.target.value as 'vendor' | 'tourist' | 'shared';
                      let touristPercentage = overrideForm.tourist_percentage;
                      let vendorPercentage = overrideForm.vendor_percentage;

                      // Set default percentages for shared fees
                      if (newFeePayer === 'shared' && overrideForm.fee_payer !== 'shared') {
                        touristPercentage = 50;
                        vendorPercentage = 50;
                      } else if (newFeePayer !== 'shared') {
                        touristPercentage = 0;
                        vendorPercentage = 100;
                      }

                      setOverrideForm({
                        ...overrideForm,
                        fee_payer: newFeePayer,
                        tourist_percentage: touristPercentage,
                        vendor_percentage: vendorPercentage
                      });
                    }}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="vendor">Vendor</option>
                    <option value="tourist">Tourist</option>
                    <option value="shared">Shared</option>
                  </select>
                </div>

                {overrideForm.fee_payer === 'shared' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tourist Fee Percentage (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={isNaN(overrideForm.tourist_percentage) ? '' : overrideForm.tourist_percentage}
                        onChange={(e) => {
                          const touristPct = parseFloat(e.target.value) || 0;
                          const vendorPct = 100 - touristPct;
                          setOverrideForm({
                            ...overrideForm,
                            tourist_percentage: touristPct,
                            vendor_percentage: vendorPct
                          });
                        }}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Tourist pays {overrideForm.tourist_percentage}% of the fee</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Vendor Fee Percentage (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={isNaN(overrideForm.vendor_percentage) ? '' : overrideForm.vendor_percentage}
                        onChange={(e) => {
                          const vendorPct = parseFloat(e.target.value) || 0;
                          const touristPct = 100 - vendorPct;
                          setOverrideForm({
                            ...overrideForm,
                            tourist_percentage: touristPct,
                            vendor_percentage: vendorPct
                          });
                        }}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Vendor pays {overrideForm.vendor_percentage}% of the fee</p>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Effective From</label>
                  <input
                    type="datetime-local"
                    value={overrideForm.effective_from}
                    onChange={(e) => setOverrideForm({...overrideForm, effective_from: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Effective Until (optional)</label>
                  <input
                    type="datetime-local"
                    value={overrideForm.effective_until}
                    onChange={(e) => setOverrideForm({...overrideForm, effective_until: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={overrideForm.override_enabled}
                    onChange={(e) => setOverrideForm({...overrideForm, override_enabled: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">Override Enabled</label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowOverrideModal(false);
                    setEditingOverride(null);
                    resetOverrideForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={editingOverride ? handleUpdateOverride : handleCreateOverride}
                  disabled={!editingOverride && selectedService && allOverrides.some(override => override.service_id === selectedService.id)}
                  className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md ${
                    !editingOverride && selectedService && allOverrides.some(override => override.service_id === selectedService.id)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {editingOverride ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}