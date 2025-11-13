'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons'
import { useUserPreferences } from './providers/UserPreferencesProvider'

export default function ThemeToggle() {
  const { preferences, updateTheme, isUpdating } = useUserPreferences()
  const [error, setError] = useState<string | null>(null)

  const toggleTheme = async () => {
    setError(null)
    const nextTheme = preferences.theme === 'light' ? 'dark' : 'light'

    try {
      await updateTheme(nextTheme)
    } catch (err) {
      console.error(err)
      setError('Sauvegarde échouée')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggleTheme}
        className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-primary)] shadow-sm transition-transform duration-300 hover:scale-105 hover:border-[var(--border-strong)] hover:shadow-md disabled:opacity-60"
        aria-label={preferences.theme === 'light' ? 'Activer le theme sombre' : 'Activer le theme clair'}
        disabled={isUpdating}
      >
        <span className="pointer-events-none absolute inset-0 rounded-full bg-[var(--accent-soft)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <FontAwesomeIcon
          icon={preferences.theme === 'light' ? faMoon : faSun}
          className="relative text-base"
        />
      </button>
      {error && <span className="sr-only">{error}</span>}
    </>
  )
}
