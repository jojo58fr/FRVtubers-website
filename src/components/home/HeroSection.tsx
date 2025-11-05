'use client'

import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faVideo } from '@fortawesome/free-solid-svg-icons'
import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import styles from './HeroSection.module.scss'

type StatItem = {
  value: string
  label: string
}

type HeroSectionProps = {
  stats: StatItem[]
  streamUrl: string
  twitchEmbedUrl: string
}

type FrancophonieFlag = {
  name: string
  url: string
}

const FRANCOPHONIE_FLAGS: FrancophonieFlag[] = [
  {
    name: 'Organisation internationale de la Francophonie',
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/27/Flag_of_La_Francophonie.svg',
  },
  { name: 'France', url: 'https://upload.wikimedia.org/wikipedia/en/c/c3/Flag_of_France.svg' },
  { name: 'Belgique', url: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Flag_of_Belgium.svg' },
  { name: 'Suisse', url: 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Flag_of_Switzerland.svg' },
  { name: 'Canada', url: 'https://upload.wikimedia.org/wikipedia/commons/c/cf/Flag_of_Canada.svg' },
  { name: 'Québec', url: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Flag_of_Quebec.svg' },
  { name: 'Sénégal', url: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/Flag_of_Senegal.svg' },
  { name: "Côte d'Ivoire", url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Flag_of_C%C3%B4te_d%27Ivoire.svg/langfr-1280px-Flag_of_C%C3%B4te_d%27Ivoire.svg.png' },
  { name: 'Maroc', url: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Flag_of_Morocco.svg' },
  { name: 'Tunisie', url: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Flag_of_Tunisia.svg' },
]

const HeroSection = ({ stats, streamUrl, twitchEmbedUrl }: HeroSectionProps) => {
  const [flagIndex, setFlagIndex] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setFlagIndex((prev) => (prev + 1) % FRANCOPHONIE_FLAGS.length)
    }, 2200)

    return () => window.clearInterval(interval)
  }, [])

  const activeFlag = FRANCOPHONIE_FLAGS[flagIndex]

  return (
    <section className={styles.wrapper} id="hero">
      <div className={styles.hero}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          Pour la communauté, par la communauté
        </div>
        <h1 className={styles.title}>
          Vtubers et fans ensemble{' '}
          <span className={styles.flagTicker} aria-live="polite">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={activeFlag.name}
              className={styles.flagTickerItem}
              src={activeFlag.url}
              alt={`Drapeau ${activeFlag.name}`}
              loading="lazy"
              decoding="async"
            />
          </span>
        </h1>
        <p className={styles.lead}>
          Serveur communautaire francophone de vtubing (Serveur VtuberFR).
          <br />
          Retrouvez les informations sur vos créateurs préférés et découvrez un Discord communautaire pour les fans de
          vtubing !
          <br />
          <br />
          Vous êtes créateurs ou clippeurs francophones ? Cette place est aussi pour vous !
        </p>
        <div className={styles.ctaRow}>
          <a
            href="https://discord.gg/meyHQYWvjU"
            target="_blank"
            rel="noreferrer"
            className={styles.primaryCta}
          >
            <FontAwesomeIcon icon={faDiscord} />
            Rejoindre le serveur
            <FontAwesomeIcon icon={faArrowRight} className={styles.primaryArrow} />
          </a>
          <a href={streamUrl} className={styles.secondaryCta} target='_blank'>
            <FontAwesomeIcon icon={faVideo} />
            Accéder aux streams de la communauté
          </a>
        </div>
        <div className={styles.statsGrid}>
          {stats.map((item) => (
            <div key={item.label} className={styles.statCard}>
              <p className={styles.statValue}>{item.value}</p>
              <p className={styles.statLabel}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.showcase}>
        <div className={styles.showcaseHeader}>
          <span className={styles.showcaseChip}>La chaîne FRVtubers</span>
          <FontAwesomeIcon icon={faVideo} className={styles.showcaseIcon} />
        </div>
        <div className={styles.showcaseEmbed}>
          <iframe
            src={twitchEmbedUrl}
            title="FRVtubers Live de la semaine"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
        {/* <div className={styles.showcaseBody}>
          <div>
            <p className={styles.showcaseTitle}>Focus : atelier avatars 2D</p>
            <p className={styles.showcaseDescription}>
              Un atelier pour apprendre à optimiser votre rig et à préparer vos scènes OBS.
            </p>
          </div>
          <div className={styles.showcaseFooter}>
            <span>En direct jeudi 20h30</span>
            <FontAwesomeIcon icon={faArrowRight} />
          </div>
        </div> */}
      </div>
    </section>
  )
}

export default HeroSection
