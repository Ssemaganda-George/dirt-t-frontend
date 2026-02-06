import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  placeholder?: string
  onSearch: (query: string) => void
  initialValue?: string
  className?: string
  debounceMs?: number
}

export default function SearchBar({
  placeholder = "Search...",
  onSearch,
  initialValue = "",
  className = "",
  debounceMs = 300
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue)
  const [debouncedQuery, setDebouncedQuery] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs])

  // Call onSearch when debounced query changes
  useEffect(() => {
    onSearch(debouncedQuery)
  }, [debouncedQuery, onSearch])

  const clearSearch = () => {
    setQuery("")
    inputRef.current?.focus()
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>
    </div>
  )
}