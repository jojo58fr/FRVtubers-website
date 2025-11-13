'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useSession } from 'next-auth/react'
import styles from './UserSettingsForm.module.scss'
import { type UserPreferences } from '@/lib/user-preferences'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'

type Props = {
  initialPreferences: UserPreferences
}

const languageLabels: Record<UserPreferences['language'], string> = {
  fr: 'Français',
  en: 'English',
}

const themeLabels: Record<UserPreferences['theme'], string> = {
  light: 'Thème clair',
  dark: 'Thème sombre',
}

export default function UserSettingsForm({ initialPreferences }: Props) {
  const { preferences: globalPreferences } = useUserPreferences()
  const [preferences, setPreferences] = useState<UserPreferences>(initialPreferences)
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')
  const { update } = useSession()
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (!isDirty) {
      setPreferences(globalPreferences)
    }
  }, [globalPreferences, isDirty])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('saving')
    setMessage('')

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(preferences),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? 'Impossible de sauvegarder les préférences')
      }

      await update({ preferences })

      setStatus('success')
      setMessage('Préférences sauvegardées avec succès.')
      setIsDirty(false)
    } catch (error) {
      console.error(error)
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Une erreur est survenue.')
    }
  }

  return (
    <form className={styles.settingsForm} onSubmit={handleSubmit}>
      <div className={styles.group}>
        <label htmlFor="language" className={styles.label}>
          Langue de l’interface
        </label>
        <p className={styles.description}>
          Choisissez la langue affichée pour l’application et les communications principales.
        </p>
        <select
          id="language"
          name="language"
          className={styles.select}
          value={preferences.language}
          onChange={(event) => {
            const value = event.target.value as UserPreferences['language']
            setPreferences((prev) => ({ ...prev, language: value }))
            setIsDirty(true)
          }}
        >
          {Object.entries(languageLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Thème d’affichage</span>
        <p className={styles.description}>
          Basculez entre le mode clair et sombre. Le choix s’applique à toutes vos prochaines sessions.
        </p>
        <div className={styles.radioList}>
          {(Object.keys(themeLabels) as Array<UserPreferences['theme']>).map((value) => (
            <label key={value} className={styles.radioOption} data-active={preferences.theme === value}>
              <input
                type="radio"
                name="theme"
                value={value}
                checked={preferences.theme === value}
                onChange={() => {
                  setPreferences((prev) => ({ ...prev, theme: value }))
                  setIsDirty(true)
                }}
              />
              <span>{themeLabels[value]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={status === 'saving'}>
          {status === 'saving' ? 'Sauvegarde…' : 'Sauvegarder mes préférences'}
        </button>

        {status !== 'idle' && message && (
          <span className={styles.status} data-variant={status === 'success' ? 'success' : 'error'}>
            {message}
          </span>
        )}
      </div>
    </form>
  )
}
