'use client'

import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowUp } from '@fortawesome/free-solid-svg-icons'

const SCROLL_TRIGGER = 420

const BackToTopButton = () => {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return window.scrollY > SCROLL_TRIGGER
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const updateVisibility = () => {
      setVisible(window.scrollY > SCROLL_TRIGGER)
    }

    window.addEventListener('scroll', updateVisibility, { passive: true })

    return () => window.removeEventListener('scroll', updateVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className={`group fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] ${visible ? 'opacity-100 translate-y-0' : 'pointer-events-none translate-y-6 opacity-0'}`}
      aria-label="Retour en haut"
    >
      <span className="pointer-events-none absolute inset-0 rounded-2xl bg-[var(--accent-soft)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <FontAwesomeIcon icon={faArrowUp} />
    </button>
  )
}

export default BackToTopButton
