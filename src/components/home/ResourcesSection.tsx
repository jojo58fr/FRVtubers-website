'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faLaptopCode } from '@fortawesome/free-solid-svg-icons'
import styles from './ResourcesSection.module.scss'

type ResourceCard = {
  icon: IconDefinition
  title: string
  description: string
}

type ResourcesSectionProps = {
  resourceCards: ResourceCard[]
}

const listItems = [
  'Guides OBS, VTS et capture pour un workflow stable.',
  'Retour d\'expérience de talents confirmes et fiches bonnes pratiques.',
  'Templates de planning, briefs sponsors et checklists pre-live.',
]

const ResourcesSection = ({ resourceCards }: ResourcesSectionProps) => {
  return (
    <section id="resources" className={styles.section}>
      <div className={styles.overlay} />
      <div className={styles.layout}>
        <div className={styles.leftColumn}>
          <span className={styles.badge}>
            <FontAwesomeIcon icon={faLaptopCode} />
            Vos outils
          </span>
          <h2 className={styles.title}>Une base de connaissances vivante pour chaque talent</h2>
          <p className={styles.description}>
            Du setup audio a la strategie de contenu, nous centralisons des guides, fiches et ressources partagees par les membres. Chaque mois, de nouveaux tutoriels rejoignent la plateforme wiki.
          </p>
          <ul className={styles.list}>
            {listItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className={styles.cardGrid}>
          {resourceCards.map((card) => (
            <article key={card.title} className={styles.card}>
              <div className={styles.cardIcon}>
                <FontAwesomeIcon icon={card.icon} />
              </div>
              <h3 className={styles.cardTitle}>{card.title}</h3>
              <p className={styles.cardDescription}>{card.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ResourcesSection
