import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { getUserPreferences, saveUserPreferences } from '../lib/database'
import type { UserPreferences } from '../types'
import { translate, SupportedLang } from '../i18n/translations'
import {
  detectGeoPreferences,
  readStoredPreferences,
  writeStoredPreferences,
  type GeoPreferences,
} from '../lib/geoPreferences'

interface PreferencesContextType {
  preferences: UserPreferences | null
  selectedRegion: string
  selectedCurrency: string
  selectedLanguage: string
  t: (key: string, vars?: Record<string, string | number>) => string
  loading: boolean
  updatePreferences: (region: string, currency: string, language: string) => Promise<void>
  loadPreferences: () => Promise<void>
}

const DEFAULT_REGION = 'UG'
const DEFAULT_CURRENCY = 'UGX'
const DEFAULT_LANGUAGE = 'en'

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined)

interface PreferencesProviderProps {
  children: ReactNode
}

function toUserPreferences(
  prefs: { region: string; currency: string; language: string },
  userId: string
): UserPreferences {
  return {
    id: 'local',
    user_id: userId,
    region: prefs.region,
    currency: prefs.currency,
    language: prefs.language,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

function fromGeoOrStored(prefs: GeoPreferences | { region: string; currency: string; language: string }, userId: string) {
  return toUserPreferences(prefs, userId)
}

export function PreferencesProvider({ children }: PreferencesProviderProps) {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(false)

  const selectedRegion = preferences?.region || DEFAULT_REGION
  const selectedCurrency = preferences?.currency || DEFAULT_CURRENCY
  const selectedLanguage = preferences?.language || DEFAULT_LANGUAGE

  const applyLocal = (
    prefs: { region: string; currency: string; language: string },
    source: 'geo' | 'user',
    userId: string
  ) => {
    writeStoredPreferences(prefs, source)
    setPreferences(fromGeoOrStored(prefs, userId))
  }

  const detectAndApply = (userId: string) => {
    const detected = detectGeoPreferences()
    applyLocal(detected, 'geo', userId)
    return detected
  }

  const loadPreferences = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      const userPrefs = await Promise.race([
        getUserPreferences(),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Preferences load timed out')), 8000))
      ])
      if (userPrefs?.currency) {
        setPreferences(userPrefs)
        writeStoredPreferences(
          {
            region: userPrefs.region || DEFAULT_REGION,
            currency: userPrefs.currency,
            language: userPrefs.language || DEFAULT_LANGUAGE,
          },
          'user'
        )
        return
      }

      const stored = readStoredPreferences()
      const next = stored ?? detectGeoPreferences()
      applyLocal(next, stored?.source === 'user' ? 'user' : 'geo', user.id)
      await saveUserPreferences(user.id, {
        region: next.region,
        currency: next.currency,
        language: next.language,
      }).catch(() => undefined)
    } catch (error) {
      console.error('Error loading preferences:', error)
      const stored = readStoredPreferences()
      if (stored) {
        setPreferences(fromGeoOrStored(stored, user.id))
      } else {
        detectAndApply(user.id)
      }
    } finally {
      setLoading(false)
    }
  }

  const updatePreferences = async (region: string, currency: string, language: string) => {
    applyLocal({ region, currency, language }, 'user', user?.id || 'local')

    if (!user?.id) return

    try {
      setLoading(true)
      const updatedPrefs = await saveUserPreferences(user.id, {
        region,
        currency,
        language
      })
      setPreferences(updatedPrefs)
      writeStoredPreferences({ region, currency, language }, 'user')
    } catch (error) {
      console.error('Error updating preferences:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      void loadPreferences()
      return
    }

    const stored = readStoredPreferences()
    if (stored) {
      setPreferences(fromGeoOrStored(stored, 'local'))
      return
    }
    detectAndApply('local')
  }, [user?.id])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.lang = selectedLanguage || DEFAULT_LANGUAGE
  }, [selectedLanguage])

  const value: PreferencesContextType = {
    preferences,
    selectedRegion,
    selectedCurrency,
    selectedLanguage,
    t: (key: string, vars?: Record<string, string | number>) => {
        const lang = (selectedLanguage || DEFAULT_LANGUAGE) as SupportedLang
        let str = translate(lang, key)
        if (!str) return key
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

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider')
  }
  return context
}

export const DEFAULT_PREFERENCES = {
  region: DEFAULT_REGION,
  currency: DEFAULT_CURRENCY,
  language: DEFAULT_LANGUAGE
}
