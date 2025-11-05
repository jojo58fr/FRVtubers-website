'use client'

import styles from './SiteFooter.module.scss'

const currentYear = new Date().getFullYear()

const SiteFooter = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.meta}>
          <span>&copy; {currentYear} Startingames Origins. Tous droits réservés.</span>
        </div>
      </div>
    </footer>
  )
}

export default SiteFooter
