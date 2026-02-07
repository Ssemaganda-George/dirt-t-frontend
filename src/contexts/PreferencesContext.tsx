import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { getUserPreferences, saveUserPreferences, UserPreferences } from '../lib/database'
import { translate, SupportedLang } from '../i18n/translations'

// Types
interface PreferencesContextType {
  preferences: UserPreferences | null
  selectedRegion: string
  selectedCurrency: string
  selectedLanguage: string
  // t now supports optional interpolation variables
  t: (key: string, vars?: Record<string, string | number>) => string
  loading: boolean
  updatePreferences: (region: string, currency: string, language: string) => Promise<void>
  loadPreferences: () => Promise<void>
}

// Default preferences
const DEFAULT_REGION = 'UG'
const DEFAULT_CURRENCY = 'UGX'
const DEFAULT_LANGUAGE = 'en'

// Create context
const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined)

// Provider component
interface PreferencesProviderProps {
  children: ReactNode
}

export function PreferencesProvider({ children }: PreferencesProviderProps) {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(false)

  // Computed values from preferences
  const selectedRegion = preferences?.region || DEFAULT_REGION
  const selectedCurrency = preferences?.currency || DEFAULT_CURRENCY
  const selectedLanguage = preferences?.language || DEFAULT_LANGUAGE

  // Load user preferences
  const loadPreferences = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const userPrefs = await getUserPreferences(user.id)
      setPreferences(userPrefs)
    } catch (error) {
      console.error('Error loading preferences:', error)
      // Don't throw error, just use defaults
    } finally {
      setLoading(false)
    }
  }

  // Update user preferences
  const updatePreferences = async (region: string, currency: string, language: string) => {
    if (!user?.id) return

    try {
      setLoading(true)
      const updatedPrefs = await saveUserPreferences(user.id, {
        region,
        currency,
        language
      })
      setPreferences(updatedPrefs)

      // Store in localStorage as backup
      localStorage.setItem('user_preferences', JSON.stringify({
        region,
        currency,
        language,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('Error updating preferences:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Load preferences when user changes
  useEffect(() => {
    if (user?.id) {
      loadPreferences()
    } else {
      // Clear preferences when user logs out
      setPreferences(null)
    }
  }, [user?.id])

  // Load from localStorage on mount (for non-authenticated users or as fallback)
  useEffect(() => {
    const stored = localStorage.getItem('user_preferences')
    if (stored && !user?.id) {
      try {
        const parsed = JSON.parse(stored)
        // Only use if less than 24 hours old
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          setPreferences({
            id: 'local',
            user_id: 'local',
            region: parsed.region || DEFAULT_REGION,
            currency: parsed.currency || DEFAULT_CURRENCY,
            language: parsed.language || DEFAULT_LANGUAGE,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      } catch (error) {
        console.error('Error parsing stored preferences:', error)
      }
    }
  }, [])

  const value: PreferencesContextType = {
    preferences,
    selectedRegion,
    selectedCurrency,
    selectedLanguage,
    t: (key: string, vars?: Record<string, string | number>) => {
        const lang = (selectedLanguage || DEFAULT_LANGUAGE) as SupportedLang
        let str = translate(lang, key)
        if (!str) return key
        // Simple interpolation: replace {{var}} with provided vars
        if (vars) {
          Object.keys(vars).forEach(k => {
            const re = new RegExp(`{{\\s*${k}\\s*}}`, 'g')
            str = String(str).replace(re, String(vars[k]))
          })
        }
        return str
      },
    loading,
    updatePreferences,
    loadPreferences
  }

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  )
}

// Hook to use preferences context
export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider')
  }
  return context
}

// Export default preferences for use throughout the app
export const DEFAULT_PREFERENCES = {
  region: DEFAULT_REGION,
  currency: DEFAULT_CURRENCY,
  language: DEFAULT_LANGUAGE
}