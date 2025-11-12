import { useState, useEffect } from 'react';
import type { Vendor, Service, Booking, Transaction } from '../types';

const mockVendors: Vendor[] = [
  {
    id: '1',
    user_id: 'u1',
    business_name: 'Safari Adventures Uganda',
    business_type: 'tour_package', 
    description: 'Professional safari and wildlife tour services across Uganda', 
    location: 'Kampala',
    contact_phone: '+256-700-111222', 
    contact_email: 'info@safariuganda.com', 
    business_license: 'UG-TOUR-001',
    status: 'approved',
    created_at: '2025-08-01T10:00:00Z',
    updated_at: '2025-08-02T09:15:00Z',
    user_profile: {
      id: 'p1',
      user_id: 'u1', 
      full_name: 'James Kato',
      phone: '+256-700-111222',
      profile_picture: 'https://example.com/james.jpg',
      created_at: '2025-08-01T10:00:00Z',
      updated_at: '2025-08-01T10:00:00Z'
    }
  },
  {
    id: '2',
    user_id: 'u2',
    business_name: 'Mountain View Lodge',
    business_type: 'hotel', 
    description: 'Eco-friendly lodge with stunning mountain views',
    location: 'Kabale',
    contact_phone: '+256-700-333444',
    contact_email: 'stay@mountainview.ug',
    status: 'pending',
    created_at: '2025-08-10T14:30:00Z',
    updated_at: '2025-08-10T14:30:00Z',
    user_profile: {
      id: 'p2',
      user_id: 'u2',
      full_name: 'Grace Namutebi',
      phone: '+256-700-333444',
      created_at: '2025-08-10T14:30:00Z',
      updated_at: '2025-08-10T14:30:00Z'
    }
  },
  {
    id: '3',
    user_id: 'u3',
    business_name: 'Cultural Arts Experience',
    business_type: 'guide', 
    description: 'Authentic cultural experiences and traditional crafts',
    location: 'Jinja',
    contact_phone: '+256-700-555666',
    contact_email: 'culture@artsexperience.ug',
    status: 'rejected',
    created_at: '2025-07-28T16:45:00Z',
    updated_at: '2025-07-30T11:20:00Z',
    user_profile: {
      id: 'p3',
      user_id: 'u3',
      full_name: 'Robert Ssemakula',
      phone: '+256-700-555666',
      created_at: '2025-07-28T16:45:00Z',
      updated_at: '2025-07-28T16:45:00Z'
    }
  }
];

const mockServices: Service[] = [
  {
    id: 's1',
    vendor_id: '1',
    name: 'Gorilla Trekking Experience',
    description: 'Once-in-a-lifetime gorilla trekking in Bwindi National Park',
    category: 'tour_package', 
    price: 80000,
    currency: 'UGx', 
    images: ['https://example.com/gorilla1.jpg', 'https://example.com/gorilla2.jpg'],
    availability_status: 'available', 
    status: 'approved',
    created_at: '2025-08-05T09:00:00Z',
    updated_at: '2025-08-06T10:30:00Z',
    vendor: {
      id: '1',
      user_id: 'u1',
      business_name: 'Safari Adventures Uganda',
      business_type: 'tour_package',
      description: 'Professional safari and wildlife tour services across Uganda',
      location: 'Kampala',
      contact_phone: '+256-700-111222',
      contact_email: 'info@safariuganda.com',
      status: 'approved',
      created_at: '2025-08-01T10:00:00Z',
      updated_at: '2025-08-02T09:15:00Z'
    }
  },
  {
    id: 's2',
    vendor_id: '2',
    name: 'Mountain Lodge Stay',
    description: 'Comfortable accommodation with mountain views and local cuisine',
    category: 'hotel', 
    price: 120000,
    currency: 'UGx',
    availability_status: 'available',
    status: 'pending',
    created_at: '2025-08-12T11:15:00Z',
    updated_at: '2025-08-12T11:15:00Z',
    vendor: {
      id: '2',
      user_id: 'u2',
      business_name: 'Mountain View Lodge',
      business_type: 'hotel',
      description: 'Eco-friendly lodge with stunning mountain views',
      location: 'Kabale',
      contact_phone: '+256-700-333444',
      contact_email: 'stay@mountainview.ug',
      status: 'pending',
      created_at: '2025-08-10T14:30:00Z',
      updated_at: '2025-08-10T14:30:00Z'
    }
  },
  {
    id: 's3',
    vendor_id: '3',
    name: 'Traditional Craft Workshop',
    description: 'Learn traditional Ugandan crafts from local artisans',
    category: 'guide', 
    price: 45000,
    currency: 'UGx',
    availability_status: 'available',
    status: 'approved',
    created_at: '2025-08-08T14:20:00Z',
    updated_at: '2025-08-09T09:45:00Z',
    vendor: {
      id: '3',
      user_id: 'u3',
      business_name: 'Cultural Arts Experience',
      business_type: 'guide',
      description: 'Authentic cultural experiences and traditional crafts',
      location: 'Jinja',
      contact_phone: '+256-700-555666',
      contact_email: 'culture@artsexperience.ug',
      status: 'rejected',
      created_at: '2025-07-28T16:45:00Z',
      updated_at: '2025-07-30T11:20:00Z'
    }
  }
];

const mockBookings: Booking[] = [
  {
    id: 'b1',
    service_id: 's1',
    tourist_id: 't1',
    booking_date: '2025-08-20',
    service_date: '2025-08-20', 
    guests: 2,
    total_amount: 1600.00,
    currency: 'UGx', 
    status: 'confirmed',
    payment_status: 'paid', 
    created_at: '2025-08-14T10:30:00Z',
    updated_at: '2025-08-14T10:30:00Z', 
    service: {
      id: 's1',
      vendor_id: '1',
      name: 'Gorilla Trekking Experience',
      description: 'Once-in-a-lifetime gorilla trekking in Bwindi National Park',
      category: 'tour_package',
      price: 800.00,
      currency: 'UGx',
      availability_status: 'available',
      status: 'approved',
      created_at: '2025-08-05T09:00:00Z',
      updated_at: '2025-08-06T10:30:00Z',
      vendor: {
        id: '1',
        user_id: 'u1',
        business_name: 'Safari Adventures Uganda',
        business_type: 'tour_package',
        description: 'Professional safari and wildlife tour services across Uganda',
        location: 'Kampala',
        contact_phone: '+256-700-111222',
        contact_email: 'info@safariuganda.com',
        status: 'approved',
        created_at: '2025-08-01T10:00:00Z',
        updated_at: '2025-08-02T09:15:00Z'
      }
    },
    tourist_profile: {
      id: 'tp1',
      user_id: 't1',
      full_name: 'Sarah Johnson',
      phone: '+1-555-0123',
      created_at: '2025-08-01T10:30:00Z',
      updated_at: '2025-08-01T10:30:00Z'
    }
  },
  {
    id: 'b2',
    service_id: 's2',
    tourist_id: 't2',
    booking_date: '2025-08-25',
    service_date: '2025-08-25',
    guests: 1,
    total_amount: 36000,
    currency: 'UGx',
    status: 'pending',
    payment_status: 'pending',
    created_at: '2025-08-13T16:45:00Z',
    updated_at: '2025-08-13T16:45:00Z',
    service: {
      id: 's2',
      vendor_id: '2',
      name: 'Mountain Lodge Stay',
      description: 'Comfortable accommodation with mountain views and local cuisine',
      category: 'hotel',
      price: 120000,
      currency: 'UGx',
      availability_status: 'available',
      status: 'pending',
      created_at: '2025-08-12T11:15:00Z',
      updated_at: '2025-08-12T11:15:00Z'
    },
    tourist_profile: {
      id: 'tp2',
      user_id: 't2',
      full_name: 'Michael Smith',
      phone: '+44-7700-900123',
      created_at: '2025-08-13T16:45:00Z',
      updated_at: '2025-08-13T16:45:00Z'
    }
  },
  {
    id: 'b3',
    service_id: 's3',
    tourist_id: 't3',
    booking_date: '2025-08-18',
    service_date: '2025-08-18',
    guests: 4,
    total_amount: 180000,
    currency: 'UGx',
    status: 'completed',
    payment_status: 'paid',
    created_at: '2025-08-11T08:20:00Z',
    updated_at: '2025-08-11T08:20:00Z',
    service: {
      id: 's3',
      vendor_id: '3',
      name: 'Traditional Craft Workshop',
      description: 'Learn traditional Ugandan crafts from local artisans',
      category: 'guide',
      price: 45000,
      currency: 'UGx',
      availability_status: 'available',
      status: 'approved',
      created_at: '2025-08-08T14:20:00Z',
      updated_at: '2025-08-09T09:45:00Z'
    },
    tourist_profile: {
      id: 'tp3',
      user_id: 't3',
      full_name: 'Emma Wilson',
      phone: '+61-400-123456',
      created_at: '2025-08-11T08:20:00Z',
      updated_at: '2025-08-11T08:20:00Z'
    }
  }
];

const mockTransactions: Transaction[] = [
  {
    id: 'tx1',
    booking_id: 'b1',
    tourist_id: 't1', 
    amount: 160000,
    currency: 'UGx',
    transaction_type: 'payment', 
    status: 'completed',
    payment_method: 'card', 
    reference: 'TXN_001_2025', 
    created_at: '2025-08-14T10:35:00Z'
  },
  {
    id: 'tx2',
    booking_id: 'b3',
    tourist_id: 't3',
    amount: 18000,
    currency: 'UGx',
    transaction_type: 'payment',
    status: 'completed',
    payment_method: 'mobile_money',
    reference: 'TXN_002_2025',
    created_at: '2025-08-11T08:25:00Z'
  },
  {
    id: 'tx3',
    booking_id: 'b2',
    tourist_id: 't2',
    amount: 36000,
    currency: 'UGx',
    transaction_type: 'payment',
    status: 'pending',
    payment_method: 'bank_transfer',
    reference: 'TXN_003_2025',
    created_at: '2025-08-13T16:50:00Z'
  }
];

export function useVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const sortedVendors = [...mockVendors].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setVendors(sortedVendors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateVendorStatus = async (vendorId: string, status: 'approved' | 'rejected') => {
    try {
      setError(null);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setVendors(prevVendors => 
        prevVendors.map(vendor => 
          vendor.id === vendorId 
            ? {
                ...vendor,
                status,
                updated_at: new Date().toISOString()
              }
            : vendor
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vendor status');
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  return { vendors, loading, error, refetch: fetchVendors, updateVendorStatus };
}

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const sortedServices = [...mockServices].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setServices(sortedServices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateServiceStatus = async (serviceId: string, status: 'approved' | 'rejected') => {
    try {
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update local state
      setServices(prevServices => 
        prevServices.map(service => 
          service.id === serviceId 
            ? {
                ...service,
                status,
                updated_at: new Date().toISOString()
              }
            : service
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service status');
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return { services, loading, error, refetch: fetchServices, updateServiceStatus };
}

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 700));
      
      // Sort by created_at descending (newest first)
      const sortedBookings = [...mockBookings].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setBookings(sortedBookings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  return { bookings, loading, error, refetch: fetchBookings };
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Sort by created_at descending (newest first)
      const sortedTransactions = [...mockTransactions].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setTransactions(sortedTransactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return { transactions, loading, error, refetch: fetchTransactions };
}