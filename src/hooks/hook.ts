import { useState, useEffect } from 'react';
import type { Service, Booking, Transaction, Flight } from '../types';
import type { ServiceCategory, ServiceDeleteRequest } from '../lib/database';
import { getServices, createService, updateService, deleteService, getFlights, createFlight, updateFlight, deleteFlight, updateFlightStatus as updateFlightStatusDB, getServiceCategories, createServiceDeleteRequest, getServiceDeleteRequests, updateServiceDeleteRequestStatus, deleteServiceDeleteRequest, getAllBookings, getAllVendors, getAllTransactions, getAllTransactionsForAdmin, updateVendorStatus as updateVendorStatusDB, updateBooking } from '../lib/database';
import { supabase } from '../lib/supabaseClient';

// Placeholder hooks - to be updated later
export function useVendors() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllVendors();
      setVendors(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateVendorStatus = async (vendorId: string, status: string) => {
    try {
      // Update the vendor status in the database
      await updateVendorStatusDB(vendorId, status as any);
      // Refresh the vendors list
      await fetchVendors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  return { vendors, loading, error, refetch: fetchVendors, updateVendorStatus };
}

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllBookings();

      // Add artificial delay for better UX (showing loading states)
      await new Promise(resolve => setTimeout(resolve, 900));

      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: Booking['status']) => {
    try {
      await updateBooking(bookingId, { status });
      // No need to refresh - real-time subscription will update the UI
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const updatePaymentStatus = async (bookingId: string, paymentStatus: Booking['payment_status']) => {
    try {
      console.log('Hook: Updating payment status for booking', bookingId, 'to', paymentStatus)
      await updateBooking(bookingId, { payment_status: paymentStatus })
      console.log('Hook: Payment status updated successfully')
      // No need to refresh - real-time subscription will update the UI
    } catch (err) {
      console.error('Hook: Error updating payment status:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchBookings();

    // Set up real-time subscription for all bookings
    const subscription = supabase
      .channel('admin_bookings')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings'
      }, (payload) => {
        console.log('Admin real-time booking change:', payload);
        
        if (payload.eventType === 'INSERT') {
          setBookings(prev => [payload.new as Booking, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setBookings(prev => prev.map(booking => 
            booking.id === payload.new.id ? payload.new as Booking : booking
          ));
        } else if (payload.eventType === 'DELETE') {
          setBookings(prev => prev.filter(booking => booking.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { bookings, loading, error, refetch: fetchBookings, updateBookingStatus, updatePaymentStatus };
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllTransactions();
      setTransactions(data);
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

export function useAdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllTransactionsForAdmin();
      setTransactions(data);
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

export function useServices(vendorId?: string) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching services...');
      const data = await getServices(vendorId);
      console.log('Services fetched:', data?.length || 0);

      // Add artificial delay for better UX (showing loading states)
      // await new Promise(resolve => setTimeout(resolve, 1200));

      setServices(data);
    } catch (err) {
      console.error('Error in useServices:', err);
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
      
      const updated = await updateService(serviceId, vendorId, { status });
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
      const updated = await updateService(serviceId, vendorId, updates);
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
      await deleteService(serviceId, vendorId);
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

export function useFlights() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlights = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getFlights();
      setFlights(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createNewFlight = async (flightData: {
    flight_number: string;
    airline: string;
    departure_airport: string;
    arrival_airport: string;
    departure_city: string;
    arrival_city: string;
    departure_time: string;
    arrival_time: string;
    duration_minutes: number;
    aircraft_type?: string;
    economy_price: number;
    business_price?: number;
    first_class_price?: number;
    currency?: string;
    total_seats: number;
    available_seats: number;
    status?: Flight['status'];
    flight_class?: Flight['flight_class'];
    amenities?: string[];
    baggage_allowance?: string;
  }) => {
    try {
      const flightWithDefaults = {
        ...flightData,
        status: flightData.status || 'active',
        flight_class: flightData.flight_class || 'economy',
        currency: flightData.currency || 'UGX',
        amenities: flightData.amenities || []
      };
      const newFlight = await createFlight(flightWithDefaults);
      setFlights(prev => [...prev, newFlight]);
      return newFlight;
    } catch (err) {
      throw err;
    }
  };

  const updateExistingFlight = async (id: string, updates: Partial<Flight>) => {
    try {
      const updatedFlight = await updateFlight(id, updates);
      setFlights(prev => prev.map(flight =>
        flight.id === id ? updatedFlight : flight
      ));
      return updatedFlight;
    } catch (err) {
      throw err;
    }
  };

  const removeFlight = async (id: string) => {
    try {
      await deleteFlight(id);
      setFlights(prev => prev.filter(flight => flight.id !== id));
    } catch (err) {
      throw err;
    }
  };

  const updateFlightStatus = async (id: string, status: Flight['status']): Promise<Flight> => {
    try {
      const updatedFlight: Flight = await updateFlightStatusDB(id, status);
      setFlights(prev => prev.map(flight =>
        flight.id === id ? updatedFlight : flight
      ));
      return updatedFlight;
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchFlights();
  }, []);

  return {
    flights,
    loading,
    error,
    refetch: fetchFlights,
    createFlight: createNewFlight,
    updateFlight: updateExistingFlight,
    deleteFlight: removeFlight,
    updateFlightStatus
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

export function useServiceCategories() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getServiceCategories();

      // Filter out flights category
      const filteredData = data.filter(category => category.id !== 'cat_flights');

      // Add artificial delay for better UX (showing loading states)
      await new Promise(resolve => setTimeout(resolve, 1000));

      setCategories(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories
  };
}

export function useServiceDeleteRequests(vendorId?: string) {
  const [deleteRequests, setDeleteRequests] = useState<ServiceDeleteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeleteRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('useServiceDeleteRequests: Fetching delete requests for vendorId:', vendorId);
      const data = await getServiceDeleteRequests(vendorId);
      console.log('useServiceDeleteRequests: Fetched data:', data);
      console.log('useServiceDeleteRequests: Data length:', data?.length || 0);
      setDeleteRequests(data);
    } catch (err) {
      console.error('useServiceDeleteRequests: Error fetching delete requests:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createDeleteRequest = async (serviceId: string, vendorId: string, reason: string) => {
    try {
      setError(null);
      const newRequest = await createServiceDeleteRequest(serviceId, vendorId, reason);
      setDeleteRequests(prev => [newRequest, ...prev]);
      return newRequest;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create delete request');
      throw err;
    }
  };

  const updateDeleteRequestStatus = async (requestId: string, status: 'pending' | 'approved' | 'rejected', adminNotes?: string) => {
    try {
      setError(null);
      const updated = await updateServiceDeleteRequestStatus(requestId, status, adminNotes);
      setDeleteRequests(prev =>
        prev.map(request =>
          request.id === requestId ? updated : request
        )
      );
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update delete request status');
      throw err;
    }
  };

  const removeDeleteRequest = async (requestId: string) => {
    try {
      setError(null);
      await deleteServiceDeleteRequest(requestId);
      setDeleteRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete request');
      throw err;
    }
  };

  useEffect(() => {
    fetchDeleteRequests();
  }, [vendorId]);

  return {
    deleteRequests,
    loading,
    error,
    refetch: fetchDeleteRequests,
    createDeleteRequest,
    updateDeleteRequestStatus,
    deleteDeleteRequest: removeDeleteRequest
  };
}
