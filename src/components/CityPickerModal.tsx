import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, X, MapPin } from 'lucide-react'
import { searchCities, type CityEntry } from '../lib/cities'

interface CityPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (city: string, country: string) => void
  /** Currently selected city (for highlighting) */
  selectedCity?: string
}

export default function CityPickerModal({ isOpen, onClose, onSelect, selectedCity }: CityPickerModalProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const results = useMemo(() => searchCities(query, 50), [query])

  // Group results by country
  const grouped = useMemo(() => {
    const map = new Map<string, CityEntry[]>()
    results.forEach(entry => {
      const list = map.get(entry.country) || []
      list.push(entry)
      map.set(entry.country, list)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [results])

  const handleSelect = (entry: CityEntry) => {
    onSelect(entry.city, entry.country)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h3 className="text-base font-bold text-gray-900">Select your city</h3>
            <p className="text-xs text-gray-400">Country will be filled automatically</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city or country..."
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 overscroll-contain">
          {results.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No cities found for "{query}"</p>
              <p className="text-xs text-gray-300 mt-1">Try a different search term</p>
            </div>
          ) : (
            grouped.map(([country, cities]) => (
              <div key={country} className="mb-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-1.5 sticky top-0 bg-white/95 backdrop-blur-sm">
                  {country}
                </p>
                {cities.map((entry) => {
                  const isSelected = selectedCity === entry.city
                  return (
                    <button
                      key={`${entry.city}-${entry.country}`}
                      onClick={() => handleSelect(entry)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <MapPin className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-emerald-500' : 'text-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-emerald-700' : 'text-gray-900'}`}>
                          {entry.city}
                        </p>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Selected</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
