import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useServices } from '../../hooks/hook';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import { useEffect, useState } from 'react';
import { getPendingServices, removePendingService, type PendingServiceRecord } from '../../store/adminStore';
import { updateService as vendorUpdateService } from '../../store/vendorStore';

export function Services() {
  const { services, loading, error, updateServiceStatus } = useServices();
  const [pending, setPending] = useState<PendingServiceRecord[]>([]);

  const refreshPending = () => setPending(getPendingServices());

  useEffect(() => {
    refreshPending();
  }, []);

  const approvePending = (rec: PendingServiceRecord) => {
    vendorUpdateService(rec.vendor_id, rec.service_id, { status: 'approved' });
    removePendingService(rec.vendor_id, rec.service_id);
    refreshPending();
  };

  const rejectPending = (rec: PendingServiceRecord) => {
    vendorUpdateService(rec.vendor_id, rec.service_id, { status: 'rejected' });
    removePendingService(rec.vendor_id, rec.service_id);
    refreshPending();
  };

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Service Management</h1>
        <div className="flex space-x-4 text-sm">
          <span className="text-yellow-600">Pending: {pendingServices.length}</span>
          <span className="text-green-600">Approved: {approvedServices.length}</span>
          <span className="text-red-600">Rejected: {rejectedServices.length}</span>
        </div>
      </div>

      {/* Vendor Submissions Pending Approval */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Vendor Submissions Pending Approval</h3>
            <button onClick={refreshPending} className="text-sm text-gray-600 hover:text-gray-900">Refresh</button>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-gray-500">No pending submissions from vendors.</p>
          ) : (
            <div className="space-y-3">
              {pending.map((rec) => (
                <div key={`${rec.vendor_id}:${rec.service_id}`} className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{rec.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{rec.category.replace('_',' ')} • {formatCurrency(rec.price, rec.currency)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => approvePending(rec)} className="inline-flex items-center px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700">
                      <CheckIcon className="h-4 w-4 mr-1" /> Approve
                    </button>
                    <button onClick={() => rejectPending(rec)} className="inline-flex items-center px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700">
                      <XMarkIcon className="h-4 w-4 mr-1" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Services */}
      {pendingServices.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Pending Approval ({pendingServices.length})
            </h3>
            <div className="space-y-4">
              {pendingServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onApprove={() => updateServiceStatus(service.id, 'approved')}
                  onReject={() => updateServiceStatus(service.id, 'rejected')}
                  showActions
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All Services */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">All Services</h3>
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
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{service.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {service.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {service.vendor?.business_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {service.vendor?.location}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {service.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(service.price, service.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={service.status} variant="small" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={service.availability_status} variant="small" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ServiceCardProps {
  service: any;
  onApprove?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}

function ServiceCard({ service, onApprove, onReject, showActions }: ServiceCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="text-lg font-medium text-gray-900">{service.name}</h4>
          <p className="text-sm text-gray-600 mt-1">{service.description}</p>
          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
            <span>Vendor: {service.vendor?.business_name}</span>
            <span>Category: {service.category.replace('_', ' ')}</span>
            <span>Price: {formatCurrency(service.price, service.currency)}</span>
          </div>
        </div>
        {showActions && (
          <div className="flex space-x-2 ml-4">
            <button
              onClick={onApprove}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <CheckIcon className="h-4 w-4 mr-1" />
              Approve
            </button>
            <button
              onClick={onReject}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}