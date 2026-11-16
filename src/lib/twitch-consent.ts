import type * as CookieConsent from 'vanilla-cookieconsent'
import { createCookieConsentConfig, CONSENT_KEY, CONSENT_REVISION, CONSENT_DAYS } from './cookie-consent-config'

export { CONSENT_KEY, CONSENT_REVISION, CONSENT_DAYS }
export const LEGACY_CONSENT_KEY = 'frvtubers:twitch-consent'
export type TwitchChoice = 'granted' | 'denied' | 'unknown'
type ConsentApi = Pick<typeof CookieConsent, 'run' | 'reset' | 'validConsent' | 'getCookie' |
  'acceptedService' | 'acceptService' | 'getUserPreferences' | 'showPreferences' | 'setLanguage'>
type LocalStorageAccess = Pick<Storage, 'getItem' | 'removeItem'>

// React bridge only: vanilla-cookieconsent owns the single persisted record and UI.
export function createConsentManager({ load, storage, now = Date.now,
  schedule = (callback: () => void, delay: number) => setTimeout(callback, delay),
  cancel = (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer),
}: {
  load: () => Promise<ConsentApi>
  storage: () => LocalStorageAccess
  now?: () => number
  schedule?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  cancel?: (timer: ReturnType<typeof setTimeout>) => void
}) {
  let api: ConsentApi | undefined
  let ready = false
  let initializing: Promise<void> | undefined
  let choice: TwitchChoice = 'unknown'
  let snapshot: TwitchChoice = 'unknown'
  let expiresAt = 0
  let baseline: string | null = null
  let memoryOnly = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let intent = 0
  let pendingChoice: 'granted' | 'denied' | undefined
  const listeners = new Set<() => void>()

  function read() {
    try { return storage().getItem(CONSENT_KEY) } catch { return null }
  }
  function getSnapshot(): TwitchChoice {
    if (pendingChoice === 'denied') return 'denied'
    if (!ready || expiresAt <= now()) return 'unknown'
    if (!memoryOnly && read() !== baseline) return 'unknown'
    return choice
  }
  function notify() {
    const next = getSnapshot()
    if (snapshot !== next) { snapshot = next; listeners.forEach(listener => listener()) }
  }
  function armTimer() {
    if (timer !== undefined) cancel(timer)
    timer = undefined
    if (expiresAt > now()) {
      timer = schedule(() => { void refresh() }, Math.min(expiresAt - now(), 2_147_483_647))
    }
  }
  function capture(cookie: CookieConsent.CookieValue) {
    const lastChoice = Date.parse(cookie.lastConsentTimestamp)
    const valid = api?.validConsent() && cookie.revision === CONSENT_REVISION &&
      Number.isFinite(lastChoice) && lastChoice <= now() && Number.isFinite(cookie.expirationTime) &&
      cookie.expirationTime > now() && cookie.expirationTime <= lastChoice + CONSENT_DAYS * 86_400_000 + 1000
    expiresAt = valid ? cookie.expirationTime : 0
    choice = valid ? api!.acceptedService('twitch', 'media') ? 'granted' : 'denied' : 'unknown'
    baseline = read()
    // The library can still accept a choice in memory when storage is blocked.
    try { memoryOnly = !baseline || JSON.stringify(JSON.parse(baseline)) !== JSON.stringify(cookie) }
    catch { memoryOnly = true }
    if (initializing && memoryOnly) { choice = 'unknown'; expiresAt = 0 }
    if (memoryOnly && choice === 'denied') {
      try { storage().removeItem(CONSENT_KEY) } catch { /* inaccessible storage */ }
      baseline = read()
    }
    armTimer()
    notify()
  }
  function initialize(reload = false): Promise<void> {
    if (initializing) return initializing
    if (ready && !reload) return Promise.resolve()
    ready = false
    notify()
    initializing = (async () => {
      try {
        const loaded = await load()
        loaded.reset(false) // Also rebind callbacks after development hot reload.
        api = loaded
        choice = 'unknown'
        expiresAt = 0
        memoryOnly = false
        // New format/purposes: ask again; never silently import the old acceptance.
        try { storage().removeItem(LEGACY_CONSENT_KEY) } catch { /* old key is never read */ }
        await api.run(createCookieConsentConfig(capture))
        if (api.validConsent() && choice === 'unknown') {
          capture(api.getCookie())
          if (choice === 'unknown') {
            // Discard only this manager's invalid consent record, never auth cookies.
            api.reset(true)
            await api.run(createCookieConsentConfig(capture))
          }
        }
        ready = true
        if (choice === 'unknown') baseline = read()
        notify()
      } catch {
        ready = false
        choice = 'unknown'
        expiresAt = 0
        notify()
      } finally { initializing = undefined }
    })()
    return initializing
  }
  async function refresh() {
    if (!ready || (!memoryOnly && read() !== baseline) || (expiresAt > 0 && expiresAt <= now())) {
      await initialize(true)
    } else { armTimer(); notify() }
  }
  return {
    initialize, refresh, getSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      void refresh()
      return () => { listeners.delete(listener) }
    },
    async choose(next: 'granted' | 'denied') {
      const currentIntent = ++intent
      pendingChoice = next
      notify()
      await refresh()
      if (currentIntent !== intent) return
      try {
        if (ready && api) {
          const services = api.getUserPreferences().acceptedServices.media ?? []
          api.acceptService(next === 'granted' ? [...new Set([...services, 'twitch'])] : services.filter(service => service !== 'twitch'), 'media')
        }
      } finally { pendingChoice = undefined; notify() }
    },
    async openPreferences() { await refresh(); if (ready) api?.showPreferences() },
    async setLanguage(language: string) {
      await initialize()
      if (ready) await api?.setLanguage(language === 'en' ? 'en' : 'fr')
    },
    dispose() {
      if (timer !== undefined) cancel(timer)
      listeners.clear()
      api?.reset(false)
    },
  }
}
