'use client'

import { useCallback, useState } from 'react'

type UseResourceClickOptions = {
  apiBaseUrl?: string
}

type UseResourceClickState = {
  clickCount: number | null
  isSubmitting: boolean
  error: string | null
  trackClick: () => Promise<void>
}

export const useResourceClick = (resourceId: string, options: UseResourceClickOptions = {}): UseResourceClickState => {
  const [clickCount, setClickCount] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trackClick = useCallback(async () => {
    if (!resourceId) return
    setIsSubmitting(true)
    setError(null)
    try {
      const baseUrl = options.apiBaseUrl?.replace(/\/$/, '') ?? ''
      const response = await fetch(`${baseUrl}/api/resources/${resourceId}/click`, {
        method: 'POST',
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? 'Impossible de compter le clic.')
      }
      const payload = (await response.json()) as { clickCount?: number }
      if (typeof payload.clickCount === 'number') {
        setClickCount(payload.clickCount)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsSubmitting(false)
    }
  }, [options.apiBaseUrl, resourceId])

  return { clickCount, isSubmitting, error, trackClick }
}
