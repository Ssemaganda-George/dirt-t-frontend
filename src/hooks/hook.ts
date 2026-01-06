import { useState, useEffect } from 'react';
import type { Service, Booking, Transaction } from '../types';
import { getServices, createService, updateService, deleteService } from '../lib/database';

// Placeholder hooks - to be updated later
export function useVendors() {
  return { vendors: [], loading: false, error: null, refetch: () => {}, updateVendorStatus: () => {} };
}

export function useBookings() {
  return { bookings: [] as Booking[], loading: false, error: null, refetch: () => {} };
}

export function useTransactions() {
  return { transactions: [] as Transaction[], loading: false, error: null, refetch: () => {} };
}

export function useServices(vendorId?: string) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getServices(vendorId);
      setServices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createNewService = async (serviceData: {
    vendor_id: string
    category_id: string;
    title: string;
    description: string;
    price: number;
    currency?: string;
    images?: string[];
    location?: string;
    duration_hours?: number;
    max_capacity?: number;
    amenities?: string[];

    // Hotel-specific fields
    room_types?: string[]
    check_in_time?: string
    check_out_time?: string
    star_rating?: number
    facilities?: string[]

    // Tour-specific fields
    itinerary?: string[]
    included_items?: string[]
    excluded_items?: string[]
  }) => {
    if (!vendorId) throw new Error('Vendor ID is required to create a service');
    
    try {
      setError(null);
      const newService = await createService(serviceData);
      setServices(prev => [newService, ...prev]);
      return newService;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create service');
      throw err;
    }
  };

  const updateServiceStatus = async (serviceId: string, status: Service['status']) => {
    try {
      setError(null);
      
      const updated = await updateService(serviceId, { status });
      setServices(prevServices => 
        prevServices.map(service => 
          service.id === serviceId ? updated : service
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service status');
    }
  };

  const updateExistingService = async (serviceId: string, updates: Partial<{
    title: string;
    description: string;
    price: number;
    currency: string;
    images: string[];
    location: string;
    duration_hours: number;
    max_capacity: number;
    amenities: string[];
    category_id: string;

    // Hotel-specific fields
    room_types?: string[]
    check_in_time?: string
    check_out_time?: string
    star_rating?: number
    facilities?: string[]

    // Tour-specific fields
    itinerary?: string[]
    included_items?: string[]
    excluded_items?: string[]
  }>) => {
    try {
      setError(null);
      const updated = await updateService(serviceId, updates);
      setServices(prevServices => 
        prevServices.map(service => 
          service.id === serviceId ? updated : service
        )
      );
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service');
      throw err;
    }
  };

  const removeService = async (serviceId: string) => {
    try {
      setError(null);
      await deleteService(serviceId);
      setServices(prev => prev.filter(s => s.id !== serviceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete service');
      throw err;
    }
  };

  useEffect(() => {
    fetchServices();
  }, [vendorId]);

  return { 
    services, 
    loading, 
    error, 
    refetch: fetchServices, 
    createService: createNewService,
    updateService: updateExistingService,
    updateServiceStatus,
    deleteService: removeService
  };
}

// Placeholder hooks - to be updated later
// export function useVendors() {
//   const [vendors, setVendors] = useState<Vendor[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   return { vendors, loading, error, refetch: () => {}, updateVendorStatus: () => {} };
// }

// export function useBookings() {
//   const [bookings, setBookings] = useState<Booking[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   return { bookings, loading, error, refetch: () => {} };
// }

// export function useTransactions() {
//   const [transactions, setTransactions] = useState<Transaction[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   return { transactions, loading, error, refetch: () => {} };
// }
