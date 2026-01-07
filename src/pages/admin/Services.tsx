import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useServices, useServiceCategories, useServiceDeleteRequests } from '../../hooks/hook';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import { useState } from 'react';

export function Services() {
  const { services, loading, error, updateServiceStatus } = useServices();
  const { categories } = useServiceCategories();
  const { deleteRequests, updateDeleteRequestStatus } = useServiceDeleteRequests();
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Error loading services: {error}</p>
      </div>
    );
  }

  const pendingServices = services.filter(service => service.status === 'pending');
  const approvedServices = services.filter(service => service.status === 'approved');
  const rejectedServices = services.filter(service => service.status === 'rejected');

  // Filter services based on selected category
  const filteredServices = selectedCategory === 'all' 
    ? services 
    : services.filter(service => service.category_id === selectedCategory);

  const filteredPendingServices = selectedCategory === 'all'
    ? pendingServices
    : pendingServices.filter(service => service.category_id === selectedCategory);

  const approveService = async (serviceId: string) => {
    setUpdatingStatus(serviceId);
    try {
      await updateServiceStatus(serviceId, 'approved');
    } catch (err) {
      console.error('Failed to approve service:', err);
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
      await updateDeleteRequestStatus(requestId, 'approved');
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

  const pendingDeleteRequests = deleteRequests.filter(request => request.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Service Management</h1>
        <div className="flex space-x-4 text-sm">
          <span className="text-yellow-600">Pending: {selectedCategory === 'all' ? pendingServices.length : filteredPendingServices.length}</span>
          <span className="text-green-600">Approved: {selectedCategory === 'all' ? approvedServices.length : filteredServices.filter(s => s.status === 'approved').length}</span>
          <span className="text-red-600">Rejected: {selectedCategory === 'all' ? rejectedServices.length : filteredServices.filter(s => s.status === 'rejected').length}</span>
          <span className="text-orange-600">Delete Requests: {pendingDeleteRequests.length}</span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                selectedCategory === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Services ({services.length})
            </button>
            {categories.map((category) => {
              const categoryServices = services.filter(service => service.category_id === category.id);
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    selectedCategory === category.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {category.name} ({categoryServices.length})
                </button>
              );
            })}
          </nav>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Availability
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{service.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {service.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {service.vendors?.business_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {service.location}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {service.service_categories?.name || service.category_id}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(service.price, service.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={service.status} variant="small" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {filteredPendingServices.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Pending Approval ({filteredPendingServices.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPendingServices.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{service.title}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {service.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {service.vendors?.business_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {service.location}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                          {service.service_categories?.name || service.category_id}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(service.price, service.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => approveService(service.id)}
                          disabled={updatingStatus === service.id}
                          className="inline-flex items-center px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckIcon className="h-4 w-4 mr-1" />
                          {updatingStatus === service.id ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => rejectService(service.id)}
                          disabled={updatingStatus === service.id}
                          className="inline-flex items-center px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          <XMarkIcon className="h-4 w-4 mr-1" />
                          {updatingStatus === service.id ? 'Rejecting...' : 'Reject'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Delete Requests Section */}
      {pendingDeleteRequests.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Pending Delete Requests ({pendingDeleteRequests.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingDeleteRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{request.service?.title}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {request.service?.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {request.vendor?.business_name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {request.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
          </div>
        </div>
      )}
    </div>
  );
}