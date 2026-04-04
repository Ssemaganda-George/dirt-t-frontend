// modal wrapper for MapPicker — requests user location when opened to center the map
import { useEffect, useState } from 'react'
import MapPicker from './MapPicker'

interface MapModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (lat: number, lng: number, label?: string) => void
  initialMarker?: { lat: number; lng: number; label?: string }
}

export default function MapModal({ isOpen, onClose, onSelect, initialMarker }: MapModalProps) {
  const [userCenter, setUserCenter] = useState<[number, number] | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [countryCode, setCountryCode] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setGeoError(null)
      setUserCenter(null)
      return
    }

    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation not supported')
      return
    }

    // Try to get current position to center the map — browsers will prompt user
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setUserCenter([lat, lon])
        setGeoError(null)
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`)
          if (res.ok) {
            const data = await res.json()
            const cc = data?.address?.country_code
            if (cc) setCountryCode(String(cc).toUpperCase())
          }
        } catch (e) {
          // ignore reverse geocode failure
        }
      },
      (err) => {
        setGeoError(err.message || 'Location permission denied')
      },
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Pick a location on the map</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Close</button>
        </div>
        <div className="p-4">
          {geoError ? (
            <div className="mb-3 p-3 bg-yellow-50 border rounded text-sm">
              <div>{geoError}</div>
              <div className="mt-2">
                <button onClick={() => {
                  setGeoError(null)
                  // retry
                  navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                      const lat = pos.coords.latitude
                      const lon = pos.coords.longitude
                      setUserCenter([lat, lon])
                      try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`)
                        if (res.ok) {
                          const data = await res.json()
                          const cc = data?.address?.country_code
                          if (cc) setCountryCode(String(cc).toUpperCase())
                        }
                      } catch (e) {
                        // ignore
                      }
                    },
                    (err) => setGeoError(err.message || 'Location permission denied'),
                    { enableHighAccuracy: true, timeout: 5000 }
                  )
                }} className="px-3 py-1 bg-blue-600 text-white rounded">Allow location</button>
                <button onClick={() => setGeoError(null)} className="ml-2 px-3 py-1 border rounded">Ignore</button>
              </div>
            </div>
          ) : null}

          <MapPicker
            center={userCenter ?? (initialMarker ? [initialMarker.lat, initialMarker.lng] : undefined) as any}
            initialMarker={initialMarker}
            zoom={initialMarker || userCenter ? 12 : 5}
            reverseGeocode={true}
            countryCode={countryCode}
            height="60vh"
            onSelect={(lat, lng, place) => {
              onSelect(lat, lng, place)
              onClose()
            }}
          />
        </div>
      </div>
    </div>
  )
}
