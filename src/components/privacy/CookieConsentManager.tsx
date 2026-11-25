'use client'

import { useEffect } from 'react'
import { initializeCookieConsent, setConsentLanguage } from './useTwitchConsent'

export default function CookieConsentManager() {
  useEffect(() => {
    void initializeCookieConsent()
    const updateLanguage = () => { void setConsentLanguage(document.documentElement.lang) }
    const observer = new MutationObserver(updateLanguage)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
    updateLanguage()
    return () => observer.disconnect()
  }, [])
  return null
}
