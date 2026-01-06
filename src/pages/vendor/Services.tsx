import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Service } from '../../types'
import { useServices } from '../../hooks/hook'
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
    try {
      await createService({
        vendor_id: vendorId!,
        category_id: data.category_id || 'cat_tour',
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
      alert('Failed to create service. Please try again.')
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

  const onDelete = async (id: string) => {
    if (!confirm('Delete this service?')) return
    try {
      await deleteService(id)
    } catch (err) {
      console.error('Failed to delete service:', err)
      alert('Failed to delete service. Please try again.')
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Services</h1>
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Add Service
        </button>
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
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                    No services yet. Click Add Service to create one.
                  </td>
                </tr>
              ) : (
                services.map(s => (
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
                      <button onClick={() => onDelete(s.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
  const [form, setForm] = useState<Partial<Service>>({
    title: initial?.title || '',
    description: initial?.description || '',
    category_id: initial?.category_id || 'cat_tour',
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
    switch (form.category_id) {
      case 'cat_hotel':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Hotel Details</h4>

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

            <div>
              <label className="block text-sm font-medium text-gray-700">Star Rating</label>
              <select value={form.star_rating || ''} onChange={(e) => update('star_rating', e.target.value ? Number(e.target.value) : undefined)} className="mt-1 w-full border rounded-md px-3 py-2">
                <option value="">Select rating</option>
                <option value="1">1 Star</option>
                <option value="2">2 Stars</option>
                <option value="3">3 Stars</option>
                <option value="4">4 Stars</option>
                <option value="5">5 Stars</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Room Types</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.room_types || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, room_types: e.target.value }))}
                  placeholder="e.g., Deluxe Suite"
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
              <label className="block text-sm font-medium text-gray-700">Facilities</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.facilities || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, facilities: e.target.value }))}
                  placeholder="e.g., WiFi, Pool"
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
          </div>
        )

      case 'cat_tour':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Tour Details</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Difficulty Level</label>
                <select value={form.difficulty_level || ''} onChange={(e) => update('difficulty_level', e.target.value as any || undefined)} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="">Select difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="challenging">Challenging</option>
                  <option value="difficult">Difficult</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum Age</label>
                <input type="number" value={form.minimum_age || ''} onChange={(e) => update('minimum_age', e.target.value ? Number(e.target.value) : undefined)} className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Languages Offered</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.languages_offered || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, languages_offered: e.target.value }))}
                  placeholder="e.g., English, Swahili"
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
              <label className="block text-sm font-medium text-gray-700">What's Included</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.included_items || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, included_items: e.target.value }))}
                  placeholder="e.g., Meals, Transport"
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
                  placeholder="e.g., Flights, Insurance"
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
          </div>
        )

      case 'cat_transport':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Transport Details</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Vehicle Type</label>
                <input value={form.vehicle_type || ''} onChange={(e) => update('vehicle_type', e.target.value)} placeholder="e.g., Minibus, SUV" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Vehicle Capacity</label>
                <input type="number" value={form.vehicle_capacity || ''} onChange={(e) => update('vehicle_capacity', e.target.value ? Number(e.target.value) : undefined)} className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Route Description</label>
              <textarea value={form.route_description || ''} onChange={(e) => update('route_description', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" rows={3} placeholder="Describe the route and stops" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Pickup Locations</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.pickup_locations || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, pickup_locations: e.target.value }))}
                  placeholder="e.g., Kampala City Center"
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
          </div>
        )

      case 'cat_restaurant':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Restaurant Details</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Cuisine Type</label>
                <input value={form.cuisine_type || ''} onChange={(e) => update('cuisine_type', e.target.value)} placeholder="e.g., Ugandan, Italian" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Average Cost per Person</label>
                <input type="number" value={form.average_cost_per_person || ''} onChange={(e) => update('average_cost_per_person', e.target.value ? Number(e.target.value) : undefined)} className="mt-1 w-full border rounded-md px-3 py-2" />
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
              <label className="block text-sm font-medium text-gray-700">Dietary Options</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.dietary_options || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, dietary_options: e.target.value }))}
                  placeholder="e.g., Vegetarian, Halal"
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
          </div>
        )

      case 'cat_activities':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Activity Details</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Activity Type</label>
                <input value={form.activity_type || ''} onChange={(e) => update('activity_type', e.target.value)} placeholder="e.g., Ziplining, Rafting" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Skill Level Required</label>
                <select value={form.skill_level_required || ''} onChange={(e) => update('skill_level_required', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="">Select skill level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input type="checkbox" checked={form.safety_briefing_required || false} onChange={(e) => update('safety_briefing_required', e.target.checked)} className="mr-2" />
                Safety briefing required
              </label>
              <label className="flex items-center">
                <input type="checkbox" checked={form.weather_dependent || false} onChange={(e) => update('weather_dependent', e.target.checked)} className="mr-2" />
                Weather dependent
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Equipment Provided</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.equipment_provided || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, equipment_provided: e.target.value }))}
                  placeholder="e.g., Helmet, Harness"
                  className="flex-1 border rounded-md px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('equipment_provided', arrayInputs.equipment_provided || ''))}
                />
                <button type="button" onClick={() => addToArray('equipment_provided', arrayInputs.equipment_provided || '')} className="px-3 py-2 bg-gray-900 text-white rounded-md">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.equipment_provided || []).map((equipment, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                    {equipment}
                    <button type="button" onClick={() => removeFromArray('equipment_provided', idx)} className="ml-1 text-orange-600 hover:text-orange-800">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Seasonal Availability</label>
              <input value={form.seasonal_availability || ''} onChange={(e) => update('seasonal_availability', e.target.value)} placeholder="e.g., Year-round, Dry season only" className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>
          </div>
        )

      case 'cat_rental':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Rental Details</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Rental Duration</label>
                <select value={form.rental_duration || ''} onChange={(e) => update('rental_duration', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                  <option value="">Select duration</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Deposit Required (UGX)</label>
                <input type="number" value={form.deposit_required || ''} onChange={(e) => update('deposit_required', e.target.value ? Number(e.target.value) : undefined)} className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input type="checkbox" checked={form.insurance_required || false} onChange={(e) => update('insurance_required', e.target.checked)} className="mr-2" />
                Insurance required
              </label>
              <label className="flex items-center">
                <input type="checkbox" checked={form.delivery_available || false} onChange={(e) => update('delivery_available', e.target.checked)} className="mr-2" />
                Delivery available
              </label>
              <label className="flex items-center">
                <input type="checkbox" checked={form.maintenance_included || false} onChange={(e) => update('maintenance_included', e.target.checked)} className="mr-2" />
                Maintenance included
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Rental Items</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.rental_items || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, rental_items: e.target.value }))}
                  placeholder="e.g., Mountain Bike, Camping Tent"
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
          </div>
        )

      case 'cat_events':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Event Details</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Type</label>
                <input value={form.event_type || ''} onChange={(e) => update('event_type', e.target.value)} placeholder="e.g., Workshop, Cultural Show" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Date</label>
                <input type="date" value={form.event_date || ''} onChange={(e) => update('event_date', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration (hours)</label>
                <input type="number" value={form.event_duration_hours || ''} onChange={(e) => update('event_duration_hours', e.target.value ? Number(e.target.value) : undefined)} className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Participants</label>
                <input type="number" value={form.max_participants || ''} onChange={(e) => update('max_participants', e.target.value ? Number(e.target.value) : undefined)} className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Prerequisites</label>
              <input value={form.prerequisites || ''} onChange={(e) => update('prerequisites', e.target.value)} placeholder="e.g., Bring your own notebook" className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Materials Included</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.materials_included || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, materials_included: e.target.value }))}
                  placeholder="e.g., Handouts, Equipment"
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
          </div>
        )

      case 'cat_agency':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Agency Details</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Booking Fee (UGX)</label>
                <input type="number" value={form.booking_fee || ''} onChange={(e) => update('booking_fee', e.target.value ? Number(e.target.value) : undefined)} className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input type="checkbox" checked={form.customization_available || false} onChange={(e) => update('customization_available', e.target.checked)} className="mr-2" />
                Customization available
              </label>
              <label className="flex items-center">
                <input type="checkbox" checked={form.emergency_support || false} onChange={(e) => update('emergency_support', e.target.checked)} className="mr-2" />
                24/7 Emergency support
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Services Offered</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.services_offered || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, services_offered: e.target.value }))}
                  placeholder="e.g., Tour Planning, Hotel Booking"
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
                  placeholder="e.g., Kampala, Queen Elizabeth NP"
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
          </div>
        )

      case 'cat_hostel':
      case 'cat_homestay':
        return (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Accommodation Details</h4>

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

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input type="checkbox" checked={form.parking_available || false} onChange={(e) => update('parking_available', e.target.checked)} className="mr-2" />
                Parking available
              </label>
              <label className="flex items-center">
                <input type="checkbox" checked={form.pet_friendly || false} onChange={(e) => update('pet_friendly', e.target.checked)} className="mr-2" />
                Pet friendly
              </label>
              <label className="flex items-center">
                <input type="checkbox" checked={form.breakfast_included || false} onChange={(e) => update('breakfast_included', e.target.checked)} className="mr-2" />
                Breakfast included
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Room Amenities</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.room_amenities || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, room_amenities: e.target.value }))}
                  placeholder="e.g., WiFi, Air Conditioning"
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
              <label className="block text-sm font-medium text-gray-700">Nearby Attractions</label>
              <div className="flex gap-2">
                <input
                  value={arrayInputs.nearby_attractions || ''}
                  onChange={(e) => setArrayInputs(prev => ({ ...prev, nearby_attractions: e.target.value }))}
                  placeholder="e.g., Market, Lake"
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
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input value={form.title as any} onChange={(e) => update('title', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea value={form.description as any} onChange={(e) => update('description', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" rows={3} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select value={form.category_id as any} onChange={(e) => update('category_id', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                <option value="cat_hotel">Hotels</option>
                <option value="cat_hostel">Hostels & Guesthouses</option>
                <option value="cat_homestay">Homestays</option>
                <option value="cat_transport">Transport</option>
                <option value="cat_activities">Activities</option>
                <option value="cat_restaurant">Restaurants</option>
                <option value="cat_tour">Tour Packages</option>
                <option value="cat_activities">Activities & Experiences</option>
                <option value="cat_rental">Equipment Rental</option>
                <option value="cat_events">Events & Workshops</option>
                <option value="cat_agency">Travel Agencies</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Currency</label>
              <input value={form.currency as any} onChange={(e) => update('currency', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
