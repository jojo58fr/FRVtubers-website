'use client'

import Link from 'next/link'
import styles from './SiteFooter.module.scss'
import { useTwitchConsent } from '@/components/privacy/useTwitchConsent'

const currentYear = new Date().getFullYear()

const SiteFooter = () => {
  const { openPreferences } = useTwitchConsent()
  return (
    <footer className={styles.footer} lang="fr">
      <div className={styles.inner}>
        <div className={styles.meta}>
          <span>&copy; {currentYear} Startingames Origins. Tous droits réservés.</span>
        </div>
        <nav className={styles.meta} aria-label="Informations légales" lang="fr">
          <Link href="/confidentialite">Confidentialité</Link>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/parametres-confidentialite">Paramètres de confidentialité</Link>
          <button type="button" onClick={openPreferences}>Gérer mes cookies</button>
        </nav>
      </div>
    </footer>
  )
}

export default SiteFooter
