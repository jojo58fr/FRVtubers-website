'use client'

import { FormEvent, useState } from 'react'
import styles from './Onboarding.module.scss'

type OnboardingFormProps = {
  hasVtuberRole: boolean
}

type FormState = {
  vtuberType: string
  pseudo: string
  platforms: string
  links: string
  socials: string
}

const defaultState: FormState = {
  vtuberType: '',
  pseudo: '',
  platforms: '',
  links: '',
  socials: '',
}

const OnboardingForm = ({ hasVtuberRole }: OnboardingFormProps) => {
  const [values, setValues] = useState<FormState>(defaultState)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleChange =
    (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('submitting')
    setError(null)

    try {
      const response = await fetch('/api/onboarding/application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error ?? 'Impossible d’envoyer la candidature')
      }

      setStatus('success')
      setValues(defaultState)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  const disabled = status === 'submitting' || hasVtuberRole

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label>
        VtuberFR, VtuberQC ou Futur Vtuber *
        <input
          type="text"
          value={values.vtuberType}
          onChange={handleChange('vtuberType')}
          placeholder="Ex. VtuberFR"
          required
          disabled={disabled}
        />
      </label>

      <label>
        Pseudo *
        <input
          type="text"
          value={values.pseudo}
          onChange={handleChange('pseudo')}
          placeholder="Ton nom de scène"
          required
          disabled={disabled}
        />
      </label>

      <label>
        Plateforme principale *
        <input
          type="text"
          value={values.platforms}
          onChange={handleChange('platforms')}
          placeholder="Twitch, YouTube, TikTok…"
          required
          disabled={disabled}
        />
      </label>

      <label>
        Liens (Twitch / YouTube…) *
        <textarea
          value={values.links}
          onChange={handleChange('links')}
          placeholder="https://twitch.tv/…"
          rows={3}
          required
          disabled={disabled}
        />
      </label>

      <label>
        Lien Twitter / Bluesky (facultatif)
        <input
          type="text"
          value={values.socials}
          onChange={handleChange('socials')}
          placeholder="https://twitter.com/…"
          disabled={disabled}
        />
      </label>

      <button type="submit" disabled={disabled}>
        {status === 'submitting' ? 'Envoi en cours…' : hasVtuberRole ? 'Déjà validé' : 'Envoyer ma candidature'}
      </button>

      {status === 'success' && (
        <p className={styles.feedbackSuccess}>C’est envoyé ! Nous te tiendrons au courant dès validation.</p>
      )}

      {status === 'error' && <p className={styles.feedbackError}>{error}</p>}
    </form>
  )
}

export default OnboardingForm
