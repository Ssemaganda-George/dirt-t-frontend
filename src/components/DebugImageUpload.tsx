// =====================================================
// DEBUG COMPONENT FOR IMAGE UPLOAD
// =====================================================
// Add this to a test page to debug image upload issues

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { uploadServiceImage, addServiceImage } from '../lib/imageUpload'

export default function DebugImageUpload() {
  const [user, setUser] = useState<any>(null)
  const [services, setServices] = useState<any[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkAuth()
    loadServices()
  }, [])

  const addDebug = (message: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    addDebug(`User: ${user ? user.email : 'Not authenticated'}`)
  }

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, title, vendor_id, images')
        .limit(5)

      if (error) {
        addDebug(`Error loading services: ${error.message}`)
      } else {
        setServices(data || [])
        addDebug(`Loaded ${data?.length || 0} services`)
      }
    } catch (error) {
      addDebug(`Failed to load services: ${error}`)
    }
  }

  const testServiceAccess = async (serviceId: string) => {
    try {
      addDebug(`Testing access to service: ${serviceId}`)
      const { data, error } = await supabase
        .from('services')
        .select('id, title, vendor_id, images')
        .eq('id', serviceId)
        .single()

      if (error) {
        addDebug(`Access test failed: ${error.message}`)
      } else {
        addDebug(`Access test successful: ${data.title}`)
      }
    } catch (error) {
      addDebug(`Access test error: ${error}`)
    }
  }

  const testImageUpload = async () => {
    if (!selectedServiceId) {
      addDebug('No service selected')
      return
    }

    setLoading(true)
    try {
      // Create a test image (1x1 pixel PNG)
      const testImageBlob = new Blob([
        new Uint8Array([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
          0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
          0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
          0x09, 0x70, 0x48, 0x59, 0x73, 0x00, 0x00, 0x0B, 0x13, 0x00, 0x00, 0x0B,
          0x13, 0x01, 0x00, 0x9A, 0x9C, 0x18, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44,
          0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00,
          0x00, 0x00, 0x02, 0x00, 0x01, 0xE5, 0xB0, 0x8A, 0x10, 0x00, 0x00, 0x00,
          0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ])
      ], { type: 'image/png' })

      const testFile = new File([testImageBlob], 'test-image.png', { type: 'image/png' })

      addDebug('Starting image upload...')
      const uploadResult = await uploadServiceImage(testFile, selectedServiceId, 'test-vendor')

      if (uploadResult.success && uploadResult.url) {
        addDebug(`Upload successful: ${uploadResult.url}`)
        addDebug('Adding image to service...')
        const addResult = await addServiceImage(selectedServiceId, uploadResult.url)

        if (addResult.success) {
          addDebug('Image added to service successfully!')
        } else {
          addDebug(`Failed to add image to service: ${addResult.error}`)
        }
      } else {
        addDebug(`Upload failed: ${uploadResult.error}`)
      }
    } catch (error) {
      addDebug(`Test failed: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Image Upload</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Info */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">User Info</h2>
          <p><strong>Email:</strong> {user?.email || 'Not logged in'}</p>
          <p><strong>User ID:</strong> {user?.id || 'N/A'}</p>
        </div>

        {/* Services */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Your Services</h2>
          <select
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            className="w-full p-2 border rounded mb-3"
          >
            <option value="">Select a service</option>
            {services.map(service => (
              <option key={service.id} value={service.id}>
                {service.title} ({service.id.slice(0, 8)}...)
              </option>
            ))}
          </select>
          <button
            onClick={() => selectedServiceId && testServiceAccess(selectedServiceId)}
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
          >
            Test Access
          </button>
          <button
            onClick={testImageUpload}
            disabled={loading || !selectedServiceId}
            className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Upload'}
          </button>
        </div>
      </div>

      {/* Debug Log */}
      <div className="bg-gray-100 p-4 rounded-lg mt-6">
        <h2 className="text-lg font-semibold mb-3">Debug Log</h2>
        <div className="bg-black text-green-400 p-3 rounded font-mono text-sm max-h-96 overflow-y-auto">
          {debugInfo.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>
        <button
          onClick={() => setDebugInfo([])}
          className="mt-2 bg-gray-500 text-white px-3 py-1 rounded text-sm"
        >
          Clear Log
        </button>
      </div>
    </div>
  )
}