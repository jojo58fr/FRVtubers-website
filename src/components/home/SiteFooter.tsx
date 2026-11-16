'use client'

import Link from 'next/link'
import styles from './SiteFooter.module.scss'

const currentYear = new Date().getFullYear()

const SiteFooter = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.meta}>
          <span>&copy; {currentYear} Startingames Origins. Tous droits réservés.</span>
        </div>
        <nav className={styles.meta} aria-label="Informations légales" lang="fr">
          <Link href="/confidentialite">Confidentialité</Link>
          <Link href="/mentions-legales">Mentions légales</Link>
        </nav>
      </div>
    </footer>
  )
}

export default SiteFooter
