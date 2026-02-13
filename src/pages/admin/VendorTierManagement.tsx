import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminPricingManagement from '../../components/AdminPricingManagement';

const VendorTierManagement: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You must be logged in as an admin to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pricing Management</h1>
          <p className="mt-2 text-gray-600">
            Manage pricing tiers and service-level overrides for the flexible pricing system.
          </p>
        </div>

        <AdminPricingManagement adminId={user.id} />
      </div>
    </div>
  );
};

export default VendorTierManagement;