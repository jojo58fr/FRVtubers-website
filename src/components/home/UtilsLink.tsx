'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVideo, faPalette, faBookOpen, faBoxOpen, faMusic, faGrip } from '@fortawesome/free-solid-svg-icons'
import styles from './UtilsLink.module.scss'

const platforms = [
  {
    icon: faVideo,
    label: 'FRVStream',
    description: 'Plateforme de streaming communautaire',
    href: 'https://stream.frvtubers.com',
    comingSoon: false,
  },
  {
    icon: faPalette,
    label: 'FRVArt',
    description: 'Galerie artistique de la communauté',
    href: 'https://art.frvtubers.com',
    comingSoon: false,
  },
  {
    icon: faBookOpen,
    label: 'FRVDocs',
    description: 'Documentation et guides VTubing',
    href: 'https://docs.frvtubers.com',
    comingSoon: false,
  },
  {
    icon: faGrip,
    label: 'FRVBento',
    description: 'Site type card/linktree/bento permettant la création de multi-liens. (Disponible uniquement pour les VtuberFR)',
    href: 'https://bento.frvtubers.com',
    comingSoon: false,
  },
  {
    icon: faBoxOpen,
    label: 'FRVRessources',
    description: 'Ressources gratuites et payantes pour VTubers FR',
    href: 'https://resources.frvtubers.com/',
    comingSoon: false,
  },
  {
    icon: faMusic,
    label: 'FRVMusic',
    description: 'Plateforme type Spotify pour les VSinger FR / Vtubers FR',
    href: '#',
    comingSoon: true,
  },
]

const UtilsLink = () => {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Nos plateformes</h2>
        <p className={styles.subtitle}>
          Tout l&apos;écosystème FRVtubers au même endroit
        </p>
      </div>
      <div className={styles.grid}>
        {platforms.map((platform) =>
          platform.comingSoon ? (
            <div key={platform.label} className={`${styles.card} ${styles.disabled}`}>
              <div className={styles.iconWrap}>
                <FontAwesomeIcon icon={platform.icon} />
              </div>
              <div className={styles.content}>
                <span className={styles.cardTitle}>{platform.label}</span>
                <span className={styles.cardDescription}>{platform.description}</span>
              </div>
              <span className={styles.badge}>Bientôt</span>
            </div>
          ) : (
            <a
              key={platform.label}
              href={platform.href}
              target="_blank"
              rel="noreferrer"
              className={styles.card}
            >
              <div className={styles.iconWrap}>
                <FontAwesomeIcon icon={platform.icon} />
              </div>
              <div className={styles.content}>
                <span className={styles.cardTitle}>{platform.label}</span>
                <span className={styles.cardDescription}>{platform.description}</span>
              </div>
              <span className={styles.arrow}>→</span>
            </a>
          )
        )}
      </div>
    </section>
  )
}

export default UtilsLink
