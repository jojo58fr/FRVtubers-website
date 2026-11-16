'use client'

import { useSyncExternalStore } from 'react'
import { createConsentManager, CONSENT_KEY, type TwitchChoice } from '@/lib/twitch-consent'

let browserStore: ReturnType<typeof createConsentManager> | undefined
function getStore() {
  if (typeof window === 'undefined') return undefined
  if (!browserStore) {
    browserStore = createConsentManager({ load: () => import('vanilla-cookieconsent'), storage: () => window.localStorage })
    window.addEventListener('storage', event => {
      if (event.key === CONSENT_KEY || event.key === null) void browserStore?.refresh()
    })
    window.addEventListener('focus', () => browserStore?.refresh())
    window.addEventListener('pageshow', () => browserStore?.refresh())
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') browserStore?.refresh()
    })
  }
  return browserStore
}
export function initializeCookieConsent() { return getStore()?.initialize() }
export function setConsentLanguage(language: string) { return getStore()?.setLanguage(language) }
const subscribe = (listener: () => void) => getStore()?.subscribe(listener) ?? (() => {})
const getSnapshot = () => getStore()?.getSnapshot() ?? 'unknown'
const getServerSnapshot = (): TwitchChoice => 'unknown'

export function useTwitchConsent() {
  const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return { choice, allow: () => getStore()?.choose('granted'), deny: () => getStore()?.choose('denied'),
    openPreferences: () => getStore()?.openPreferences() }
}
