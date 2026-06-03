import { useState, useRef, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { searchCities, type CityEntry } from '../lib/cities'

interface CitySearchInputProps {
  city: string
  onSelect: (city: string, country: string) => void
  placeholder?: string
  /** Compact mode for mobile (smaller text & padding) */
  compact?: boolean
  /**
   * Inline mode — renders the input without border/padding/background so it can
   * be embedded inside a pre-styled container (e.g. the hero search bar).
   * The autocomplete dropdown still works normally.
   */
  inline?: boolean
  /** id forwarded to the underlying <input> for external focus control */
  id?: string
}

export default function CitySearchInput({
  city,
  onSelect,
  placeholder = 'Search your city...',
  compact = false,
  inline = false,
  id,
}: CitySearchInputProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<CityEntry[]>([])
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Search as user types
  useEffect(() => {
    if (isOpen) {
      setResults(searchCities(query, 8))
      setHighlightIndex(-1)
    }
  }, [query, isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleFocus = () => {
    setIsOpen(true)
    setQuery('')
  }

  const handleSelect = useCallback((entry: CityEntry) => {
    onSelect(entry.city, entry.country)
    setQuery('')
    setIsOpen(false)
    inputRef.current?.blur()
  }, [onSelect])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => (i < results.length - 1 ? i + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => (i > 0 ? i - 1 : results.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIndex >= 0 && highlightIndex < results.length) {
        handleSelect(results[highlightIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  const handleClear = useCallback(() => {
    onSelect('', '')
    setQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }, [onSelect])

  const textSize = compact ? 'text-[11px]' : 'text-sm'
  const padding = compact ? 'px-2.5 py-1.5' : 'px-3 py-2'
  const dropdownText = compact ? 'text-[11px]' : 'text-sm'

  const inputClassName = inline
    ? `w-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent${city ? ' pr-6' : ''}`
    : `w-full ${padding} ${textSize} border border-gray-300 rounded-${compact ? 'md' : 'lg'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors${city ? ' pr-8' : ''}`

  return (
    <div ref={wrapperRef} className="relative">
      {/* Input field */}
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={isOpen ? query : city}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={inputClassName}
        />
        {city && !isOpen && (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors ${inline ? 'right-0' : 'right-2'}`}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div className={`absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto ${inline ? 'z-[200]' : 'z-50'}`}>
          {results.map((entry, idx) => (
            <button
              key={`${entry.city}-${entry.country}`}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(entry) }}
              onMouseEnter={() => setHighlightIndex(idx)}
              className={`w-full flex items-center gap-2 ${padding} ${dropdownText} text-left transition-colors ${
                idx === highlightIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span className="font-medium truncate">{entry.city}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && query && results.length === 0 && (
        <div className={`absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl ${padding} ${inline ? 'z-[200]' : 'z-50'}`}>
          <p className={`${dropdownText} text-gray-400 text-center`}>No cities found</p>
        </div>
      )}
    </div>
  )
}
