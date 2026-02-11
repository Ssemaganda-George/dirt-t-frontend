import { useState, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Search } from 'lucide-react'

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Helper: recenters the map when coordinates change
function RecenterMap({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lon], map.getZoom())
  }, [lat, lon, map])
  return null
}

// DraggableMarker: supports dragging and map-click to set the marker
function DraggableMarker({ position, onPositionChange, draggable = true, onMarkerClick, locationName }: {
  position: [number, number] | null;
  onPositionChange: (lat: number, lon: number) => void;
  draggable?: boolean;
  onMarkerClick?: () => void;
  locationName?: string
}) {
  const map = useMapEvents({
    click(e) {
      if (!draggable) return // Don't allow map clicks in view mode
      const { lat, lng } = e.latlng
      onPositionChange(lat, lng)
    }
  })

  const markerRef = useRef<any>(null)

  useEffect(() => {
    if (!markerRef.current) return
    // If position changed externally, move marker
    if (position) {
      const marker = markerRef.current
      marker.setLatLng(position)
      map.panTo(position)
    }
  }, [position, map])

  const icon = L.divIcon({
    className: '',
    html: '<div style="width:18px;height:18px;background:#2563eb;border:3px solid white;border-radius:18px;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  })

  return position ? (
    <Marker
      position={position}
      draggable={draggable}
      eventHandlers={{
        dragend(e: any) {
          if (!draggable) return
          const latlng = e.target.getLatLng()
          onPositionChange(latlng.lat, latlng.lng)
        },
        click() {
          if (onMarkerClick) onMarkerClick()
        }
      }}
      icon={icon}
      ref={markerRef}
    >
      <Popup>
        <div className="text-sm">
          <div className="font-medium mb-1">Coordinates</div>
          {locationName && (
            <div className="text-xs text-slate-800 mb-2 font-medium">{locationName}</div>
          )}
          <div className="text-xs text-slate-600">
            <div>Latitude: {position?.[0].toFixed(6)}</div>
            <div>Longitude: {position?.[1].toFixed(6)}</div>
          </div>
        </div>
      </Popup>
    </Marker>
  ) : null
}

interface SearchMapProps {
  initialCoords?: { lat: number; lon: number } | null;
  onLocationSelect?: (location: { display_name: string; lat: number; lon: number }) => void;
  height?: string;
  showSearch?: boolean;
  showLocationEdit?: boolean;
  viewOnly?: boolean;
}

export default function SearchMap({
  initialCoords,
  onLocationSelect,
  height = '400px',
  showSearch = true,
  showLocationEdit = true,
  viewOnly = false
}: SearchMapProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(initialCoords || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [userCountry, setUserCountry] = useState<string | null>(null)
  const [editableLocation, setEditableLocation] = useState('')
  const [isEditMode, setIsEditMode] = useState(!viewOnly && !initialCoords)

  const suggestionsAbortRef = useRef<AbortController | null>(null)

  // Initialize with provided coordinates or defaults
  useEffect(() => {
    if (initialCoords) {
      setCoords(initialCoords)
      setIsEditMode(false)
      // Reverse geocode to get location name
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${initialCoords.lat}&lon=${initialCoords.lon}`)
        .then(r => r.json())
        .then((data) => {
          if (data?.display_name) {
            setEditableLocation(data.display_name)
          }
        })
        .catch(() => {})
    } else if (!viewOnly) {
      setIsEditMode(true)
      // Try to get user's current location, fallback to Nairobi
      if (navigator?.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude
            const lon = pos.coords.longitude
            setCoords({ lat, lon })
            // Reverse geocode to get location name
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lon}`)
              .then(r => r.json())
              .then((data) => {
                if (data?.display_name) {
                  setEditableLocation(data.display_name)
                } else {
                  setEditableLocation(`${lat.toFixed(5)}, ${lon.toFixed(5)}`)
                }
                if (data?.address?.country_code) setUserCountry(data.address.country_code)
              })
              .catch(() => {
                setEditableLocation(`${lat.toFixed(5)}, ${lon.toFixed(5)}`)
              })
          },
          () => {
            // Fallback to Nairobi if geolocation fails
            setCoords({ lat: -1.2921, lon: 36.8219 })
            setEditableLocation('Nairobi, Kenya')
          },
          { maximumAge: 1000 * 60 * 5, timeout: 5000 }
        )
      } else {
        // Fallback to Nairobi if geolocation not available
        setCoords({ lat: -1.2921, lon: 36.8219 })
        setEditableLocation('Nairobi, Kenya')
      }
    }
  }, [initialCoords, viewOnly])

  // Fetch suggestions as the user types (debounced)
  const fetchSuggestions = (q: string) => {
    if (!q.trim()) {
      setSuggestions([])
      return
    }
    if (suggestionsAbortRef.current) suggestionsAbortRef.current.abort()
    const ac = new AbortController()
    suggestionsAbortRef.current = ac
    fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&polygon_geojson=0&q=${encodeURIComponent(q)}`, { signal: ac.signal })
      .then(r => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return setSuggestions([])
        if (userCountry) {
          data.sort((a:any,b:any) => {
            const aCc = a.address?.country_code || ''
            const bCc = b.address?.country_code || ''
            if (aCc === userCountry && bCc !== userCountry) return -1
            if (aCc !== userCountry && bCc === userCountry) return 1
            return 0
          })
        }
        setSuggestions(data)
      })
      .catch(() => setSuggestions([]))
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchSuggestions(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSearch = () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    setError('')
    fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(searchQuery)}`)
      .then(r => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const place = data[0]
          setCoords({ lat: Number(place.lat), lon: Number(place.lon) })
          setEditableLocation(place.display_name || searchQuery)
        } else {
          setCoords(null)
          setError('No results found')
        }
      })
      .catch(() => {
        setError('Search failed')
        setCoords(null)
      })
      .finally(() => setLoading(false))
  }

  const handleConfirm = () => {
    if (coords && editableLocation && onLocationSelect) {
      onLocationSelect({
        display_name: editableLocation,
        lat: coords.lat,
        lon: coords.lon
      })
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setEditableLocation('')
    setCoords(null)
    setError('')
  }

  return (
    <div className="space-y-4">
      {/* Search Bar - Only show if showSearch is true */}
      {showSearch && isEditMode && (
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a location..."
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSearch && isEditMode && suggestions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm max-h-60 overflow-auto">
          {suggestions.map((s, idx) => (
            <button key={idx} type="button" onClick={() => {
              setCoords({ lat: Number(s.lat), lon: Number(s.lon) })
              setEditableLocation(s.display_name)
              setSearchQuery(s.display_name)
              if (s.address?.country_code) setUserCountry(s.address.country_code)
              setSuggestions([])
              if (suggestionsAbortRef.current) { suggestionsAbortRef.current.abort(); suggestionsAbortRef.current = null }
            }} className="w-full text-left px-4 py-2 hover:bg-slate-50">
              <div className="text-sm font-medium text-slate-800">{s.display_name}</div>
              <div className="text-xs text-slate-500">{s.address?.country || ''}</div>
            </button>
          ))}
        </div>
      )}

      {/* Map Display */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden" style={{ height }}>
        <MapContainer
          center={coords ? [coords.lat, coords.lon] : [-1.2921, 36.8219]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={isEditMode}
          dragging={isEditMode}
          doubleClickZoom={isEditMode}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* Recenter map when coords change */}
          {coords && <RecenterMap lat={coords.lat} lon={coords.lon} />}

          <DraggableMarker
            position={coords ? [coords.lat, coords.lon] : null}
            onPositionChange={(lat, lon) => {
              if (!isEditMode) return // Don't allow position changes in view mode
              setCoords({ lat, lon })
              // reverse geocode to update display name and country
              fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lon}`)
                .then(r => r.json())
                .then((data) => {
                  if (data?.display_name) {
                    setEditableLocation(data.display_name)
                  }
                  if (data?.address?.country_code) setUserCountry(data.address.country_code)
                })
                .catch(() => {})
            }}
            draggable={isEditMode}
            onMarkerClick={() => {
              if (!isEditMode && coords) {
                // The popup will automatically open when marker is clicked
              }
            }}
            locationName={editableLocation}
          />
        </MapContainer>
      </div>

      {/* Location Name Edit - Only show if showLocationEdit is true and in edit mode */}
      {showLocationEdit && isEditMode && coords && (
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Location Name</label>
              <input
                type="text"
                value={editableLocation}
                onChange={(e) => setEditableLocation(e.target.value)}
                placeholder="Edit location name"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <a className="text-xs text-slate-600 hover:text-slate-800 inline-block" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lon}#map=16/${coords.lat}/${coords.lon}`}>View on OpenStreetMap ↗</a>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Action Buttons - Only show if not viewOnly and we have coordinates */}
      {!viewOnly && coords && editableLocation && (
        <div className="flex justify-end gap-4 pt-4 border-t border-slate-200">
          <button
            onClick={clearSearch}
            className="px-6 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 hover:shadow-sm"
          >
            Clear
          </button>
          <button
            onClick={handleConfirm}
            className="px-8 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Confirm Location
          </button>
        </div>
      )}

      {/* View Mode Toggle */}
      {initialCoords && (
        <div className="flex justify-center">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            {isEditMode ? 'View Mode' : 'Edit Location'}
          </button>
        </div>
      )}
    </div>
  )
}