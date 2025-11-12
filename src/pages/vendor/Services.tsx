import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Service } from '../../types'
import { createService, deleteService, getServices, updateService } from '../../store/vendorStore'
import { formatCurrency } from '../../lib/utils'
import { StatusBadge } from '../../components/StatusBadge'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

const categories: Service['category'][] = ['hotel', 'transport', 'guide', 'restaurant', 'tour_package']

export default function VendorServices() {
  const { profile } = useAuth()
  const vendorId = profile?.id || 'vendor_demo'

  const [services, setServices] = useState<Service[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)

  const load = () => setServices(getServices(vendorId))
  useEffect(() => { load() }, [])

  const onCreate = (data: Partial<Service>) => {
    const newSvc = createService(vendorId, {
      name: data.name || '',
      description: data.description || '',
      category: (data.category as Service['category']) || 'tour_package',
      price: Number(data.price) || 0,
      currency: (data.currency as string) || 'UGX',
      images: (data.images as string[]) || [],
      availability_status: (data.availability_status as any) || 'available',
      status: (data.status as any) || 'pending'
    })
    setServices([newSvc, ...services])
  }

  const onUpdate = (id: string, updates: Partial<Service>) => {
    const updated = updateService(vendorId, id, updates)
    if (updated) setServices(prev => prev.map(s => s.id === id ? updated : s))
  }

  const onDelete = (id: string) => {
    if (!confirm('Delete this service?')) return
    deleteService(vendorId, id)
    setServices(prev => prev.filter(s => s.id !== id))
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
              {services.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{s.name}</div>
                    <div className="text-sm text-gray-500 truncate max-w-sm">{s.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">{s.category.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(s.price, s.currency)}</td>
                  <td className="px-6 py-4"><StatusBadge status={s.status} variant="small" /></td>
                  <td className="px-6 py-4"><StatusBadge status={s.availability_status} variant="small" /></td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => { setEditing(s); setShowForm(true) }} className="text-blue-600 hover:text-blue-800 mr-3">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDelete(s.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">No services yet. Click Add Service to create one.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <ServiceForm
          initial={editing || undefined}
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

function ServiceForm({ initial, onClose, onSubmit }: { initial?: Partial<Service>; onClose: () => void; onSubmit: (payload: Partial<Service>) => void }) {
  const [form, setForm] = useState<Partial<Service>>({
    name: initial?.name || '',
    description: initial?.description || '',
    category: initial?.category || 'tour_package',
    price: initial?.price || 0,
    currency: initial?.currency || 'UGX',
    images: initial?.images || [],
    availability_status: initial?.availability_status || 'available',
    status: initial?.status || 'pending'
  })

  const [imageInput, setImageInput] = useState('')

  const update = (k: keyof Service, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900">{initial?.id ? 'Edit Service' : 'Add Service'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form
          className="px-6 py-4 space-y-4"
          onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input value={form.name as any} onChange={(e) => update('name', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea value={form.description as any} onChange={(e) => update('description', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" rows={3} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select value={form.category as any} onChange={(e) => update('category', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                {categories.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
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
              <label className="block text-sm font-medium text-gray-700">Availability</label>
              <select value={form.availability_status as any} onChange={(e) => update('availability_status', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select value={form.status as any} onChange={(e) => update('status', e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2">
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Add image URL</label>
              <div className="flex">
                <input value={imageInput} onChange={(e) => setImageInput(e.target.value)} placeholder="https://" className="mt-1 w-full border rounded-l-md px-3 py-2" />
                <button type="button" onClick={() => { if (!imageInput) return; update('images', [...(form.images || []), imageInput]); setImageInput('') }} className="mt-1 px-3 py-2 bg-gray-900 text-white rounded-r-md">Add</button>
              </div>
              {(form.images || []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {(form.images as string[]).map((src, idx) => (
                    <div key={idx} className="flex items-center space-x-2 bg-gray-100 rounded px-2 py-1 text-xs">
                      <span className="truncate max-w-[200px]">{src}</span>
                      <button type="button" className="text-red-600" onClick={() => update('images', (form.images as string[]).filter((_, i) => i !== idx))}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border bg-white">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white">{initial?.id ? 'Save changes' : 'Create service'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
