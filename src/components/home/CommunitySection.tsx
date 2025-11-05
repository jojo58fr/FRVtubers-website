'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import styles from './CommunitySection.module.scss'

type CommunityPillar = {
  icon: IconDefinition
  title: string
  description: string
}

type CommunitySectionProps = {
  pillars: CommunityPillar[]
}

const CommunitySection = ({ pillars }: CommunitySectionProps) => {
  return (
    <section id="community" className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Quelques objectifs communautaires</h2>
        <p className={styles.subtitle}>
          L&apos;aventure FRVtubers c&apos;est aussi proposer aux fans et aux créateurs un moyen de se regrouper pour faire de grandes choses 
        </p>
      </div>
      <div className={styles.grid}>
        {pillars.map((item) => (
          <article key={item.title} className={styles.card}>
            <span className={styles.accent} />
            <div className={styles.iconWrap}>
              <FontAwesomeIcon icon={item.icon} />
            </div>
            <h3 className={styles.cardTitle}>{item.title}</h3>
            <p className={styles.cardDescription}>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default CommunitySection
