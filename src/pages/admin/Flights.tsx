import { CheckIcon, XMarkIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useFlights } from '../../hooks/hook';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import { useState } from 'react';
import type { Flight } from '../../types';

export function Flights() {
  const { flights, loading, error, updateFlightStatus, deleteFlight, createFlight, updateFlight } = useFlights();
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  const [creatingFlight, setCreatingFlight] = useState(false);
  const [updatingFlight, setUpdatingFlight] = useState(false);

  // Form state
  const [flightForm, setFlightForm] = useState({
    flight_number: '',
    airline: '',
    departure_airport: '',
    arrival_airport: '',
    departure_city: '',
    arrival_city: '',
    departure_time: '',
    arrival_time: '',
    duration_minutes: 0,
    aircraft_type: '',
    economy_price: 0,
    business_price: 0,
    first_class_price: 0,
    currency: 'UGX',
    total_seats: 0,
    available_seats: 0,
    status: 'active' as Flight['status'],
    flight_class: 'economy' as Flight['flight_class'],
    amenities: [] as string[],
    baggage_allowance: ''
  });

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
        <p className="text-red-800">Error loading flights: {error}</p>
      </div>
    );
  }

  const activeFlights = flights.filter(flight => flight.status === 'active');
  const cancelledFlights = flights.filter(flight => flight.status === 'cancelled');
  const delayedFlights = flights.filter(flight => flight.status === 'delayed');

  const updateStatus = async (flightId: string, status: Flight['status']) => {
    setUpdatingStatus(flightId);
    try {
      await updateFlightStatus(flightId, status);
    } catch (err) {
      console.error('Failed to update flight status:', err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async (flightId: string) => {
    if (!window.confirm('Are you sure you want to delete this flight?')) return;

    try {
      await deleteFlight(flightId);
    } catch (err) {
      console.error('Failed to delete flight:', err);
    }
  };

  const handleCreateFlight = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingFlight(true);
    try {
      await createFlight(flightForm);
      setShowCreateForm(false);
      resetFlightForm();
    } catch (err) {
      console.error('Failed to create flight:', err);
    } finally {
      setCreatingFlight(false);
    }
  };

  const handleUpdateFlight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlight) return;

    setUpdatingFlight(true);
    try {
      await updateFlight(editingFlight.id, flightForm);
      setEditingFlight(null);
      resetFlightForm();
    } catch (err) {
      console.error('Failed to update flight:', err);
    } finally {
      setUpdatingFlight(false);
    }
  };

  const resetFlightForm = () => {
    setFlightForm({
      flight_number: '',
      airline: '',
      departure_airport: '',
      arrival_airport: '',
      departure_city: '',
      arrival_city: '',
      departure_time: '',
      arrival_time: '',
      duration_minutes: 0,
      aircraft_type: '',
      economy_price: 0,
      business_price: 0,
      first_class_price: 0,
      currency: 'UGX',
      total_seats: 0,
      available_seats: 0,
      status: 'active',
      flight_class: 'economy',
      amenities: [],
      baggage_allowance: ''
    });
  };

  const startEditing = (flight: Flight) => {
    setEditingFlight(flight);
    setFlightForm({
      flight_number: flight.flight_number,
      airline: flight.airline,
      departure_airport: flight.departure_airport,
      arrival_airport: flight.arrival_airport,
      departure_city: flight.departure_city,
      arrival_city: flight.arrival_city,
      departure_time: flight.departure_time,
      arrival_time: flight.arrival_time,
      duration_minutes: flight.duration_minutes,
      aircraft_type: flight.aircraft_type || '',
      economy_price: flight.economy_price,
      business_price: flight.business_price || 0,
      first_class_price: flight.first_class_price || 0,
      currency: flight.currency,
      total_seats: flight.total_seats,
      available_seats: flight.available_seats,
      status: flight.status,
      flight_class: flight.flight_class,
      amenities: flight.amenities || [],
      baggage_allowance: flight.baggage_allowance || ''
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Flight Management</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Flight
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Flights</p>
              <p className="text-2xl font-bold text-gray-900">{activeFlights.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <XMarkIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Delayed Flights</p>
              <p className="text-2xl font-bold text-gray-900">{delayedFlights.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XMarkIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Cancelled Flights</p>
              <p className="text-2xl font-bold text-gray-900">{cancelledFlights.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <PlusIcon className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Flights</p>
              <p className="text-2xl font-bold text-gray-900">{flights.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Flights Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">All Flights</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Flight Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pricing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {flights.map((flight) => (
                <tr key={flight.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {flight.flight_number}
                      </div>
                      <div className="text-sm text-gray-500">
                        {flight.airline}
                      </div>
                      {flight.aircraft_type && (
                        <div className="text-xs text-gray-400">
                          {flight.aircraft_type}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {flight.departure_city} → {flight.arrival_city}
                    </div>
                    <div className="text-xs text-gray-500">
                      {flight.departure_airport} → {flight.arrival_airport}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDateTime(flight.departure_time)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Duration: {formatDuration(flight.duration_minutes)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      Economy: {formatCurrency(flight.economy_price, flight.currency)}
                    </div>
                    {flight.business_price && (
                      <div className="text-xs text-gray-500">
                        Business: {formatCurrency(flight.business_price, flight.currency)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {flight.available_seats}/{flight.total_seats}
                    </div>
                    <div className="text-xs text-gray-500">
                      Available
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={flight.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startEditing(flight)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(flight.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                      {flight.status === 'active' && (
                        <button
                          onClick={() => updateStatus(flight.id, 'cancelled')}
                          disabled={updatingStatus === flight.id}
                          className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      )}
                      {flight.status === 'cancelled' && (
                        <button
                          onClick={() => updateStatus(flight.id, 'active')}
                          disabled={updatingStatus === flight.id}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        >
                          <CheckIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {flights.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">No flights found</div>
          </div>
        )}
      </div>

      {/* Create Flight Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Flight</h3>
              <form onSubmit={handleCreateFlight} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Flight Info */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Flight Number</label>
                    <input
                      type="text"
                      required
                      value={flightForm.flight_number}
                      onChange={(e) => setFlightForm(prev => ({ ...prev, flight_number: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., QR123"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Airline</label>
                    <input
                      type="text"
                      required
                      value={flightForm.airline}
                      onChange={(e) => setFlightForm(prev => ({ ...prev, airline: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Qatar Airways"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Aircraft Type</label>
                    <input
                      type="text"
                      value={flightForm.aircraft_type}
                      onChange={(e) => setFlightForm(prev => ({ ...prev, aircraft_type: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Boeing 777"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Currency</label>
                    <select
                      value={flightForm.currency}
                      onChange={(e) => setFlightForm(prev => ({ ...prev, currency: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="UGX">UGX</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                {/* Route Information */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Route Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Departure City</label>
                      <input
                        type="text"
                        required
                        value={flightForm.departure_city}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, departure_city: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Kampala"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Arrival City</label>
                      <input
                        type="text"
                        required
                        value={flightForm.arrival_city}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, arrival_city: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Nairobi"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Departure Airport</label>
                      <input
                        type="text"
                        required
                        value={flightForm.departure_airport}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, departure_airport: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., KIA"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Arrival Airport</label>
                      <input
                        type="text"
                        required
                        value={flightForm.arrival_airport}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, arrival_airport: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., JKA"
                      />
                    </div>
                  </div>
                </div>

                {/* Schedule */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Schedule</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Departure Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={flightForm.departure_time}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, departure_time: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Arrival Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={flightForm.arrival_time}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, arrival_time: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={flightForm.duration_minutes}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 120"
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Pricing</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Economy Price</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={flightForm.economy_price}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, economy_price: parseFloat(e.target.value) || 0 }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Business Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={flightForm.business_price}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, business_price: parseFloat(e.target.value) || 0 }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">First Class Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={flightForm.first_class_price}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, first_class_price: parseFloat(e.target.value) || 0 }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Capacity */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Capacity</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Seats</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={flightForm.total_seats}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, total_seats: parseInt(e.target.value) || 0 }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Available Seats</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={flightForm.available_seats}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, available_seats: parseInt(e.target.value) || 0 }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 180"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Additional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Flight Class</label>
                      <select
                        value={flightForm.flight_class}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, flight_class: e.target.value as Flight['flight_class'] }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="economy">Economy</option>
                        <option value="business">Business</option>
                        <option value="first_class">First Class</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <select
                        value={flightForm.status}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, status: e.target.value as Flight['status'] }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="delayed">Delayed</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Baggage Allowance</label>
                      <input
                        type="text"
                        value={flightForm.baggage_allowance}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, baggage_allowance: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 20kg checked, 7kg carry-on"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      resetFlightForm();
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingFlight}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingFlight ? 'Creating...' : 'Create Flight'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {editingFlight && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Flight</h3>
              <form onSubmit={handleUpdateFlight} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Flight Info */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Flight Number</label>
                    <input
                      type="text"
                      required
                      value={flightForm.flight_number}
                      onChange={(e) => setFlightForm(prev => ({ ...prev, flight_number: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., QR123"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Airline</label>
                    <input
                      type="text"
                      required
                      value={flightForm.airline}
                      onChange={(e) => setFlightForm(prev => ({ ...prev, airline: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Qatar Airways"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Aircraft Type</label>
                    <input
                      type="text"
                      value={flightForm.aircraft_type}
                      onChange={(e) => setFlightForm(prev => ({ ...prev, aircraft_type: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Boeing 777"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Currency</label>
                    <select
                      value={flightForm.currency}
                      onChange={(e) => setFlightForm(prev => ({ ...prev, currency: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="UGX">UGX</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                {/* Route Information */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Route Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Departure City</label>
                      <input
                        type="text"
                        required
                        value={flightForm.departure_city}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, departure_city: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Kampala"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Arrival City</label>
                      <input
                        type="text"
                        required
                        value={flightForm.arrival_city}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, arrival_city: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Nairobi"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Departure Airport</label>
                      <input
                        type="text"
                        required
                        value={flightForm.departure_airport}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, departure_airport: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., KIA"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Arrival Airport</label>
                      <input
                        type="text"
                        required
                        value={flightForm.arrival_airport}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, arrival_airport: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., JKA"
                      />
                    </div>
                  </div>
                </div>

                {/* Schedule */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Schedule</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Departure Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={flightForm.departure_time}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, departure_time: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Arrival Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={flightForm.arrival_time}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, arrival_time: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={flightForm.duration_minutes}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 120"
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Pricing</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Economy Price</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={flightForm.economy_price}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, economy_price: parseFloat(e.target.value) || 0 }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Business Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={flightForm.business_price}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, business_price: parseFloat(e.target.value) || 0 }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">First Class Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={flightForm.first_class_price}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, first_class_price: parseFloat(e.target.value) || 0 }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Capacity */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Capacity</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Seats</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={flightForm.total_seats}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, total_seats: parseInt(e.target.value) || 0 }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Available Seats</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={flightForm.available_seats}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, available_seats: parseInt(e.target.value) || 0 }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 180"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Additional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Flight Class</label>
                      <select
                        value={flightForm.flight_class}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, flight_class: e.target.value as Flight['flight_class'] }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="economy">Economy</option>
                        <option value="business">Business</option>
                        <option value="first_class">First Class</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <select
                        value={flightForm.status}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, status: e.target.value as Flight['status'] }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="delayed">Delayed</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Baggage Allowance</label>
                      <input
                        type="text"
                        value={flightForm.baggage_allowance}
                        onChange={(e) => setFlightForm(prev => ({ ...prev, baggage_allowance: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 20kg checked, 7kg carry-on"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFlight(null);
                      resetFlightForm();
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingFlight}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updatingFlight ? 'Updating...' : 'Update Flight'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}