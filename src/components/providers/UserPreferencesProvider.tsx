'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useSession } from 'next-auth/react'
import {
  DEFAULT_PREFERENCES,
  mergePreferences,
  type SupportedLanguage,
  type SupportedTheme,
  type UserPreferences,
} from '@/lib/user-preferences'

type PreferencesContextValue = {
  preferences: UserPreferences
  isUpdating: boolean
  updateTheme: (theme: SupportedTheme) => Promise<void>
  updateLanguage: (language: SupportedLanguage) => Promise<void>
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined)

const LOCAL_STORAGE_THEME = 'theme'
const LOCAL_STORAGE_LANGUAGE = 'language'

const readLocalPreferences = (): Partial<UserPreferences> => {
  if (typeof window === 'undefined') {
    return {}
  }

  const theme = window.localStorage.getItem(LOCAL_STORAGE_THEME)
  const language = window.localStorage.getItem(LOCAL_STORAGE_LANGUAGE)

  return {
    theme: (theme === 'light' || theme === 'dark' ? theme : undefined) as SupportedTheme | undefined,
    language: (language === 'fr' || language === 'en' ? language : undefined) as SupportedLanguage | undefined,
  }
}

type ProviderProps = {
  children: ReactNode
}

const applyTheme = (theme: SupportedTheme) => {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.setAttribute('data-theme', theme)
}

const applyLanguage = (language: SupportedLanguage) => {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.setAttribute('lang', language)
}

export function UserPreferencesProvider({ children }: ProviderProps) {
  const { data: session, status, update } = useSession()
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [isUpdating, setIsUpdating] = useState(false)
  const previousPreferences = useRef<UserPreferences>(preferences)
  const hasRestoredLocalRef = useRef(false)

  useEffect(() => {
    applyTheme(preferences.theme)
    applyLanguage(preferences.language)
  }, [preferences])

  useEffect(() => {
    if (status === 'authenticated' && session?.preferences) {
      setPreferences(session.preferences)
      hasRestoredLocalRef.current = true
      return
    }

    if (status === 'unauthenticated') {
      setPreferences(mergePreferences(DEFAULT_PREFERENCES, readLocalPreferences()))
      hasRestoredLocalRef.current = true
      return
    }

    if (!hasRestoredLocalRef.current && status === 'loading') {
      setPreferences(mergePreferences(DEFAULT_PREFERENCES, readLocalPreferences()))
      hasRestoredLocalRef.current = true
    }
  }, [status, session?.preferences])

  const persistLocally = useCallback((next: UserPreferences) => {
    if (typeof window === 'undefined') {
      return
    }
    window.localStorage.setItem(LOCAL_STORAGE_THEME, next.theme)
    window.localStorage.setItem(LOCAL_STORAGE_LANGUAGE, next.language)
  }, [])

  const applyUpdate = useCallback(
    async (partial: Partial<UserPreferences>) => {
      const nextPreferences = mergePreferences(preferences, partial)
      previousPreferences.current = preferences
      setPreferences(nextPreferences)

      if (status !== 'authenticated') {
        persistLocally(nextPreferences)
        return
      }

      setIsUpdating(true)

      try {
        const response = await fetch('/api/user/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(nextPreferences),
        })

        if (!response.ok) {
          throw new Error('Échec de la mise à jour des préférences.')
        }

        await update({ preferences: nextPreferences })
        persistLocally(nextPreferences)
      } catch (error) {
        console.error(error)
        setPreferences(previousPreferences.current)
        throw error
      } finally {
        setIsUpdating(false)
      }
    },
    [persistLocally, preferences, status, update],
  )

  const updateTheme = useCallback(
    async (theme: SupportedTheme) => {
      await applyUpdate({ theme })
    },
    [applyUpdate],
  )

  const updateLanguage = useCallback(
    async (language: SupportedLanguage) => {
      await applyUpdate({ language })
    },
    [applyUpdate],
  )

  const value = useMemo<PreferencesContextValue>(
    () => ({
      preferences,
      isUpdating,
      updateTheme,
      updateLanguage,
    }),
    [preferences, isUpdating, updateTheme, updateLanguage],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export const useUserPreferences = () => {
  const context = useContext(PreferencesContext)
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider')
  }
  return context
}
