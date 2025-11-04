'use client'

import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons'

type Theme = 'light' | 'dark'

const getPreferredTheme = (): Theme => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const storedTheme = window.localStorage.getItem('theme')
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const applyTheme = (theme: Theme) => {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.setAttribute('data-theme', theme)
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getPreferredTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = (event: MediaQueryListEvent) => {
      const stored = window.localStorage.getItem('theme')
      if (stored === 'light' || stored === 'dark') {
        return
      }

      const nextTheme: Theme = event.matches ? 'dark' : 'light'
      setTheme(nextTheme)
    }

    mediaQuery.addEventListener('change', handleSystemChange)

    return () => mediaQuery.removeEventListener('change', handleSystemChange)
  }, [])

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme', nextTheme)
    }
    applyTheme(nextTheme)
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-primary)] shadow-sm transition-transform duration-300 hover:scale-105 hover:border-[var(--border-strong)] hover:shadow-md"
      aria-label={theme === 'light' ? 'Activer le theme sombre' : 'Activer le theme clair'}
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[var(--accent-soft)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <FontAwesomeIcon
        icon={theme === 'light' ? faMoon : faSun}
        className="relative text-base"
      />
    </button>
  )
}
