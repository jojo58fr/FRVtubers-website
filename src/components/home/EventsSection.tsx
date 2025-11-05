'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import styles from './EventsSection.module.scss'

type EventItem = {
  icon: IconDefinition
  title: string
  date: string
  description: string
}

type EventsSectionProps = {
  events: EventItem[]
}

const EventsSection = ({ events }: EventsSectionProps) => {
  return (
    <section id="events" className={styles.section}>
      <div className={styles.layout}>
        <div className={styles.left}>
          <h2 className={styles.title}>Agenda communautaire</h2>
          <p className={styles.description}>
            Une programmation traitee comme une grille TV : evenements caritatifs, ateliers techniques et rendez-vous conviviaux pour garder le lien.
          </p>
          <a
            href="https://discord.gg/meyHQYWvjU"
            target="_blank"
            rel="noreferrer"
            className={styles.button}
          >
            Recevoir les rappels Discord
            <FontAwesomeIcon icon={faArrowRight} />
          </a>
        </div>
        <ul className={styles.eventList}>
          {events.map((item) => (
            <li key={item.title} className={styles.eventCard}>
              <div className={styles.eventIcon}>
                <FontAwesomeIcon icon={item.icon} />
              </div>
              <div>
                <p className={styles.eventDate}>{item.date}</p>
                <h3 className={styles.eventTitle}>{item.title}</h3>
                <p className={styles.eventDescription}>{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default EventsSection
