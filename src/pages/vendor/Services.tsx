import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Service } from '../../types'
import { useServices, useServiceCategories, useServiceDeleteRequests } from '../../hooks/hook'
import { formatCurrency } from '../../lib/utils'
import { StatusBadge } from '../../components/StatusBadge'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { uploadServiceImage, deleteServiceImage, removeServiceImage } from '../../lib/imageUpload'

export default function VendorServices() {
  const { user } = useAuth()
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [vendorLoading, setVendorLoading] = useState(true)

  const { services, loading, error, createService, updateService, deleteService } = useServices(vendorId || undefined)
  const { categories } = useServiceCategories()
  const { deleteRequests, createDeleteRequest } = useServiceDeleteRequests(vendorId || undefined)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)

  // Fetch vendor record for the current user
  useEffect(() => {
    const fetchVendor = async () => {
      if (!user?.id) {
        setVendorLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (error) {
          console.error('Error fetching vendor:', error)
          setVendorId(null)
        } else {
          setVendorId(data.id)
        }
      } catch (err) {
        console.error('Failed to fetch vendor:', err)
        setVendorId(null)
      } finally {
        setVendorLoading(false)
      }
    }

    fetchVendor()
  }, [user?.id])

  const onCreate = async (data: Partial<Service>) => {
    if (!vendorId) {
      alert('Vendor account not found. Please contact support.')
      return
    }

    try {
      await createService({
        vendor_id: vendorId!,
        category_id: data.category_id || 'cat_activities',
        title: data.title || '',
        description: data.description || '',
        price: Number(data.price) || 0,
        currency: (data.currency as string) || 'UGX',
        images: (data.images as string[]) || [],
        location: data.location || '',
        duration_hours: data.duration_hours || undefined,
        max_capacity: data.max_capacity || undefined,
        amenities: (data.amenities as string[]) || [],

        // Hotel fields
        room_types: data.room_types || [],
        check_in_time: data.check_in_time || '',
        check_out_time: data.check_out_time || '',
        star_rating: data.star_rating || undefined,
        facilities: data.facilities || [],

        // Tour fields
        itinerary: data.itinerary || [],
        included_items: data.included_items || [],
        excluded_items: data.excluded_items || [],
        minimum_age: data.minimum_age || undefined,
        languages_offered: data.languages_offered || [],

        // Transport fields
        vehicle_type: data.vehicle_type || '',
        vehicle_capacity: data.vehicle_capacity || undefined,
        pickup_locations: data.pickup_locations || [],
        dropoff_locations: data.dropoff_locations || [],
        route_description: data.route_description || '',

        // Restaurant fields
        cuisine_type: data.cuisine_type || '',
        opening_hours: data.opening_hours || {},
        menu_items: data.menu_items || [],
        dietary_options: data.dietary_options || [],
        average_cost_per_person: data.average_cost_per_person || undefined,

        // Guide fields
        languages_spoken: data.languages_spoken || [],
        specialties: data.specialties || [],
        certifications: data.certifications || [],
        years_experience: data.years_experience || undefined,
        service_area: data.service_area || '',

        // General fields
        tags: data.tags || [],
        contact_info: data.contact_info || {},
        booking_requirements: data.booking_requirements || '',
        cancellation_policy: data.cancellation_policy || ''
      } as any)
      setShowForm(false)
    } catch (err) {
      console.error('Failed to create service:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      alert(`Failed to create service: ${errorMessage}`)
    }
  }

  const onUpdate = async (id: string, updates: Partial<Service>) => {
    try {
      // Filter out undefined/null values and only send valid updates
      const validUpdates: any = {}

      // Basic fields
      if (updates.title !== undefined) validUpdates.title = updates.title
      if (updates.description !== undefined) validUpdates.description = updates.description
      if (updates.price !== undefined) validUpdates.price = updates.price
      if (updates.currency !== undefined) validUpdates.currency = updates.currency
      if (updates.images !== undefined) validUpdates.images = updates.images
      if (updates.location !== undefined) validUpdates.location = updates.location
      if (updates.duration_hours !== undefined) validUpdates.duration_hours = updates.duration_hours
      if (updates.max_capacity !== undefined) validUpdates.max_capacity = updates.max_capacity
      if (updates.amenities !== undefined) validUpdates.amenities = updates.amenities
      if (updates.category_id !== undefined) validUpdates.category_id = updates.category_id

      // Hotel fields
      if (updates.room_types !== undefined) validUpdates.room_types = updates.room_types
      if (updates.check_in_time !== undefined) validUpdates.check_in_time = updates.check_in_time
      if (updates.check_out_time !== undefined) validUpdates.check_out_time = updates.check_out_time
      if (updates.star_rating !== undefined && updates.star_rating !== null && updates.star_rating >= 1 && updates.star_rating <= 5) {
        validUpdates.star_rating = updates.star_rating
      }
      if (updates.facilities !== undefined) validUpdates.facilities = updates.facilities

      // Tour fields
      if (updates.itinerary !== undefined) validUpdates.itinerary = updates.itinerary
      if (updates.included_items !== undefined) validUpdates.included_items = updates.included_items
      if (updates.excluded_items !== undefined) validUpdates.excluded_items = updates.excluded_items
      if (updates.difficulty_level !== undefined && ['easy', 'moderate', 'challenging', 'difficult'].includes(updates.difficulty_level)) {
        validUpdates.difficulty_level = updates.difficulty_level
      }
      if (updates.minimum_age !== undefined) validUpdates.minimum_age = updates.minimum_age
      if (updates.languages_offered !== undefined) validUpdates.languages_offered = updates.languages_offered

      // Transport fields
      if (updates.vehicle_type !== undefined) validUpdates.vehicle_type = updates.vehicle_type
      if (updates.vehicle_capacity !== undefined) validUpdates.vehicle_capacity = updates.vehicle_capacity
      if (updates.pickup_locations !== undefined) validUpdates.pickup_locations = updates.pickup_locations
      if (updates.dropoff_locations !== undefined) validUpdates.dropoff_locations = updates.dropoff_locations
      if (updates.route_description !== undefined) validUpdates.route_description = updates.route_description

      // Restaurant fields
      if (updates.cuisine_type !== undefined) validUpdates.cuisine_type = updates.cuisine_type
      if (updates.opening_hours !== undefined) validUpdates.opening_hours = updates.opening_hours
      if (updates.menu_items !== undefined) validUpdates.menu_items = updates.menu_items
      if (updates.dietary_options !== undefined) validUpdates.dietary_options = updates.dietary_options
      if (updates.average_cost_per_person !== undefined) validUpdates.average_cost_per_person = updates.average_cost_per_person

      // Guide fields
      if (updates.languages_spoken !== undefined) validUpdates.languages_spoken = updates.languages_spoken
      if (updates.specialties !== undefined) validUpdates.specialties = updates.specialties
      if (updates.certifications !== undefined) validUpdates.certifications = updates.certifications
      if (updates.years_experience !== undefined) validUpdates.years_experience = updates.years_experience
      if (updates.service_area !== undefined) validUpdates.service_area = updates.service_area

      // General fields
      if (updates.tags !== undefined) validUpdates.tags = updates.tags
      if (updates.contact_info !== undefined) validUpdates.contact_info = updates.contact_info
      if (updates.booking_requirements !== undefined) validUpdates.booking_requirements = updates.booking_requirements
      if (updates.cancellation_policy !== undefined) validUpdates.cancellation_policy = updates.cancellation_policy

      console.log('Valid updates:', validUpdates)

      if (Object.keys(validUpdates).length === 0) {
        console.log('No valid updates to send')
        setEditing(null)
        return
      }

      await updateService(id, validUpdates)
      setEditing(null)
    } catch (err) {
      console.error('Failed to update service:', err)
      alert('Failed to update service. Please try again.')
    }
  }

  const onDelete = async (service: Service) => {
    if (!user) {
      alert('You must be logged in to delete services.')
      return
    }

    if (!vendorId) {
      alert('Vendor account not found. Please contact support.')
      return
    }

    if (service.status === 'approved') {
      // For approved services, create a delete request
      const reason = prompt('Please provide a reason for requesting deletion of this approved service:')
      if (!reason || reason.trim() === '') {
        alert('Reason is required to request service deletion.')
        return
      }

      try {
        await createDeleteRequest(service.id, vendorId, reason.trim())
        alert('Delete request submitted successfully. An admin will review your request.')
      } catch (err) {
        console.error('Failed to create delete request:', err)
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        alert(`Failed to submit delete request: ${errorMessage}`)
      }
    } else {
      // For non-approved services, delete directly
      if (!confirm('Delete this service?')) return
      try {
        await deleteService(service.id)
      } catch (err) {
        console.error('Failed to delete service:', err)
        alert('Failed to delete service. Please try again.')
      }
    }
  }

  if (vendorLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading vendor information...</div>
      </div>
    )
  }

  if (!vendorId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-gray-500 mb-2">No vendor account found</div>
          <div className="text-sm text-gray-400">Please contact an administrator to set up your vendor account.</div>
        </div>
      </div>
    )
  }

  // Filter services based on selected category
  const filteredServices = selectedCategory === 'all' 
    ? services 
    : services.filter(service => service.category_id === selectedCategory)

  const pendingDeleteRequests = deleteRequests.filter(request => request.status === 'pending')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">My Services</h1>
          {pendingDeleteRequests.length > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              {pendingDeleteRequests.length} Pending Delete Request{pendingDeleteRequests.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Add Service
        </button>
      </div>

      {/* Category Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
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
            {categories
              .filter(category => services.filter(service => service.category_id === category.id).length > 0)
              .map((category) => {
                const categoryServices = services.filter(service => service.category_id === category.id)
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
                )
              })}
          </nav>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Availability</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Loading services...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-red-500">
                    Error: {error}
                  </td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                    {selectedCategory === 'all' 
                      ? 'No services yet. Click Add Service to create one.' 
                      : `No services in this category. Click Add Service to create one.`
                    }
                  </td>
                </tr>
              ) : (
                filteredServices.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{s.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-sm">{s.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {s.service_categories?.name || s.category_id}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(s.price, s.currency)}</td>
                    <td className="px-6 py-4"><StatusBadge status={s.status} variant="small" /></td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        s.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {s.status === 'approved' ? 'Available' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { setEditing(s); setShowForm(true) }} className="text-blue-600 hover:text-blue-800 mr-3">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(s)}
                        className={s.status === 'approved' ? "text-orange-600 hover:text-orange-800" : "text-red-600 hover:text-red-800"}
                        title={s.status === 'approved' ? "Request deletion (requires admin approval)" : "Delete service"}
                      >
                        {s.status === 'approved' ? (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Requests Section */}
      {pendingDeleteRequests.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              My Delete Requests ({pendingDeleteRequests.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
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
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {request.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={request.status} variant="small" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(request.requested_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <ServiceForm
          initial={editing || undefined}
          vendorId={vendorId}
          onClose={() => setShowForm(false)}
          onSubmit={(payload) => {
            if (editing) {
              onUpdate(editing.id, payload)
            } else {
              onCreate(payload)
            }
            setShowForm(false)
          }}
        />
      )}
    </div>
  )
}

function ServiceForm({ initial, vendorId, onClose, onSubmit }: { initial?: Partial<Service>; vendorId: string | null; onClose: () => void; onSubmit: (payload: Partial<Service>) => void }) {
  const { categories } = useServiceCategories()
  const [form, setForm] = useState<Partial<Service>>({
    title: initial?.title || '',
    description: initial?.description || '',
    category_id: initial?.category_id || categories[0]?.id || '',
    price: initial?.price || 0,
    currency: initial?.currency || 'UGX',
    images: initial?.images || [],
    location: initial?.location || '',
    duration_hours: initial?.duration_hours || undefined,
    max_capacity: initial?.max_capacity || undefined,
    amenities: initial?.amenities || [],

    // Hotel fields
    room_types: initial?.room_types || [],
    check_in_time: initial?.check_in_time || '',
    check_out_time: initial?.check_out_time || '',
    star_rating: initial?.star_rating || undefined,
    facilities: initial?.facilities || [],

    // Tour fields
    itinerary: initial?.itinerary || [],
    included_items: initial?.included_items || [],
    excluded_items: initial?.excluded_items || [],
    difficulty_level: initial?.difficulty_level || undefined,
    minimum_age: initial?.minimum_age || undefined,
    languages_offered: initial?.languages_offered || [],

    // Transport fields
    vehicle_type: initial?.vehicle_type || '',
    vehicle_capacity: initial?.vehicle_capacity || undefined,
    pickup_locations: initial?.pickup_locations || [],
    dropoff_locations: initial?.dropoff_locations || [],
    route_description: initial?.route_description || '',

    // Restaurant fields
    cuisine_type: initial?.cuisine_type || '',
    opening_hours: initial?.opening_hours || {},
    menu_items: initial?.menu_items || [],
    dietary_options: initial?.dietary_options || [],
    average_cost_per_person: initial?.average_cost_per_person || undefined,

    // Guide fields
    languages_spoken: initial?.languages_spoken || [],
    specialties: initial?.specialties || [],
    certifications: initial?.certifications || [],
    years_experience: initial?.years_experience || undefined,
    service_area: initial?.service_area || '',

    // General fields
    tags: initial?.tags || [],
    contact_info: initial?.contact_info || {},
    booking_requirements: initial?.booking_requirements || '',
    cancellation_policy: initial?.cancellation_policy || ''
  })

  const [uploadingImage, setUploadingImage] = useState(false)
  const [arrayInputs, setArrayInputs] = useState<{[key: string]: string}>({})

  const update = (k: keyof Service, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  const handleImageUpload = async (file: File) => {
    if (!vendorId) {
      alert('Vendor information not loaded. Please try again.')
      return
    }
    
    setUploadingImage(true)
    try {
      const result = await uploadServiceImage(file, initial?.id || 'temp', vendorId)
      if (result.success && result.url) {
        update('images', [...(form.images || []), result.url])
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  const removeImage = async (index: number) => {
    const imageUrl = form.images?.[index]
    if (imageUrl) {
      try {
        // If this is an existing service, remove from both storage and database
        if (initial?.id) {
          const result = await removeServiceImage(initial.id, imageUrl)
          if (!result.success) {
            console.error('Failed to remove image from database:', result.error)
            // Still remove from local state even if database update fails
          }
        } else {
          // For new services, just delete from storage
          await deleteServiceImage(imageUrl)
        }
      } catch (error) {
        console.error('Failed to delete image:', error)
      }
    }
    update('images', (form.images || []).filter((_, i) => i !== index))
  }

  const addToArray = (field: keyof Service, value: string) => {
    if (!value.trim()) return
    const currentArray = (form[field] as string[]) || []
    update(field, [...currentArray, value.trim()])
    setArrayInputs(prev => ({ ...prev, [field]: '' }))
  }

  const removeFromArray = (field: keyof Service, index: number) => {
    const currentArray = (form[field] as string[]) || []
    update(field, currentArray.filter((_, i) => i !== index))
  }

  const renderCategorySpecificFields = () => {
    const selectedCategory = categories.find(cat => cat.id === form.category_id)
    const categoryName = selectedCategory?.name?.toLowerCase() || ''
    
    switch (categoryName) {
      case 'hotels':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Hotel Details</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Star Rating</label>
                <select value={form.star_rating || ''} onChange={(e) => update('star_rating', e.target.value ? Number(e.target.value) : undefined)} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="">Select rating</option>
                  <option value="1">1 Star - Budget</option>
                  <option value="2">2 Stars - Basic</option>
                  <option value="3">3 Stars - Standard</option>
                  <option value="4">4 Stars - Comfort</option>
                  <option value="5">5 Stars - Luxury</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Property Type</label>
                <select value={form.property_type || ''} onChange={(e) => update('property_type', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="">Select property type</option>
                  <option value="boutique">Boutique Hotel</option>
                  <option value="resort">Resort</option>
                  <option value="business">Business Hotel</option>
                  <option value="apartment">Serviced Apartments</option>
                  <option value="lodge">Lodge</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Rooms</label>
                <input type="number" value={form.total_rooms || ''} onChange={(e) => update('total_rooms', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 50" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cancellation Policy</label>
                <select value={form.cancellation_policy || ''} onChange={(e) => update('cancellation_policy', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="">Select policy</option>
                  <option value="free_24h">Free cancellation within 24 hours</option>
                  <option value="free_48h">Free cancellation within 48 hours</option>
                  <option value="free_7d">Free cancellation within 7 days</option>
                  <option value="no_refund">No refund</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Room Types Available</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.room_types || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, room_types: e.target.value }))}
                  placeholder="e.g., Deluxe Suite, Standard Room"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('room_types', arrayInputs.room_types || ''))}
                />
                <button type="button" onClick={() => addToArray('room_types', arrayInputs.room_types || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.room_types || []).map((room, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {room}
                    <button type="button" onClick={() => removeFromArray('room_types', idx)} className="ml-1 text-blue-600 hover:text-blue-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Hotel Facilities & Amenities</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.facilities || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, facilities: e.target.value }))}
                  placeholder="e.g., Swimming Pool, Restaurant, Spa"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('facilities', arrayInputs.facilities || ''))}
                />
                <button type="button" onClick={() => addToArray('facilities', arrayInputs.facilities || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.facilities || []).map((facility, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    {facility}
                    <button type="button" onClick={() => removeFromArray('facilities', idx)} className="ml-1 text-green-600 hover:text-green-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input type="checkbox" checked={form.breakfast_included || false} onChange={(e) => update('breakfast_included', e.target.checked)} className="mr-2" />
                Breakfast included
              </label>
              <label className="flex items-center">
                <input type="checkbox" checked={form.wifi_available || false} onChange={(e) => update('wifi_available', e.target.checked)} className="mr-2" />
                Free WiFi
              </label>
              <label className="flex items-center">
                <input type="checkbox" checked={form.parking_available || false} onChange={(e) => update('parking_available', e.target.checked)} className="mr-2" />
                Parking available
              </label>
            </div>
          </div>
        )

      case 'tour packages':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Tour Package Details</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Difficulty Level</label>
                <select value={form.difficulty_level || ''} onChange={(e) => update('difficulty_level', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="">Select difficulty</option>
                  <option value="easy">Easy - Suitable for all ages</option>
                  <option value="moderate">Moderate - Some physical activity</option>
                  <option value="challenging">Challenging - Good fitness required</option>
                  <option value="extreme">Extreme - Advanced fitness needed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Best Time to Visit</label>
                <input value={form.best_time_to_visit || ''} onChange={(e) => update('best_time_to_visit', e.target.value)} placeholder="e.g., June-September (Dry season)" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum Age</label>
                <input type="number" value={form.minimum_age || ''} onChange={(e) => update('minimum_age', e.target.value ? Number(e.target.value) : undefined)} className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Maximum Participants</label>
                <input type="number" value={form.max_participants || ''} onChange={(e) => update('max_participants', e.target.value ? Number(e.target.value) : undefined)} className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Languages Offered</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.languages_offered || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, languages_offered: e.target.value }))}
                  placeholder="e.g., English, Swahili, French"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('languages_offered', arrayInputs.languages_offered || ''))}
                />
                <button type="button" onClick={() => addToArray('languages_offered', arrayInputs.languages_offered || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.languages_offered || []).map((lang, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                    {lang}
                    <button type="button" onClick={() => removeFromArray('languages_offered', idx)} className="ml-1 text-purple-600 hover:text-purple-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Detailed Itinerary</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.itinerary || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, itinerary: e.target.value }))}
                  placeholder="e.g., Day 1: Kampala City Tour - Visit markets and cultural sites"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('itinerary', arrayInputs.itinerary || ''))}
                />
                <button type="button" onClick={() => addToArray('itinerary', arrayInputs.itinerary || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.itinerary || []).map((item, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {item}
                    <button type="button" onClick={() => removeFromArray('itinerary', idx)} className="ml-1 text-blue-600 hover:text-blue-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">What's Included</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.included_items || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, included_items: e.target.value }))}
                  placeholder="e.g., Accommodation, Meals, Transport, Guide"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('included_items', arrayInputs.included_items || ''))}
                />
                <button type="button" onClick={() => addToArray('included_items', arrayInputs.included_items || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.included_items || []).map((item, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    {item}
                    <button type="button" onClick={() => removeFromArray('included_items', idx)} className="ml-1 text-green-600 hover:text-green-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">What's Excluded</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.excluded_items || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, excluded_items: e.target.value }))}
                  placeholder="e.g., International Flights, Personal Expenses, Travel Insurance"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('excluded_items', arrayInputs.excluded_items || ''))}
                />
                <button type="button" onClick={() => addToArray('excluded_items', arrayInputs.excluded_items || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.excluded_items || []).map((item, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                    {item}
                    <button type="button" onClick={() => removeFromArray('excluded_items', idx)} className="ml-1 text-red-600 hover:text-red-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tour Highlights</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.tour_highlights || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, tour_highlights: e.target.value }))}
                  placeholder="e.g., Gorilla Trekking, Nile River Cruise, Cultural Dance Performance"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('tour_highlights', arrayInputs.tour_highlights || ''))}
                />
                <button type="button" onClick={() => addToArray('tour_highlights', arrayInputs.tour_highlights || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.tour_highlights || []).map((highlight, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                    {highlight}
                    <button type="button" onClick={() => removeFromArray('tour_highlights', idx)} className="ml-1 text-yellow-600 hover:text-yellow-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">What to Bring</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.what_to_bring || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, what_to_bring: e.target.value }))}
                  placeholder="e.g., Comfortable walking shoes, Sun hat, Insect repellent"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('what_to_bring', arrayInputs.what_to_bring || ''))}
                />
                <button type="button" onClick={() => addToArray('what_to_bring', arrayInputs.what_to_bring || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.what_to_bring || []).map((item, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                    {item}
                    <button type="button" onClick={() => removeFromArray('what_to_bring', idx)} className="ml-1 text-indigo-600 hover:text-indigo-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Meeting Point</label>
                <input value={form.meeting_point || ''} onChange={(e) => update('meeting_point', e.target.value)} placeholder="e.g., Hotel lobby, Airport" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Point</label>
                <input value={form.end_point || ''} onChange={(e) => update('end_point', e.target.value)} placeholder="e.g., Same as meeting point" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input type="checkbox" checked={form.transportation_included || false} onChange={(e) => update('transportation_included', e.target.checked)} className="mr-2" />
                Transportation included
              </label>
              <label className="flex items-center">
                <input type="checkbox" checked={form.guide_included || false} onChange={(e) => update('guide_included', e.target.checked)} className="mr-2" />
                Professional guide included
              </label>
              <label className="flex items-center">
                <input type="checkbox" checked={form.accommodation_included || false} onChange={(e) => update('accommodation_included', e.target.checked)} className="mr-2" />
                Accommodation included
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Meals Included</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.meals_included || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, meals_included: e.target.value }))}
                  placeholder="e.g., Breakfast, Lunch, Dinner, Snacks"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('meals_included', arrayInputs.meals_included || ''))}
                />
                <button type="button" onClick={() => addToArray('meals_included', arrayInputs.meals_included || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.meals_included || []).map((meal, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                    {meal}
                    <button type="button" onClick={() => removeFromArray('meals_included', idx)} className="ml-1 text-orange-600 hover:text-orange-800">×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )

      case 'transport':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Transport Service Details</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Vehicle Type</label>
                <select value={form.vehicle_type || ''} onChange={(e) => update('vehicle_type', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="">Select vehicle type</option>
                  <option value="sedan">Sedan Car</option>
                  <option value="suv">SUV</option>
                  <option value="van">Van/Minivan</option>
                  <option value="bus">Bus</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="boat">Boat</option>
                  <option value="helicopter">Helicopter</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Vehicle Capacity</label>
                <input type="number" value={form.vehicle_capacity || ''} onChange={(e) => update('vehicle_capacity', e.target.value ? Number(e.target.value) : undefined)} placeholder="Number of passengers" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">License Requirements</label>
                <select value={form.license_required || ''} onChange={(e) => update('license_required', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="">Select license type</option>
                  <option value="none">No license required</option>
                  <option value="car">Car license</option>
                  <option value="motorcycle">Motorcycle license</option>
                  <option value="boat">Boat license</option>
                  <option value="commercial">Commercial license</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Booking Notice Period (hours)</label>
                <input type="number" value={form.booking_notice_hours || ''} onChange={(e) => update('booking_notice_hours', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 24" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Vehicle Features</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                <label className="flex items-center">
                  <input type="checkbox" checked={form.air_conditioning || false} onChange={(e) => update('air_conditioning', e.target.checked)} className="mr-2" />
                  Air Conditioning
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.gps_tracking || false} onChange={(e) => update('gps_tracking', e.target.checked)} className="mr-2" />
                  GPS Tracking
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.wifi_available || false} onChange={(e) => update('wifi_available', e.target.checked)} className="mr-2" />
                  WiFi Available
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.usb_charging || false} onChange={(e) => update('usb_charging', e.target.checked)} className="mr-2" />
                  USB Charging
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.child_seat || false} onChange={(e) => update('child_seat', e.target.checked)} className="mr-2" />
                  Child Seat Available
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.roof_rack || false} onChange={(e) => update('roof_rack', e.target.checked)} className="mr-2" />
                  Roof Rack
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.towing_capacity || false} onChange={(e) => update('towing_capacity', e.target.checked)} className="mr-2" />
                  Towing Capacity
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.four_wheel_drive || false} onChange={(e) => update('four_wheel_drive', e.target.checked)} className="mr-2" />
                  4WD
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.automatic_transmission || false} onChange={(e) => update('automatic_transmission', e.target.checked)} className="mr-2" />
                  Automatic Transmission
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Pickup Locations</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.pickup_locations || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, pickup_locations: e.target.value }))}
                  placeholder="e.g., Entebbe Airport, Kampala City Center"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('pickup_locations', arrayInputs.pickup_locations || ''))}
                />
                <button type="button" onClick={() => addToArray('pickup_locations', arrayInputs.pickup_locations || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.pickup_locations || []).map((location, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {location}
                    <button type="button" onClick={() => removeFromArray('pickup_locations', idx)} className="ml-1 text-blue-600 hover:text-blue-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Drop-off Locations</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.dropoff_locations || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, dropoff_locations: e.target.value }))}
                  placeholder="e.g., Queen Elizabeth National Park, Bwindi Forest"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('dropoff_locations', arrayInputs.dropoff_locations || ''))}
                />
                <button type="button" onClick={() => addToArray('dropoff_locations', arrayInputs.dropoff_locations || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.dropoff_locations || []).map((location, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    {location}
                    <button type="button" onClick={() => removeFromArray('dropoff_locations', idx)} className="ml-1 text-green-600 hover:text-green-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Route Description</label>
              <textarea value={form.route_description || ''} onChange={(e) => update('route_description', e.target.value)} placeholder="Describe the route, stops, and any notable points along the way" rows={3} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Fuel Included</label>
                <select value={form.fuel_included ? 'yes' : 'no'} onChange={(e) => update('fuel_included', e.target.value === 'yes')} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="no">No - Client pays for fuel</option>
                  <option value="yes">Yes - Fuel included in price</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tolls Included</label>
                <select value={form.tolls_included ? 'yes' : 'no'} onChange={(e) => update('tolls_included', e.target.value === 'yes')} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="no">No - Client pays tolls</option>
                  <option value="yes">Yes - Tolls included in price</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Insurance Included</label>
                <select value={form.insurance_included ? 'yes' : 'no'} onChange={(e) => update('insurance_included', e.target.value === 'yes')} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="no">No - Client provides insurance</option>
                  <option value="yes">Yes - Insurance included</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Driver Included</label>
                <select value={form.driver_included ? 'yes' : 'no'} onChange={(e) => update('driver_included', e.target.value === 'yes')} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="no">Self-drive available</option>
                  <option value="yes">Driver included</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Vehicle Photos Required</label>
              <div className="mt-2 text-sm text-gray-600">
                Please upload clear photos of your vehicle from multiple angles, including interior and exterior.
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Additional Terms & Conditions</label>
              <textarea value={form.transport_terms || ''} onChange={(e) => update('transport_terms', e.target.value)} placeholder="Any additional terms, restrictions, or requirements for transport services" rows={3} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>
          </div>
        )

      case 'restaurants':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Restaurant Service Details</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Cuisine Type</label>
                <select value={form.cuisine_type || ''} onChange={(e) => update('cuisine_type', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="">Select cuisine type</option>
                  <option value="ugandan">Ugandan</option>
                  <option value="african">African</option>
                  <option value="italian">Italian</option>
                  <option value="french">French</option>
                  <option value="chinese">Chinese</option>
                  <option value="indian">Indian</option>
                  <option value="japanese">Japanese</option>
                  <option value="mexican">Mexican</option>
                  <option value="american">American</option>
                  <option value="fusion">Fusion</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Price Range</label>
                <select value={form.price_range || ''} onChange={(e) => update('price_range', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="">Select price range</option>
                  <option value="budget">Budget (Under $15/person)</option>
                  <option value="moderate">Moderate ($15-30/person)</option>
                  <option value="upscale">Upscale ($30-60/person)</option>
                  <option value="fine_dining">Fine Dining (Over $60/person)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Reservations Required</label>
                <select value={form.reservations_required ? 'yes' : 'no'} onChange={(e) => update('reservations_required', e.target.value === 'yes')} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="no">No - Walk-ins welcome</option>
                  <option value="yes">Yes - Reservations recommended</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Advance Booking (days)</label>
                <input type="number" value={form.advance_booking_days || ''} onChange={(e) => update('advance_booking_days', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 1" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Opening Hours</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600">Monday - Friday</label>
                  <input
                    type="text"
                    placeholder="9:00 AM - 10:00 PM"
                    value={(form.opening_hours as any)?.weekdays || ''}
                    onChange={(e) => update('opening_hours', { ...form.opening_hours, weekdays: e.target.value })}
                    className="mt-1 w-full border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Saturday - Sunday</label>
                  <input
                    type="text"
                    placeholder="10:00 AM - 11:00 PM"
                    value={(form.opening_hours as any)?.weekends || ''}
                    onChange={(e) => update('opening_hours', { ...form.opening_hours, weekends: e.target.value })}
                    className="mt-1 w-full border rounded-md px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Dress Code</label>
              <select value={form.dress_code || ''} onChange={(e) => update('dress_code', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                <option value="">Select dress code</option>
                <option value="casual">Casual</option>
                <option value="smart_casual">Smart Casual</option>
                <option value="business_casual">Business Casual</option>
                <option value="formal">Formal</option>
                <option value="none">No dress code</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Dietary Options</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.dietary_options || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, dietary_options: e.target.value }))}
                  placeholder="e.g., Vegetarian, Vegan, Halal, Gluten-free"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('dietary_options', arrayInputs.dietary_options || ''))}
                />
                <button type="button" onClick={() => addToArray('dietary_options', arrayInputs.dietary_options || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.dietary_options || []).map((option, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                    {option}
                    <button type="button" onClick={() => removeFromArray('dietary_options', idx)} className="ml-1 text-orange-600 hover:text-orange-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Special Features</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                <label className="flex items-center">
                  <input type="checkbox" checked={form.outdoor_seating || false} onChange={(e) => update('outdoor_seating', e.target.checked)} className="mr-2" />
                  Outdoor Seating
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.live_music || false} onChange={(e) => update('live_music', e.target.checked)} className="mr-2" />
                  Live Music
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.private_dining || false} onChange={(e) => update('private_dining', e.target.checked)} className="mr-2" />
                  Private Dining
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.alcohol_served || false} onChange={(e) => update('alcohol_served', e.target.checked)} className="mr-2" />
                  Alcohol Served
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.wifi_available || false} onChange={(e) => update('wifi_available', e.target.checked)} className="mr-2" />
                  WiFi Available
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.parking_available || false} onChange={(e) => update('parking_available', e.target.checked)} className="mr-2" />
                  Parking Available
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Menu Highlights</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.menu_highlights || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, menu_highlights: e.target.value }))}
                  placeholder="e.g., Grilled Tilapia, Matoke, Rolex"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('menu_highlights', arrayInputs.menu_highlights || ''))}
                />
                <button type="button" onClick={() => addToArray('menu_highlights', arrayInputs.menu_highlights || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.menu_highlights || []).map((highlight, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    {highlight}
                    <button type="button" onClick={() => removeFromArray('menu_highlights', idx)} className="ml-1 text-green-600 hover:text-green-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Atmosphere & Experience</label>
              <textarea value={form.restaurant_atmosphere || ''} onChange={(e) => update('restaurant_atmosphere', e.target.value)} placeholder="Describe the ambiance, decor, and overall dining experience" rows={3} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Special Notes</label>
              <textarea value={form.restaurant_notes || ''} onChange={(e) => update('restaurant_notes', e.target.value)} placeholder="Any additional information tourists should know (e.g., best time to visit, local specialties, etc.)" rows={2} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>
          </div>
        )

      case 'activities':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Event & Activity Details</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Type</label>
                <select value={form.event_type || ''} onChange={(e) => update('event_type', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="">Select event type</option>
                  <option value="adventure_activity">Adventure Activity</option>
                  <option value="cultural_experience">Cultural Experience</option>
                  <option value="nature_tour">Nature Tour</option>
                  <option value="sports_event">Sports Event</option>
                  <option value="festival">Festival</option>
                  <option value="workshop">Workshop</option>
                  <option value="concert">Concert/Performance</option>
                  <option value="exhibition">Exhibition</option>
                  <option value="other">Other Event</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Status</label>
                <select value={form.event_status || 'upcoming'} onChange={(e) => update('event_status', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Date & Time</label>
                <input type="datetime-local" value={form.event_datetime || ''} onChange={(e) => update('event_datetime', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Registration Deadline</label>
                <input type="datetime-local" value={form.registration_deadline || ''} onChange={(e) => update('registration_deadline', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Maximum Participants</label>
                <input type="number" value={form.max_participants || ''} onChange={(e) => update('max_participants', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 50" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum Age</label>
                <input type="number" value={form.minimum_age || ''} onChange={(e) => update('minimum_age', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 8" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Ticket Price (UGX)</label>
                <input type="number" value={form.ticket_price || ''} onChange={(e) => update('ticket_price', e.target.value ? Number(e.target.value) : undefined)} placeholder="Price per ticket" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Early Bird Price (UGX)</label>
                <input type="number" value={form.early_bird_price || ''} onChange={(e) => update('early_bird_price', e.target.value ? Number(e.target.value) : undefined)} placeholder="Discounted price if applicable" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Ticket Purchase Link</label>
              <input value={form.ticket_purchase_link || ''} onChange={(e) => update('ticket_purchase_link', e.target.value)} placeholder="https://example.com/buy-tickets" className="mt-1 w-full border rounded-md px-3 py-2" />
              <p className="text-sm text-gray-500 mt-1">Link to external ticketing platform or payment page</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Event Location</label>
              <input value={form.event_location || ''} onChange={(e) => update('event_location', e.target.value)} placeholder="Specific venue or meeting point" className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Event Highlights</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.event_highlights || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, event_highlights: e.target.value }))}
                  placeholder="e.g., Live music performance, Traditional dance, Wildlife viewing, Cultural demonstrations"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('event_highlights', arrayInputs.event_highlights || ''))}
                />
                <button type="button" onClick={() => addToArray('event_highlights', arrayInputs.event_highlights || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.event_highlights || []).map((highlight, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    {highlight}
                    <button type="button" onClick={() => removeFromArray('event_highlights', idx)} className="ml-1 text-green-600 hover:text-green-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">What's Included</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.event_inclusions || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, event_inclusions: e.target.value }))}
                  placeholder="e.g., Entry ticket, Refreshments, Transportation, Guide, Equipment"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('event_inclusions', arrayInputs.event_inclusions || ''))}
                />
                <button type="button" onClick={() => addToArray('event_inclusions', arrayInputs.event_inclusions || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.event_inclusions || []).map((inclusion, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {inclusion}
                    <button type="button" onClick={() => removeFromArray('event_inclusions', idx)} className="ml-1 text-blue-600 hover:text-blue-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Prerequisites</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.event_prerequisites || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, event_prerequisites: e.target.value }))}
                  placeholder="e.g., Valid ID, Medical certificate, Fitness level, Age restrictions"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('event_prerequisites', arrayInputs.event_prerequisites || ''))}
                />
                <button type="button" onClick={() => addToArray('event_prerequisites', arrayInputs.event_prerequisites || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.event_prerequisites || []).map((prereq, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                    {prereq}
                    <button type="button" onClick={() => removeFromArray('event_prerequisites', idx)} className="ml-1 text-red-600 hover:text-red-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Event Features</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                <label className="flex items-center">
                  <input type="checkbox" checked={form.group_discounts || false} onChange={(e) => update('group_discounts', e.target.checked)} className="mr-2" />
                  Group Discounts
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.photography_allowed || false} onChange={(e) => update('photography_allowed', e.target.checked)} className="mr-2" />
                  Photography Allowed
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.recording_allowed || false} onChange={(e) => update('recording_allowed', e.target.checked)} className="mr-2" />
                  Recording Allowed
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.transportation_included || false} onChange={(e) => update('transportation_included', e.target.checked)} className="mr-2" />
                  Transportation Included
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.meals_provided || false} onChange={(e) => update('meals_provided', e.target.checked)} className="mr-2" />
                  Meals Included
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.certificates_provided || false} onChange={(e) => update('certificates_provided', e.target.checked)} className="mr-2" />
                  Certificates Provided
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Event Description</label>
              <textarea value={form.event_description || ''} onChange={(e) => update('event_description', e.target.value)} placeholder="Detailed description of the event, what participants can expect, and any special features" rows={3} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Cancellation Policy</label>
              <textarea value={form.event_cancellation_policy || ''} onChange={(e) => update('event_cancellation_policy', e.target.value)} placeholder="Refund policy and cancellation terms for the event" rows={2} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>
          </div>
        )

      case 'equipment rental':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Equipment Rental Details</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Rental Duration</label>
                <select value={form.rental_duration || ''} onChange={(e) => update('rental_duration', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="">Select duration</option>
                  <option value="hourly">Hourly</option>
                  <option value="half_day">Half Day (4 hours)</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom Duration</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Security Deposit (UGX)</label>
                <input type="number" value={form.deposit_required || ''} onChange={(e) => update('deposit_required', e.target.value ? Number(e.target.value) : undefined)} placeholder="Amount held as security" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Replacement Value (UGX)</label>
                <input type="number" value={form.replacement_value || ''} onChange={(e) => update('replacement_value', e.target.value ? Number(e.target.value) : undefined)} placeholder="Value for replacement if damaged" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Delivery Radius (km)</label>
                <input type="number" value={form.delivery_radius || ''} onChange={(e) => update('delivery_radius', e.target.value ? Number(e.target.value) : undefined)} placeholder="How far you deliver" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Rental Items</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.rental_items || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, rental_items: e.target.value }))}
                  placeholder="e.g., Mountain Bike, Camping Tent, Kayak, Hiking Boots"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('rental_items', arrayInputs.rental_items || ''))}
                />
                <button type="button" onClick={() => addToArray('rental_items', arrayInputs.rental_items || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.rental_items || []).map((item, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {item}
                    <button type="button" onClick={() => removeFromArray('rental_items', idx)} className="ml-1 text-blue-600 hover:text-blue-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Usage Instructions</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.usage_instructions || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, usage_instructions: e.target.value }))}
                  placeholder="e.g., Always wear helmet, Check brakes before use, Return with full fuel tank"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('usage_instructions', arrayInputs.usage_instructions || ''))}
                />
                <button type="button" onClick={() => addToArray('usage_instructions', arrayInputs.usage_instructions || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.usage_instructions || []).map((instruction, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                    {instruction}
                    <button type="button" onClick={() => removeFromArray('usage_instructions', idx)} className="ml-1 text-yellow-600 hover:text-yellow-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Maintenance Requirements</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.maintenance_requirements || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, maintenance_requirements: e.target.value }))}
                  placeholder="e.g., Clean after use, Check tire pressure, Report any damage immediately"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('maintenance_requirements', arrayInputs.maintenance_requirements || ''))}
                />
                <button type="button" onClick={() => addToArray('maintenance_requirements', arrayInputs.maintenance_requirements || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.maintenance_requirements || []).map((req, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                    {req}
                    <button type="button" onClick={() => removeFromArray('maintenance_requirements', idx)} className="ml-1 text-red-600 hover:text-red-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Rental Features</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                <label className="flex items-center">
                  <input type="checkbox" checked={form.insurance_required || false} onChange={(e) => update('insurance_required', e.target.checked)} className="mr-2" />
                  Insurance Required
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.delivery_available || false} onChange={(e) => update('delivery_available', e.target.checked)} className="mr-2" />
                  Delivery Available
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.maintenance_included || false} onChange={(e) => update('maintenance_included', e.target.checked)} className="mr-2" />
                  Maintenance Included
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.training_provided || false} onChange={(e) => update('training_provided', e.target.checked)} className="mr-2" />
                  Training Provided
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.cleaning_included || false} onChange={(e) => update('cleaning_included', e.target.checked)} className="mr-2" />
                  Cleaning Included
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.repair_service || false} onChange={(e) => update('repair_service', e.target.checked)} className="mr-2" />
                  Repair Service Available
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum Age Requirement</label>
                <input type="number" value={form.minimum_age || ''} onChange={(e) => update('minimum_age', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 18" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">License Requirements</label>
                <select value={form.license_required || ''} onChange={(e) => update('license_required', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="">Select license type</option>
                  <option value="none">No license required</option>
                  <option value="car">Car license</option>
                  <option value="motorcycle">Motorcycle license</option>
                  <option value="boat">Boat license</option>
                  <option value="specialized">Specialized license</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Equipment Condition</label>
              <textarea value={form.equipment_condition || ''} onChange={(e) => update('equipment_condition', e.target.value)} placeholder="Describe the condition of equipment, age, maintenance history, etc." rows={2} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Rental Terms & Conditions</label>
              <textarea value={form.rental_terms || ''} onChange={(e) => update('rental_terms', e.target.value)} placeholder="Late fees, damage policy, cancellation terms, etc." rows={3} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>
          </div>
        )

      case 'events & workshops':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Events & Workshops Details</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Type</label>
                <select value={form.event_type || ''} onChange={(e) => update('event_type', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="">Select event type</option>
                  <option value="workshop">Workshop</option>
                  <option value="cultural_show">Cultural Show</option>
                  <option value="cooking_class">Cooking Class</option>
                  <option value="art_class">Art Class</option>
                  <option value="music_lesson">Music Lesson</option>
                  <option value="dance_class">Dance Class</option>
                  <option value="language_class">Language Class</option>
                  <option value="photography_workshop">Photography Workshop</option>
                  <option value="craft_workshop">Craft Workshop</option>
                  <option value="business_seminar">Business Seminar</option>
                  <option value="wellness_retreat">Wellness Retreat</option>
                  <option value="other">Other Event</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Date & Time</label>
                <input type="datetime-local" value={form.event_datetime || ''} onChange={(e) => update('event_datetime', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration (hours)</label>
                <input type="number" value={form.event_duration_hours || ''} onChange={(e) => update('event_duration_hours', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 3" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Maximum Participants</label>
                <input type="number" value={form.max_participants || ''} onChange={(e) => update('max_participants', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 20" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Registration Deadline</label>
                <input type="datetime-local" value={form.registration_deadline || ''} onChange={(e) => update('registration_deadline', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum Age</label>
                <input type="number" value={form.minimum_age || ''} onChange={(e) => update('minimum_age', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 16" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Prerequisites</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.prerequisites || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, prerequisites: e.target.value }))}
                  placeholder="e.g., Bring your own notebook, Basic photography skills required, Comfortable clothing"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('prerequisites', arrayInputs.prerequisites || ''))}
                />
                <button type="button" onClick={() => addToArray('prerequisites', arrayInputs.prerequisites || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.prerequisites || []).map((prereq, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                    {prereq}
                    <button type="button" onClick={() => removeFromArray('prerequisites', idx)} className="ml-1 text-orange-600 hover:text-orange-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">What to Bring</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.what_to_bring || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, what_to_bring: e.target.value }))}
                  placeholder="e.g., Notebook and pen, Camera, Comfortable shoes, Water bottle"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('what_to_bring', arrayInputs.what_to_bring || ''))}
                />
                <button type="button" onClick={() => addToArray('what_to_bring', arrayInputs.what_to_bring || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.what_to_bring || []).map((item, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {item}
                    <button type="button" onClick={() => removeFromArray('what_to_bring', idx)} className="ml-1 text-blue-600 hover:text-blue-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Materials Included</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.materials_included || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, materials_included: e.target.value }))}
                  placeholder="e.g., Handouts, Art supplies, Cooking ingredients, Equipment"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('materials_included', arrayInputs.materials_included || ''))}
                />
                <button type="button" onClick={() => addToArray('materials_included', arrayInputs.materials_included || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.materials_included || []).map((material, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                    {material}
                    <button type="button" onClick={() => removeFromArray('materials_included', idx)} className="ml-1 text-purple-600 hover:text-purple-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Learning Outcomes</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.learning_outcomes || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, learning_outcomes: e.target.value }))}
                  placeholder="e.g., Learn basic cooking techniques, Understand local culture, Master photography basics"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('learning_outcomes', arrayInputs.learning_outcomes || ''))}
                />
                <button type="button" onClick={() => addToArray('learning_outcomes', arrayInputs.learning_outcomes || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.learning_outcomes || []).map((outcome, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    {outcome}
                    <button type="button" onClick={() => removeFromArray('learning_outcomes', idx)} className="ml-1 text-green-600 hover:text-green-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Instructor Credentials</label>
              <textarea value={form.instructor_credentials || ''} onChange={(e) => update('instructor_credentials', e.target.value)} placeholder="Qualifications, experience, certifications of the instructor(s)" rows={2} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Event Features</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                <label className="flex items-center">
                  <input type="checkbox" checked={form.certificates_provided || false} onChange={(e) => update('certificates_provided', e.target.checked)} className="mr-2" />
                  Certificates Provided
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.refreshments_included || false} onChange={(e) => update('refreshments_included', e.target.checked)} className="mr-2" />
                  Refreshments Included
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.take_home_materials || false} onChange={(e) => update('take_home_materials', e.target.checked)} className="mr-2" />
                  Take-Home Materials
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.photography_allowed || false} onChange={(e) => update('photography_allowed', e.target.checked)} className="mr-2" />
                  Photography Allowed
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.recording_allowed || false} onChange={(e) => update('recording_allowed', e.target.checked)} className="mr-2" />
                  Recording Allowed
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.group_discounts || false} onChange={(e) => update('group_discounts', e.target.checked)} className="mr-2" />
                  Group Discounts Available
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Event Description</label>
              <textarea value={form.event_description || ''} onChange={(e) => update('event_description', e.target.value)} placeholder="Detailed description of the event, what participants will experience, and any special highlights" rows={3} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Cancellation Policy</label>
              <textarea value={form.event_cancellation_policy || ''} onChange={(e) => update('event_cancellation_policy', e.target.value)} placeholder="Refund policy, cancellation deadlines, and terms" rows={2} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>
          </div>
        )

      case 'travel agencies':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Travel Agency Details</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
                <input type="number" value={form.years_experience || ''} onChange={(e) => update('years_experience', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 10" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Booking Fee (UGX)</label>
                <input type="number" value={form.booking_fee || ''} onChange={(e) => update('booking_fee', e.target.value ? Number(e.target.value) : undefined)} placeholder="Service fee per booking" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">License Number</label>
                <input value={form.license_number || ''} onChange={(e) => update('license_number', e.target.value)} placeholder="Tourism license number" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">IATA Number (if applicable)</label>
                <input value={form.iata_number || ''} onChange={(e) => update('iata_number', e.target.value)} placeholder="International Air Transport Association number" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Certifications</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.certifications || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, certifications: e.target.value }))}
                  placeholder="e.g., UTA Certified, IATA Certified, Sustainable Tourism Certified"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('certifications', arrayInputs.certifications || ''))}
                />
                <button type="button" onClick={() => addToArray('certifications', arrayInputs.certifications || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.certifications || []).map((cert, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {cert}
                    <button type="button" onClick={() => removeFromArray('certifications', idx)} className="ml-1 text-blue-600 hover:text-blue-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Specializations</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.specializations || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, specializations: e.target.value }))}
                  placeholder="e.g., Adventure Travel, Cultural Tours, Wildlife Safaris, Luxury Travel"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('specializations', arrayInputs.specializations || ''))}
                />
                <button type="button" onClick={() => addToArray('specializations', arrayInputs.specializations || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.specializations || []).map((spec, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                    {spec}
                    <button type="button" onClick={() => removeFromArray('specializations', idx)} className="ml-1 text-purple-600 hover:text-purple-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Services Offered</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.services_offered || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, services_offered: e.target.value }))}
                  placeholder="e.g., Tour Planning, Hotel Booking, Flight Reservations, Visa Assistance"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('services_offered', arrayInputs.services_offered || ''))}
                />
                <button type="button" onClick={() => addToArray('services_offered', arrayInputs.services_offered || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.services_offered || []).map((service, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                    {service}
                    <button type="button" onClick={() => removeFromArray('services_offered', idx)} className="ml-1 text-indigo-600 hover:text-indigo-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Destinations Covered</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.destinations_covered || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, destinations_covered: e.target.value }))}
                  placeholder="e.g., Kampala, Queen Elizabeth National Park, Bwindi Forest, Jinja"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('destinations_covered', arrayInputs.destinations_covered || ''))}
                />
                <button type="button" onClick={() => addToArray('destinations_covered', arrayInputs.destinations_covered || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.destinations_covered || []).map((destination, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    {destination}
                    <button type="button" onClick={() => removeFromArray('destinations_covered', idx)} className="ml-1 text-green-600 hover:text-green-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Success Stories</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.success_stories || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, success_stories: e.target.value }))}
                  placeholder="e.g., Successfully organized 500+ gorilla trekking tours, 98% client satisfaction rate"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('success_stories', arrayInputs.success_stories || ''))}
                />
                <button type="button" onClick={() => addToArray('success_stories', arrayInputs.success_stories || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.success_stories || []).map((story, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                    {story}
                    <button type="button" onClick={() => removeFromArray('success_stories', idx)} className="ml-1 text-yellow-600 hover:text-yellow-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Agency Features</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                <label className="flex items-center">
                  <input type="checkbox" checked={form.customization_available || false} onChange={(e) => update('customization_available', e.target.checked)} className="mr-2" />
                  Customization Available
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.emergency_support || false} onChange={(e) => update('emergency_support', e.target.checked)} className="mr-2" />
                  24/7 Emergency Support
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.insurance_brokerage || false} onChange={(e) => update('insurance_brokerage', e.target.checked)} className="mr-2" />
                  Travel Insurance Brokerage
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.visa_assistance || false} onChange={(e) => update('visa_assistance', e.target.checked)} className="mr-2" />
                  Visa Assistance
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.group_bookings || false} onChange={(e) => update('group_bookings', e.target.checked)} className="mr-2" />
                  Group Bookings
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.corporate_accounts || false} onChange={(e) => update('corporate_accounts', e.target.checked)} className="mr-2" />
                  Corporate Accounts
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Agency Description</label>
              <textarea value={form.agency_description || ''} onChange={(e) => update('agency_description', e.target.value)} placeholder="Tell tourists about your agency's story, mission, and what makes you unique" rows={3} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Information</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input value={form.emergency_phone || ''} onChange={(e) => update('emergency_phone', e.target.value)} placeholder="Emergency contact phone" className="mt-1 w-full border rounded-md px-3 py-2" />
                <input value={form.website_url || ''} onChange={(e) => update('website_url', e.target.value)} placeholder="Website URL" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>
          </div>
        )

      case 'hostels & guesthouses':
      case 'homestays':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Accommodation Details</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Property Type</label>
                <select value={form.property_type || ''} onChange={(e) => update('property_type', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="">Select property type</option>
                  <option value="hostel">Hostel</option>
                  <option value="guesthouse">Guesthouse</option>
                  <option value="homestay">Homestay</option>
                  <option value="boutique_hotel">Boutique Hotel</option>
                  <option value="lodge">Lodge</option>
                  <option value="resort">Resort</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Rooms</label>
                <input type="number" value={form.total_rooms || ''} onChange={(e) => update('total_rooms', e.target.value ? Number(e.target.value) : undefined)} placeholder="Number of rooms available" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Check-in Time</label>
                <input type="time" value={form.check_in_time || ''} onChange={(e) => update('check_in_time', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Check-out Time</label>
                <input type="time" value={form.check_out_time || ''} onChange={(e) => update('check_out_time', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum Stay (nights)</label>
                <input type="number" value={form.minimum_stay || ''} onChange={(e) => update('minimum_stay', e.target.value ? Number(e.target.value) : undefined)} placeholder="Minimum nights required" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Maximum Guests</label>
                <input type="number" value={form.maximum_guests || ''} onChange={(e) => update('maximum_guests', e.target.value ? Number(e.target.value) : undefined)} placeholder="Maximum number of guests" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Room Types Available</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.room_types || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, room_types: e.target.value }))}
                  placeholder="e.g., Single Room, Double Room, Dormitory, Family Suite"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('room_types', arrayInputs.room_types || ''))}
                />
                <button type="button" onClick={() => addToArray('room_types', arrayInputs.room_types || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.room_types || []).map((type, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                    {type}
                    <button type="button" onClick={() => removeFromArray('room_types', idx)} className="ml-1 text-purple-600 hover:text-purple-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Room Amenities</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.room_amenities || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, room_amenities: e.target.value }))}
                  placeholder="e.g., WiFi, Air Conditioning, Hot Water, Mosquito Nets, Towels"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('room_amenities', arrayInputs.room_amenities || ''))}
                />
                <button type="button" onClick={() => addToArray('room_amenities', arrayInputs.room_amenities || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.room_amenities || []).map((amenity, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {amenity}
                    <button type="button" onClick={() => removeFromArray('room_amenities', idx)} className="ml-1 text-blue-600 hover:text-blue-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Common Area Facilities</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.common_facilities || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, common_facilities: e.target.value }))}
                  placeholder="e.g., Restaurant, Bar, Garden, Swimming Pool, Laundry Service"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('common_facilities', arrayInputs.common_facilities || ''))}
                />
                <button type="button" onClick={() => addToArray('common_facilities', arrayInputs.common_facilities || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.common_facilities || []).map((facility, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                    {facility}
                    <button type="button" onClick={() => removeFromArray('common_facilities', idx)} className="ml-1 text-indigo-600 hover:text-indigo-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Property Features</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                <label className="flex items-center">
                  <input type="checkbox" checked={form.parking_available || false} onChange={(e) => update('parking_available', e.target.checked)} className="mr-2" />
                  Parking Available
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.pet_friendly || false} onChange={(e) => update('pet_friendly', e.target.checked)} className="mr-2" />
                  Pet Friendly
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.breakfast_included || false} onChange={(e) => update('breakfast_included', e.target.checked)} className="mr-2" />
                  Breakfast Included
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.wifi_available || false} onChange={(e) => update('wifi_available', e.target.checked)} className="mr-2" />
                  WiFi Available
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.generator_backup || false} onChange={(e) => update('generator_backup', e.target.checked)} className="mr-2" />
                  Generator Backup
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.smoking_allowed || false} onChange={(e) => update('smoking_allowed', e.target.checked)} className="mr-2" />
                  Smoking Allowed
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.children_allowed || false} onChange={(e) => update('children_allowed', e.target.checked)} className="mr-2" />
                  Children Allowed
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.disabled_access || false} onChange={(e) => update('disabled_access', e.target.checked)} className="mr-2" />
                  Disabled Access
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.concierge_service || false} onChange={(e) => update('concierge_service', e.target.checked)} className="mr-2" />
                  Concierge Service
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">House Rules</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.house_rules || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, house_rules: e.target.value }))}
                  placeholder="e.g., No loud music after 10 PM, Respect quiet hours, No cooking in rooms"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('house_rules', arrayInputs.house_rules || ''))}
                />
                <button type="button" onClick={() => addToArray('house_rules', arrayInputs.house_rules || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.house_rules || []).map((rule, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                    {rule}
                    <button type="button" onClick={() => removeFromArray('house_rules', idx)} className="ml-1 text-red-600 hover:text-red-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Nearby Attractions</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.nearby_attractions || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, nearby_attractions: e.target.value }))}
                  placeholder="e.g., Local Market, Lake Victoria, Hiking Trails, Cultural Sites"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('nearby_attractions', arrayInputs.nearby_attractions || ''))}
                />
                <button type="button" onClick={() => addToArray('nearby_attractions', arrayInputs.nearby_attractions || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.nearby_attractions || []).map((attraction, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    {attraction}
                    <button type="button" onClick={() => removeFromArray('nearby_attractions', idx)} className="ml-1 text-green-600 hover:text-green-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Local Recommendations</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.local_recommendations || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, local_recommendations: e.target.value }))}
                  placeholder="e.g., Best local restaurants, Hidden gems, Safe walking routes, Cultural experiences"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('local_recommendations', arrayInputs.local_recommendations || ''))}
                />
                <button type="button" onClick={() => addToArray('local_recommendations', arrayInputs.local_recommendations || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.local_recommendations || []).map((rec, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                    {rec}
                    <button type="button" onClick={() => removeFromArray('local_recommendations', idx)} className="ml-1 text-yellow-600 hover:text-yellow-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Check-in Process</label>
              <textarea value={form.check_in_process || ''} onChange={(e) => update('check_in_process', e.target.value)} placeholder="Describe how guests check in, what they need to bring, any special instructions" rows={2} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>

          </div>
        )

      case 'flights':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Flight Booking Details</h4>

            {/* Basic Flight Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Flight Number</label>
                <input value={form.flight_number || ''} onChange={(e) => update('flight_number', e.target.value)} placeholder="e.g., QR123" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Airline</label>
                <input value={form.airline || ''} onChange={(e) => update('airline', e.target.value)} placeholder="e.g., Qatar Airways" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Aircraft Type</label>
                <input value={form.aircraft_type || ''} onChange={(e) => update('aircraft_type', e.target.value)} placeholder="e.g., Boeing 777" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Currency</label>
                <select value={form.currency || 'UGX'} onChange={(e) => update('currency', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="UGX">UGX</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            {/* Route Information */}
            <div className="border-t pt-4">
              <h5 className="font-medium text-gray-900 mb-3">Route Information</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Departure City</label>
                  <input value={form.departure_city || ''} onChange={(e) => update('departure_city', e.target.value)} placeholder="e.g., Kampala" className="mt-1 w-full border rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Arrival City</label>
                  <input value={form.arrival_city || ''} onChange={(e) => update('arrival_city', e.target.value)} placeholder="e.g., Nairobi" className="mt-1 w-full border rounded-md px-3 py-2" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Departure Airport</label>
                  <input value={form.departure_airport || ''} onChange={(e) => update('departure_airport', e.target.value)} placeholder="e.g., KIA" className="mt-1 w-full border rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Arrival Airport</label>
                  <input value={form.arrival_airport || ''} onChange={(e) => update('arrival_airport', e.target.value)} placeholder="e.g., JKA" className="mt-1 w-full border rounded-md px-3 py-2" />
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="border-t pt-4">
              <h5 className="font-medium text-gray-900 mb-3">Schedule</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Departure Time</label>
                  <input type="datetime-local" value={form.departure_time || ''} onChange={(e) => update('departure_time', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Arrival Time</label>
                  <input type="datetime-local" value={form.arrival_time || ''} onChange={(e) => update('arrival_time', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                  <input type="number" value={form.duration_minutes || ''} onChange={(e) => update('duration_minutes', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 120" className="mt-1 w-full border rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Flight Status</label>
                  <select value={form.flight_status || 'active'} onChange={(e) => update('flight_status', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                    <option value="active">Active</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="delayed">Delayed</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="border-t pt-4">
              <h5 className="font-medium text-gray-900 mb-3">Pricing</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Economy Price</label>
                  <input type="number" value={form.economy_price || ''} onChange={(e) => update('economy_price', e.target.value ? Number(e.target.value) : undefined)} placeholder="0.00" className="mt-1 w-full border rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Price</label>
                  <input type="number" value={form.business_price || ''} onChange={(e) => update('business_price', e.target.value ? Number(e.target.value) : undefined)} placeholder="0.00" className="mt-1 w-full border rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Class Price</label>
                  <input type="number" value={form.first_class_price || ''} onChange={(e) => update('first_class_price', e.target.value ? Number(e.target.value) : undefined)} placeholder="0.00" className="mt-1 w-full border rounded-md px-3 py-2" />
                </div>
              </div>
            </div>

            {/* Capacity */}
            <div className="border-t pt-4">
              <h5 className="font-medium text-gray-900 mb-3">Capacity</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Seats</label>
                  <input type="number" value={form.total_seats || ''} onChange={(e) => update('total_seats', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 200" className="mt-1 w-full border rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Available Seats</label>
                  <input type="number" value={form.available_seats || ''} onChange={(e) => update('available_seats', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 180" className="mt-1 w-full border rounded-md px-3 py-2" />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="border-t pt-4">
              <h5 className="font-medium text-gray-900 mb-3">Additional Information</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Flight Class</label>
                  <select value={form.flight_class || 'economy'} onChange={(e) => update('flight_class', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                    <option value="economy">Economy</option>
                    <option value="business">Business</option>
                    <option value="first_class">First Class</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Booking Deadline (hours before)</label>
                  <input type="number" value={form.booking_deadline_hours || ''} onChange={(e) => update('booking_deadline_hours', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 24" className="mt-1 w-full border rounded-md px-3 py-2" />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Baggage Allowance</label>
                <input value={form.baggage_allowance || ''} onChange={(e) => update('baggage_allowance', e.target.value)} placeholder="e.g., 20kg checked, 7kg carry-on" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            {/* Flight Amenities */}
            <div className="border-t pt-4">
              <h5 className="font-medium text-gray-900 mb-3">Flight Amenities</h5>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.flight_amenities || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, flight_amenities: e.target.value }))}
                  placeholder="e.g., WiFi, In-flight Entertainment, Meals, USB Charging"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('flight_amenities', arrayInputs.flight_amenities || ''))}
                />
                <button type="button" onClick={() => addToArray('flight_amenities', arrayInputs.flight_amenities || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.flight_amenities || []).map((amenity, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {amenity}
                    <button type="button" onClick={() => removeFromArray('flight_amenities', idx)} className="ml-1 text-blue-600 hover:text-blue-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Booking Information */}
            <div className="border-t pt-4">
              <h5 className="font-medium text-gray-900 mb-3">Booking Information</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Booking Fee (UGX)</label>
                  <input type="number" value={form.booking_fee || ''} onChange={(e) => update('booking_fee', e.target.value ? Number(e.target.value) : undefined)} placeholder="Service fee per booking" className="mt-1 w-full border rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cancellation Policy</label>
                  <input value={form.cancellation_policy || ''} onChange={(e) => update('cancellation_policy', e.target.value)} placeholder="e.g., Free cancellation 24h before" className="mt-1 w-full border rounded-md px-3 py-2" />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Payment Methods</label>
                <div className="flex gap-2">
                  <input
                    value={arrayInputs.payment_methods || ''}
                    onChange={(e) => setArrayInputs(prev => ({ ...prev, payment_methods: e.target.value }))}
                    placeholder="e.g., Credit Card, Mobile Money, Bank Transfer"
                    className="flex-1 border rounded-md px-3 py-2"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('payment_methods', arrayInputs.payment_methods || ''))}
                  />
                  <button type="button" onClick={() => addToArray('payment_methods', arrayInputs.payment_methods || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(form.payment_methods || []).map((method, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      {method}
                      <button type="button" onClick={() => removeFromArray('payment_methods', idx)} className="ml-1 text-green-600 hover:text-green-800">×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Flight Features */}
            <div className="border-t pt-4">
              <h5 className="font-medium text-gray-900 mb-3">Flight Features</h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <label className="flex items-center">
                  <input type="checkbox" checked={form.refund_policy || false} onChange={(e) => update('refund_policy', e.target.checked)} className="mr-2" />
                  Refundable Tickets
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.flexible_booking || false} onChange={(e) => update('flexible_booking', e.target.checked)} className="mr-2" />
                  Flexible Booking
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.insurance_included || false} onChange={(e) => update('insurance_included', e.target.checked)} className="mr-2" />
                  Travel Insurance Included
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.flight_meals_included || false} onChange={(e) => update('flight_meals_included', e.target.checked)} className="mr-2" />
                  Meals Included
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.lounge_access || false} onChange={(e) => update('lounge_access', e.target.checked)} className="mr-2" />
                  Lounge Access
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={form.priority_boarding || false} onChange={(e) => update('priority_boarding', e.target.checked)} className="mr-2" />
                  Priority Boarding
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
              <textarea value={form.flight_notes || ''} onChange={(e) => update('flight_notes', e.target.value)} placeholder="Any additional information about the flight booking service" rows={3} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900">{initial?.id ? 'Edit Service' : 'Add Service'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form
          className="px-6 py-4 space-y-4"
          onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select value={form.category_id as any} onChange={(e) => update('category_id', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" required>
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input value={form.title as any} onChange={(e) => update('title', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea value={form.description as any} onChange={(e) => update('description', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" rows={3} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Currency</label>
              <input value={form.currency as any} onChange={(e) => update('currency', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Price</label>
              <input type="number" value={form.price as any} onChange={(e) => update('price', Number(e.target.value))} className="mt-1 w-full border rounded-md px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <input value={form.location as any} onChange={(e) => update('location', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Duration (hours)</label>
              <input type="number" value={form.duration_hours as any} onChange={(e) => update('duration_hours', e.target.value ? Number(e.target.value) : undefined)} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Max Capacity</label>
              <input type="number" value={form.max_capacity as any} onChange={(e) => update('max_capacity', e.target.value ? Number(e.target.value) : undefined)} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Amenities</label>
            <div className="flex gap-2">
              <input
                value={arrayInputs.amenities || ''}
                onChange={(e) => setArrayInputs(prev => ({ ...prev, amenities: e.target.value }))}
                placeholder="e.g., WiFi, Breakfast"
                className="flex-1 border rounded-md px-3 py-2"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('amenities', arrayInputs.amenities || ''))}
              />
              <button type="button" onClick={() => addToArray('amenities', arrayInputs.amenities || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(form.amenities as string[]).map((amenity, idx) => (
                <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                  {amenity}
                  <button type="button" onClick={() => removeFromArray('amenities', idx)} className="ml-1 text-gray-600 hover:text-gray-800">×</button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Images</label>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload(file)
                }}
                disabled={uploadingImage}
                className="w-full border rounded-md px-3 py-2"
              />
              {uploadingImage && <p className="text-sm text-gray-500">Uploading image...</p>}

              <div className="flex flex-wrap gap-2 mt-2">
                {(form.images as string[]).map((src, idx) => (
                  <div key={idx} className="relative">
                    <img src={src} alt={`Service ${idx + 1}`} className="w-20 h-20 object-cover rounded border" />
                    <button type="button" onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {renderCategorySpecificFields()}

          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border bg-white">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white">{initial?.id ? 'Save changes' : 'Create service'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
