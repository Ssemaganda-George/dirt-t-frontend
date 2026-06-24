import { CheckIcon, XMarkIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { useServices, useServiceCategories, useServiceDeleteRequests } from '../../hooks/hook';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EditServiceModal } from '../../components/EditServiceModal';
import SearchBar from '../../components/SearchBar';
import { formatCurrencyWithConversion } from '../../lib/utils';
import { usePreferences } from '../../contexts/PreferencesContext';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { useState, useEffect } from 'react';
import { getAllVendors, createTicketType, updateTicketType, deleteTicketType } from '../../lib/database';
import { createServicePricingOverride } from '../../lib/pricingService';
import type { Service } from '../../types';

function formatServicePrice(service: Service, selectedCurrency: string, selectedLanguage: string) {
  const currency = service.currency || 'UGX';

  // For events/activities with ticket types, show ticket prices
  if (service.ticket_types && service.ticket_types.length > 0) {
    const ticketPrices = service.ticket_types
      .map((ticket: any) => Number(ticket?.price) || 0)
      .filter((price: number) => price > 0);
    
    if (ticketPrices.length > 0) {
      const minPrice = Math.min(...ticketPrices);
      const maxPrice = Math.max(...ticketPrices);
      
      if (minPrice === maxPrice) {
        return formatCurrencyWithConversion(minPrice, currency, selectedCurrency, selectedLanguage);
      } else {
        return `${formatCurrencyWithConversion(minPrice, currency, selectedCurrency, selectedLanguage)} - ${formatCurrencyWithConversion(maxPrice, currency, selectedCurrency, selectedLanguage)}`;
      }
    }
  }

  // Transport-specific rates
  const transportPrices = [service.price_within_town, service.price_upcountry]
    .map((price) => Number(price) || 0)
    .filter((price) => price > 0);

  if (transportPrices.length > 0) {
    const minPrice = Math.min(...transportPrices);
    const maxPrice = Math.max(...transportPrices);
    if (minPrice === maxPrice) {
      return formatCurrencyWithConversion(minPrice, currency, selectedCurrency, selectedLanguage);
    }
    return `${formatCurrencyWithConversion(minPrice, currency, selectedCurrency, selectedLanguage)} - ${formatCurrencyWithConversion(maxPrice, currency, selectedCurrency, selectedLanguage)}`;
  }

  // Restaurant or hotel price range text
  if (service.price_range) {
    return service.price_range;
  }

  // Fallback to the mainstream service price
  const price = Number(service.price) || 0;
  return formatCurrencyWithConversion(price, currency, selectedCurrency, selectedLanguage);
}

export function Services() {
  const { selectedCurrency, selectedLanguage } = usePreferences()
  const { services, loading, error, updateServiceStatus, updateService, deleteService } = useServices();
  // Helper to determine if a service should be auto-inactive
  function isPast24HoursAfterEvent(service: Service): boolean {
    const eventDateTimeStr = service.event_datetime || service.event_date;
    if (!eventDateTimeStr) return false;
    const eventDate = new Date(eventDateTimeStr);
    if (isNaN(eventDate.getTime())) return false;
    const now = new Date();
    return now.getTime() > eventDate.getTime() + 24 * 60 * 60 * 1000;
  }
  const { categories } = useServiceCategories();
  const { deleteRequests, error: deleteRequestsError, updateDeleteRequestStatus } = useServiceDeleteRequests();
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [vendors, setVendors] = useState<any[]>([]);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [approvingService, setApprovingService] = useState<Service | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{top: number; right: number} | null>(null);
  const [pricingOverride, setPricingOverride] = useState({
    enabled: false,
    override_type: 'percentage' as 'percentage' | 'flat',
    override_value: 0,
    fee_payer: 'vendor' as 'vendor' | 'tourist' | 'shared',
    tourist_percentage: 0,
    vendor_percentage: 100,
    effective_from: new Date().toISOString().slice(0, 16),
    effective_until: ''
  });

  console.log('Admin deleteRequests:', deleteRequests);
  console.log('Admin deleteRequests length:', deleteRequests?.length || 0);
  console.log('Admin deleteRequests error:', deleteRequestsError);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const vendorData = await getAllVendors();
        setVendors(vendorData);
      } catch (error) {
        console.error('Error fetching vendors:', error);
      }
    };
    fetchVendors();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading services: {error}</p>
        </div>
        {/* Still show the services management interface even if delete requests fail */}
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Services Management</h3>
          </div>
          <div className="p-5">
            <p className="text-sm text-yellow-600">Services loaded, but delete requests are temporarily unavailable.</p>
          </div>
        </div>
      </div>
    );
  }

  if (deleteRequestsError) {
    console.warn('Delete requests error (non-blocking):', deleteRequestsError);
    // Show a warning but don't block the entire interface
  }

  const pendingServices = services.filter(service => service.status === 'pending');
  const approvedServices = services.filter(service => service.status === 'approved');
  const rejectedServices = services.filter(service => service.status === 'rejected');

  // Filter services based on selected category, vendor, and search query
  const categoryFilteredServices = selectedCategory === 'all' 
    ? services 
    : services.filter(service => service.category_id === selectedCategory);

  const vendorFilteredServices = selectedVendor === 'all'
    ? categoryFilteredServices
    : categoryFilteredServices.filter(service => service.vendor_id === selectedVendor);

  const filteredServices = searchQuery.trim() === ''
    ? vendorFilteredServices
    : vendorFilteredServices.filter(service =>
        service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.service_categories?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.vendors?.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.vendors?.business_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const categoryFilteredPendingServices = selectedCategory === 'all'
    ? pendingServices
    : pendingServices.filter(service => service.category_id === selectedCategory);

  const vendorFilteredPendingServices = selectedVendor === 'all'
    ? categoryFilteredPendingServices
    : categoryFilteredPendingServices.filter(service => service.vendor_id === selectedVendor);

  const filteredPendingServices = searchQuery.trim() === ''
    ? vendorFilteredPendingServices
    : vendorFilteredPendingServices.filter(service =>
        service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.service_categories?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.vendors?.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.vendors?.business_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const approveService = async (service: Service) => {
    setApprovingService(service);
    setIsApprovalModalOpen(true);
  };

  const handleServiceApproval = async () => {
    if (!approvingService) return;

    setUpdatingStatus(approvingService.id);
    try {
      // First approve the service
      await updateServiceStatus(approvingService.id, 'approved');

      // Then create pricing override if enabled
      if (pricingOverride.enabled) {
        await createServicePricingOverride({
          service_id: approvingService.id,
          override_enabled: true,
          override_type: pricingOverride.override_type,
          override_value: pricingOverride.override_value,
          fee_payer: pricingOverride.fee_payer,
          tourist_percentage: pricingOverride.fee_payer === 'shared' ? pricingOverride.tourist_percentage : undefined,
          vendor_percentage: pricingOverride.fee_payer === 'shared' ? pricingOverride.vendor_percentage : undefined,
          effective_from: pricingOverride.effective_from,
          effective_until: pricingOverride.effective_until || undefined
        }, 'admin'); // Using 'admin' as the creator
      }

      setIsApprovalModalOpen(false);
      setApprovingService(null);
      // Reset pricing override form
      setPricingOverride({
        enabled: false,
        override_type: 'percentage',
        override_value: 0,
        fee_payer: 'vendor',
        tourist_percentage: 0,
        vendor_percentage: 100,
        effective_from: new Date().toISOString().slice(0, 16),
        effective_until: ''
      });
    } catch (err) {
      console.error('Failed to approve service with pricing:', err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const rejectService = async (serviceId: string) => {
    setUpdatingStatus(serviceId);
    try {
      await updateServiceStatus(serviceId, 'rejected');
    } catch (err) {
      console.error('Failed to reject service:', err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const approveDeleteRequest = async (requestId: string) => {
    setUpdatingStatus(requestId);
    try {
      // Find the request to get the service ID
      const request = deleteRequests.find(r => r.id === requestId);
      if (!request) {
        throw new Error('Delete request not found');
      }

      // Approve the delete request
      await updateDeleteRequestStatus(requestId, 'approved');
      
      // Delete the actual service
      await deleteService(request.service_id);
      
      console.log('Successfully approved delete request and deleted service:', request.service_id);
    } catch (err) {
      console.error('Failed to approve delete request:', err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const rejectDeleteRequest = async (requestId: string) => {
    setUpdatingStatus(requestId);
    try {
      const reason = prompt('Reason for rejection:');
      if (reason) {
        await updateDeleteRequestStatus(requestId, 'rejected', reason);
      }
    } catch (err) {
      console.error('Failed to reject delete request:', err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditingService(null);
    setIsEditModalOpen(false);
    setSaveMessage(null);
  };

  const handleDeleteService = async (serviceId: string, serviceTitle: string) => {
    console.log('handleDeleteService called with:', { serviceId, serviceTitle });

    const confirmDelete = window.confirm(
      `Are you sure you want to delete the service "${serviceTitle}"? This action cannot be undone.`
    );

    if (!confirmDelete) {
      console.log('Delete cancelled by user');
      return;
    }

    console.log('Starting service deletion...');
    setUpdatingStatus(serviceId);
    try {
      console.log('Calling deleteService function...');
      await deleteService(serviceId);
      console.log('deleteService completed successfully');
      // The service will be automatically removed from the list by the useServices hook
    } catch (err) {
      console.error('Failed to delete service:', err);
      alert('Failed to delete service. Please try again.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleSaveService = async (updatedServiceData: Partial<Service>) => {
    if (!editingService) return;
    
    setUpdatingStatus(editingService.id);
    setSaveMessage(null); // Clear any previous messages
    
    try {
      // Persist ticket type changes (create/update/delete) separately
      try {
        const original = (editingService as any).ticket_types || [];
        const updated = (updatedServiceData as any).ticket_types;
        if (Array.isArray(updated)) {
          const removed = original.filter((o: any) => o.id && !updated.some((u: any) => u.id === o.id));
          for (const r of removed) {
            if (r.id) await deleteTicketType(r.id);
          }
          for (const t of updated) {
            const payload: any = {
              title: t.title,
              description: t.description,
              price: t.price,
              quantity: t.quantity,
              metadata: t.metadata,
              sale_start: t.sale_start,
              sale_end: t.sale_end
            };
            if (t.id) await updateTicketType(t.id, payload);
            else await createTicketType(editingService.id, payload);
          }
          delete (updatedServiceData as any).ticket_types;
        }
      } catch (ticketErr) {
        console.error('Failed to persist ticket types:', ticketErr);
      }

      await updateService(editingService.id, updatedServiceData);
      
      // Show success message
      setSaveMessage({ type: 'success', text: 'Service updated successfully!' });
      
    } catch (err) {
      console.error('Failed to update service:', err);
      setSaveMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'Failed to update service. Please try again.' 
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const pendingDeleteRequests = deleteRequests.filter(request => request.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Service Management</h1>
          <p className="text-sm text-slate-500 mt-1">Review, approve, and manage all platform services</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Pending: {selectedCategory === 'all' ? pendingServices.length : filteredPendingServices.length}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Approved: {selectedCategory === 'all' ? approvedServices.length : filteredServices.filter(s => s.status === 'approved').length}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            Rejected: {selectedCategory === 'all' ? rejectedServices.length : filteredServices.filter(s => s.status === 'rejected').length}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
            Delete: {deleteRequestsError ? '—' : pendingDeleteRequests.length}
          </span>
        </div>
      </div>

      {/* Search & Vendor Filter */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <SearchBar
                placeholder="Search services by title, description, category, or vendor..."
                onSearch={setSearchQuery}
                initialValue={searchQuery}
                className="max-w-md"
              />
            </div>
            <select
              id="vendor-filter"
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.business_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-4">
          <nav className="flex gap-1 overflow-x-auto py-2" aria-label="Category tabs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({selectedVendor === 'all' ? services.length : services.filter(s => s.vendor_id === selectedVendor).length})
            </button>
            {categories.map((category) => {
              const categoryServices = services.filter(service => service.category_id === category.id);
              const filteredCategoryServices = selectedVendor === 'all' 
                ? categoryServices 
                : categoryServices.filter(service => service.vendor_id === selectedVendor);
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {category.name} ({filteredCategoryServices.length})
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* All Services Table */}
      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">All Services</h3>
          <p className="text-xs text-slate-500 mt-0.5">{filteredServices.length} services found</p>
        </div>

        {/* Mobile card list */}
        <div className="block lg:hidden divide-y divide-slate-100">
          {filteredServices.map((service) => {
            const autoDeactivated = isPast24HoursAfterEvent(service);
            const isLive = service.status === 'approved' && !autoDeactivated;
            return (
              <div key={service.id} className="group cursor-pointer" onClick={() => handleEditService(service)}>
                {/* Banner */}
                <div className="relative h-32 overflow-hidden">
                  {((service as any).primary_image_url || (service as any).images?.[0]) ? (
                    <img src={(service as any).primary_image_url || (service as any).images![0]} alt={service.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 flex items-center justify-center text-3xl">
                      {(service.service_categories as any)?.icon || '📦'}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
                  <span className="absolute bottom-2 left-3 text-[11px] font-semibold text-white/90 bg-black/35 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-white/15">
                    {service.service_categories?.name || 'Service'}
                  </span>
                  <span className={`absolute top-2.5 right-3 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    isLive ? 'bg-emerald-500 text-white' :
                    service.status === 'rejected' ? 'bg-red-500 text-white' :
                    service.status === 'pending' ? 'bg-amber-400 text-white' :
                    'bg-slate-400 text-white'
                  }`}>
                    {isLive ? '● Live' : service.status === 'rejected' ? '✕ Rejected' : service.status === 'pending' ? '◑ Pending' : '○ Inactive'}
                  </span>
                </div>
                {/* Body */}
                <div className="px-4 pt-3 pb-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{service.title}</h3>
                      <p className="text-xs text-slate-500 truncate">{service.vendors?.business_name || 'Unknown'}</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 whitespace-nowrap shrink-0">{formatServicePrice(service, selectedCurrency, selectedLanguage)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                    {(service.status === 'approved' || service.status === 'inactive') ? (
                      <ToggleSwitch
                        checked={isLive}
                        onChange={async () => {
                          setUpdatingStatus(service.id);
                          try { await updateServiceStatus(service.id, service.status === 'approved' ? 'inactive' : 'approved'); }
                          catch (err) { console.error(err); alert('Failed to update.'); }
                          finally { setUpdatingStatus(null); }
                        }}
                        disabled={updatingStatus === service.id || autoDeactivated}
                        size="sm"
                        label={autoDeactivated ? 'Auto-off' : (isLive ? 'Active' : 'Inactive')}
                      />
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        {service.status === 'pending' ? 'Awaiting approval' : 'Rejected'}
                      </span>
                    )}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                          if (openMenuId === service.id) { setOpenMenuId(null); }
                          else { setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right }); setOpenMenuId(service.id); }
                        }}
                        onBlur={() => setTimeout(() => setOpenMenuId(null), 150)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <EllipsisVerticalIcon className="h-5 w-5" />
                      </button>
                      {openMenuId === service.id && menuPosition && (
                        <div style={{ position: 'fixed', top: menuPosition.top, right: menuPosition.right, zIndex: 9999 }}
                          className="w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-left">
                          <button onClick={() => { handleEditService(service); setOpenMenuId(null); }} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left">Edit</button>
                          {service.category_id === 'cat_activities' && (
                            <button
                              onClick={async () => { setOpenMenuId(null); setUpdatingStatus(service.id); try { await updateService(service.id, { scan_enabled: !service.scan_enabled } as any); } catch(e) {} finally { setUpdatingStatus(null); } }}
                              className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 text-left"
                            >
                              {service.scan_enabled ? 'Disable Scan Link' : 'Enable Scan Link'}
                            </button>
                          )}
                          <button onClick={() => { handleDeleteService(service.id, service.title); setOpenMenuId(null); }} className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left">Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{width:'36%'}} />
              <col style={{width:'20%'}} />
              <col style={{width:'14%'}} />
              <col style={{width:'18%'}} />
              <col style={{width:'12%'}} />
            </colgroup>
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Service</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.map((service) => (
                <tr key={service.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => handleEditService(service)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {((service as any).primary_image_url || (service as any).images?.[0]) ? (
                        <img
                          src={(service as any).primary_image_url || (service as any).images![0]}
                          alt={service.title}
                          className="w-14 h-11 rounded-lg object-cover flex-shrink-0 border border-slate-100"
                        />
                      ) : (
                        <div className="w-14 h-11 rounded-lg flex-shrink-0 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border border-slate-100 text-lg">
                          {(service.service_categories as any)?.icon || '📦'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{service.title}</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 mt-0.5">
                          {service.service_categories?.name || service.category_id}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-900 truncate">{service.vendors?.business_name || 'Unknown'}</p>
                    <p className="text-xs text-slate-500 truncate">{service.location}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-slate-900">{formatServicePrice(service, selectedCurrency, selectedLanguage)}</span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="space-y-1.5">
                      <StatusBadge status={service.status} variant="small" />
                      {(service.status === 'approved' || service.status === 'inactive') && (
                        <ToggleSwitch
                          checked={service.status === 'approved' && !isPast24HoursAfterEvent(service)}
                          onChange={async () => {
                            setUpdatingStatus(service.id);
                            try {
                              await updateServiceStatus(service.id, service.status === 'approved' ? 'inactive' : 'approved');
                            } catch (err) {
                              console.error('Failed to toggle service availability:', err);
                              alert('Failed to update service availability.');
                            } finally {
                              setUpdatingStatus(null);
                            }
                          }}
                          disabled={updatingStatus === service.id || isPast24HoursAfterEvent(service)}
                          size="sm"
                          label={isPast24HoursAfterEvent(service) ? 'Auto-off' : ''}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="relative inline-block">
                      <button
                        onClick={(e) => {
                          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                          if (openMenuId === service.id) {
                            setOpenMenuId(null);
                          } else {
                            setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                            setOpenMenuId(service.id);
                          }
                        }}
                        onBlur={() => setTimeout(() => setOpenMenuId(null), 150)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <EllipsisVerticalIcon className="h-5 w-5" />
                      </button>
                      {openMenuId === service.id && menuPosition && (
                        <div
                          style={{ position: 'fixed', top: menuPosition.top, right: menuPosition.right, zIndex: 9999 }}
                          className="w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-left"
                        >
                          <button
                            onClick={() => { handleEditService(service); setOpenMenuId(null); }}
                            className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                          >
                            Edit
                          </button>
                          {service.category_id === 'cat_activities' && (
                            <button
                              onClick={async () => {
                                setOpenMenuId(null);
                                setUpdatingStatus(service.id);
                                try {
                                  await updateService(service.id, { scan_enabled: !service.scan_enabled } as any);
                                } catch (err) {
                                  console.error('Failed to toggle scan_enabled:', err);
                                } finally {
                                  setUpdatingStatus(null);
                                }
                              }}
                              className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors text-left"
                            >
                              {service.scan_enabled ? 'Disable Scan Link' : 'Enable Scan Link'}
                            </button>
                          )}
                          <button
                            onClick={() => { handleDeleteService(service.id, service.title); setOpenMenuId(null); }}
                            className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {filteredPendingServices.length > 0 && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Pending Approval
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{filteredPendingServices.length} services awaiting review</p>
          </div>

          {/* Mobile pending cards */}
          <div className="block lg:hidden divide-y divide-slate-100">
            {filteredPendingServices.map((service) => (
              <div key={service.id} className="group">
                <div className="relative h-28 overflow-hidden">
                  {((service as any).primary_image_url || (service as any).images?.[0]) ? (
                    <img src={(service as any).primary_image_url || (service as any).images![0]} alt={service.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 flex items-center justify-center text-3xl">
                      {(service.service_categories as any)?.icon || '📦'}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
                  <span className="absolute bottom-2 left-3 text-[11px] font-semibold text-white/90 bg-black/35 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-white/15">
                    {service.service_categories?.name || 'Service'}
                  </span>
                  <span className="absolute top-2.5 right-3 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400 text-white">
                    ◑ Pending
                  </span>
                </div>
                <div className="px-4 pt-3 pb-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{service.title}</h3>
                      <p className="text-xs text-slate-500 truncate">{service.vendors?.business_name || 'Unknown'}</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 whitespace-nowrap shrink-0">{formatServicePrice(service, selectedCurrency, selectedLanguage)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveService(service)}
                      disabled={updatingStatus === service.id}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      <CheckIcon className="h-3.5 w-3.5" />
                      {updatingStatus === service.id ? 'Approving…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => rejectService(service.id)}
                      disabled={updatingStatus === service.id}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                      {updatingStatus === service.id ? 'Rejecting…' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop pending table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                  <col style={{width:'38%'}} />
                  <col style={{width:'20%'}} />
                  <col style={{width:'14%'}} />
                  <col style={{width:'28%'}} />
                </colgroup>
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Vendor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPendingServices.map((service) => (
                    <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {((service as any).primary_image_url || (service as any).images?.[0]) ? (
                            <img
                              src={(service as any).primary_image_url || (service as any).images![0]}
                              alt={service.title}
                              className="w-14 h-11 rounded-lg object-cover flex-shrink-0 border border-slate-100"
                            />
                          ) : (
                            <div className="w-14 h-11 rounded-lg flex-shrink-0 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border border-slate-100 text-lg">
                              {(service.service_categories as any)?.icon || '📦'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{service.title}</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 mt-0.5">
                              {service.service_categories?.name || service.category_id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-900 truncate">{service.vendors?.business_name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500 truncate">{service.location}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-slate-900">{formatServicePrice(service, selectedCurrency, selectedLanguage)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => approveService(service)}
                            disabled={updatingStatus === service.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            <CheckIcon className="h-3.5 w-3.5" />
                            {updatingStatus === service.id ? 'Approving…' : 'Approve'}
                          </button>
                          <button
                            onClick={() => rejectService(service.id)}
                            disabled={updatingStatus === service.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            <XMarkIcon className="h-3.5 w-3.5" />
                            {updatingStatus === service.id ? 'Rejecting…' : 'Reject'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
      )}

      {/* Delete Requests Section */}
      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Delete Requests
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{deleteRequestsError ? 'Temporarily unavailable' : `${pendingDeleteRequests.length} pending requests`}</p>
        </div>
        <div className="p-5">
          {deleteRequestsError ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                Delete requests are temporarily unavailable due to a permissions issue. 
                Please contact support or run the database migration to fix RLS policies.
              </p>
              <p className="text-yellow-700 text-sm mt-2">
                Error: {deleteRequestsError}
              </p>
            </div>
          ) : pendingDeleteRequests.length === 0 ? (
            <p className="text-slate-500 text-sm">No pending delete requests.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Availability</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Comments</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Requested</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {pendingDeleteRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-slate-900">{request.service?.title}</div>
                          <div className="text-sm text-slate-500 truncate max-w-xs">
                            {request.service?.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {request.vendor?.business_name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge
                          status={request.service && request.service.status === 'approved' && !isPast24HoursAfterEvent(request.service) ? 'available' : 'unavailable'}
                          variant="small"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {request.reason}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {request.admin_notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {new Date(request.requested_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => approveDeleteRequest(request.id)}
                          disabled={updatingStatus === request.id}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          title="Approve deletion"
                        >
                          <CheckIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => rejectDeleteRequest(request.id)}
                          disabled={updatingStatus === request.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title="Reject deletion"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <EditServiceModal
        service={editingService}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveService}
        isLoading={updatingStatus === editingService?.id}
        saveMessage={saveMessage}
      />

      {/* Service Approval Modal */}
      {isApprovalModalOpen && approvingService && (
        <div className="fixed inset-0 bg-slate-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                Approve Service: {approvingService.title}
              </h3>

              <div className="space-y-6">
                {/* Service Details */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-2">Service Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Vendor:</span> {approvingService.vendors?.business_name}
                    </div>
                    <div>
                      <span className="font-medium">Category:</span> {approvingService.service_categories?.name}
                    </div>
                    <div>
                      <span className="font-medium">Price:</span> {formatServicePrice(approvingService, selectedCurrency, selectedLanguage)}
                    </div>
                    <div>
                      <span className="font-medium">Currency:</span> {approvingService.currency}
                    </div>
                  </div>
                </div>

                {/* Pricing Override Configuration */}
                <div className="border-t pt-4">
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      checked={pricingOverride.enabled}
                      onChange={(e) => setPricingOverride({...pricingOverride, enabled: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                    />
                    <label className="ml-2 text-sm font-medium text-slate-700">
                      Configure pricing override for this service
                    </label>
                  </div>

                  {pricingOverride.enabled && (
                    <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Override Type</label>
                          <select
                            value={pricingOverride.override_type}
                            onChange={(e) => setPricingOverride({...pricingOverride, override_type: e.target.value as 'percentage' | 'flat'})}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="percentage">Percentage</option>
                            <option value="flat">Flat Amount</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700">
                            Override Value ({pricingOverride.override_type === 'percentage' ? '%' : `$${approvingService.currency}`})
                          </label>
                          <input
                            type="number"
                            value={pricingOverride.override_value}
                            onChange={(e) => setPricingOverride({...pricingOverride, override_value: parseFloat(e.target.value)})}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700">Fee Payer</label>
                        <select
                          value={pricingOverride.fee_payer}
                          onChange={(e) => {
                            const newFeePayer = e.target.value as 'vendor' | 'tourist' | 'shared';
                            let touristPercentage = pricingOverride.tourist_percentage;
                            let vendorPercentage = pricingOverride.vendor_percentage;

                            if (newFeePayer === 'shared' && pricingOverride.fee_payer !== 'shared') {
                              touristPercentage = 50;
                              vendorPercentage = 50;
                            } else if (newFeePayer !== 'shared') {
                              touristPercentage = 0;
                              vendorPercentage = 100;
                            }

                            setPricingOverride({
                              ...pricingOverride,
                              fee_payer: newFeePayer,
                              tourist_percentage: touristPercentage,
                              vendor_percentage: vendorPercentage
                            });
                          }}
                          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="vendor">Vendor</option>
                          <option value="tourist">Tourist</option>
                          <option value="shared">Shared</option>
                        </select>
                      </div>

                      {pricingOverride.fee_payer === 'shared' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700">Tourist Fee %</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={pricingOverride.tourist_percentage}
                              onChange={(e) => {
                                const touristPct = parseFloat(e.target.value) || 0;
                                const vendorPct = 100 - touristPct;
                                setPricingOverride({
                                  ...pricingOverride,
                                  tourist_percentage: touristPct,
                                  vendor_percentage: vendorPct
                                });
                              }}
                              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700">Vendor Fee %</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={pricingOverride.vendor_percentage}
                              onChange={(e) => {
                                const vendorPct = parseFloat(e.target.value) || 0;
                                const touristPct = 100 - vendorPct;
                                setPricingOverride({
                                  ...pricingOverride,
                                  tourist_percentage: touristPct,
                                  vendor_percentage: vendorPct
                                });
                              }}
                              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Effective From</label>
                          <input
                            type="datetime-local"
                            value={pricingOverride.effective_from}
                            onChange={(e) => setPricingOverride({...pricingOverride, effective_from: e.target.value})}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700">Effective Until (optional)</label>
                          <input
                            type="datetime-local"
                            value={pricingOverride.effective_until}
                            onChange={(e) => setPricingOverride({...pricingOverride, effective_until: e.target.value})}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setIsApprovalModalOpen(false);
                    setApprovingService(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleServiceApproval}
                  disabled={updatingStatus === approvingService.id}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {updatingStatus === approvingService.id ? 'Approving...' : 'Approve Service'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}