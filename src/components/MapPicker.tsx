import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// fix default marker icon path issues (use CDN-hosted images to avoid runtime require)
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

export interface MapPickerProps {
  center?: [number, number]
  zoom?: number
  initialMarker?: { lat: number; lng: number; label?: string }
  reverseGeocode?: boolean
  countryCode?: string | null
  height?: string
  onSelect?: (lat: number, lng: number, place?: string) => void
}

function ClickHandler({ onSelect, reverseGeocode }: { onSelect: (lat: number, lng: number, place?: string) => void; reverseGeocode: boolean }) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng
      let place: string | undefined = undefined
      if (reverseGeocode) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
          if (res.ok) {
            const data = await res.json()
            place = data.display_name || undefined
          }
        } catch (err) {
          // ignore reverse geocode errors
        }
      }
      onSelect(lat, lng, place)
    }
  })
  return null
}

export default function MapPicker({ center = [0, 0], zoom = 2, initialMarker, reverseGeocode = true, countryCode = null, height = '320px', onSelect }: MapPickerProps) {
  const [marker, setMarker] = useState<{ lat: number; lng: number; label?: string } | null>(initialMarker || null)
  const mapRef = useRef<any>(null)

  // Search state
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const searchTimeout = useRef<number | null>(null)
  const abortController = useRef<AbortController | null>(null)

  useEffect(() => {
    if (initialMarker) setMarker(initialMarker)
  }, [initialMarker])

  useEffect(() => {
    return () => {
      if (searchTimeout.current) window.clearTimeout(searchTimeout.current)
      abortController.current?.abort()
    }
  }, [])

  const handleSelect = (lat: number, lng: number, place?: string) => {
    const label = place || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    const markerObj = { lat, lng, label }
    setMarker(markerObj)
    if (onSelect) onSelect(lat, lng, label)
    const mapInstance = mapRef.current
    if (mapInstance && typeof mapInstance.setView === 'function') {
      try {
        mapInstance.setView([lat, lng], Math.max(10, zoom))
      } catch (e) {
        // ignore
      }
    }
  }

  const performSearch = (q: string) => {
    if (!q || q.trim().length === 0) {
      setResults([])
      return
    }
    abortController.current?.abort()
    abortController.current = new AbortController()
    // request address details so we can prioritise results in user's country while
    // still returning foreign results
    const countryLower = countryCode ? countryCode.toLowerCase() : null
    fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&q=${encodeURIComponent(q)}&limit=12`, { signal: abortController.current.signal })
      .then(res => res.ok ? res.json() : [])
      .then((data) => {
        const arr = Array.isArray(data) ? data : []
        if (countryLower) {
          arr.sort((a: any, b: any) => {
            const aIsLocal = (a.address?.country_code || '').toLowerCase() === countryLower ? 0 : 1
            const bIsLocal = (b.address?.country_code || '').toLowerCase() === countryLower ? 0 : 1
            if (aIsLocal !== bIsLocal) return aIsLocal - bIsLocal
            // fallback to importance score
            return (b.importance || 0) - (a.importance || 0)
          })
        }
        setResults(arr)
      })
      .catch(() => {
        setResults([])
      })
      .finally(() => {})
  }

  const onQueryChange = (v: string) => {
    setQuery(v)
    if (searchTimeout.current) window.clearTimeout(searchTimeout.current)
    // debounce
    // @ts-ignore - window.setTimeout returns number
    searchTimeout.current = window.setTimeout(() => performSearch(v), 300)
  }

  // helper component to grab the map instance and respond to `center` changes
  function SetMapRef({ mapRef, center, zoom }: { mapRef: any; center?: [number, number]; zoom: number }) {
    const map = useMap()
    useEffect(() => {
      mapRef.current = map
    }, [map])

    useEffect(() => {
      if (!center || !map) return
      try {
        map.setView(center, Math.max(zoom, map.getZoom() || zoom))
      } catch (e) {
        // ignore
      }
    }, [center, map, zoom])

    return null
  }

  return (
    <div className="w-full">
      <div className="mb-2">
        <div className="bg-white rounded-md shadow p-2 max-w-md">
          <div className="text-sm font-medium text-gray-800 mb-1">Pick a location on the map</div>
          <div className="flex gap-2 items-center">
            <input value={query} onChange={e => onQueryChange(e.target.value)} placeholder="Search for a place" className="flex-1 border rounded px-2 py-1 text-sm" />
            <button onClick={() => { setQuery(''); setResults([]); }} className="text-sm text-gray-600">Close</button>
          </div>
          {results.length > 0 && (
            <div className="mt-2 max-h-40 overflow-auto text-sm">
              {results.map((r: any, idx: number) => (
                <div key={idx} onClick={() => { handleSelect(parseFloat(r.lat), parseFloat(r.lon), r.display_name); setResults([]); setQuery(r.display_name) }} className="p-1 hover:bg-gray-100 cursor-pointer">{r.display_name}</div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ height }} className="w-full">
          <MapContainer ref={mapRef as any} center={initialMarker ? [initialMarker.lat, initialMarker.lng] : center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SetMapRef mapRef={mapRef} center={center} zoom={zoom} />
        <ClickHandler onSelect={handleSelect} reverseGeocode={reverseGeocode} />
        {marker && (
          <Marker position={[marker.lat, marker.lng] as [number, number]}>
            <Popup>{marker.label}</Popup>
          </Marker>
        )}
          </MapContainer>
        </div>
      </div>
    )
}
