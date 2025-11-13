'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import { faHeart } from '@fortawesome/free-solid-svg-icons'
import styles from './FinalCtaSection.module.scss'

const FinalCtaSection = () => {
  return (
    <section className={styles.section}>
      <div className={styles.overlay} />
      <h2 className={styles.title}>Prêt à rejoindre l&apos;aventure FRVtubers ?</h2>
      <div className={styles.actions}>
        <a
          href="https://opencollective.com/frvtubers"
          target="_blank"
          rel="noreferrer"
          className={styles.support}
        >
          <FontAwesomeIcon icon={faHeart} />
          Supporter le projet
        </a>
        <a
          href="https://discord.gg/meyHQYWvjU"
          target="_blank"
          rel="noreferrer"
          className={styles.primary}
        >
          <FontAwesomeIcon icon={faDiscord} />
          Rejoindre le serveur
        </a>
        {/* <a
          href="https://frvtubers.fr/"
          target="_blank"
          rel="noreferrer"
          className={styles.secondary}
        >
          Consulter le wiki
        </a> */}
      </div>
    </section>
  )
}

export default FinalCtaSection
