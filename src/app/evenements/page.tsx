import type { Metadata } from 'next'
import Link from 'next/link'
import SiteHeader from '@/components/home/SiteHeader'
import SiteFooter from '@/components/home/SiteFooter'
import BackToTopButton from '@/components/BackToTopButton'
import { mainNavItems } from '@/lib/navigation'
import { listPublishedEvents, type EventType } from '@/lib/events'
import styles from './page.module.scss'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Évènements | FRVtubers',
  description: 'Retrouvez les évènements organisés par FRVtubers : Genesis, FRVmon et autres rendez-vous.',
}

const TYPE_LABELS: Record<EventType, string> = {
  GENESIS: 'Genesis',
  FRVMON: 'FRVmon',
  OTHER: 'Autres',
}

const isEventType = (value: string | undefined): value is EventType =>
  value !== undefined && Object.prototype.hasOwnProperty.call(TYPE_LABELS, value)

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris',
})

type PageProps = {
  searchParams: Promise<{ type?: string | string[] }>
}

const EventsPage = async ({ searchParams }: PageProps) => {
  const { type } = await searchParams
  const rawType = Array.isArray(type) ? type[0] : type
  const activeType = isEventType(rawType) ? rawType : undefined
  const events = await listPublishedEvents(activeType)

  return (
    <div className={styles.page}>
      <SiteHeader navItems={mainNavItems} />
      <main className={styles.content}>
        <section className={styles.hero}>
          <p className={styles.kicker}>Évènements</p>
          <h1>Les évènements FRVtubers</h1>
          <p>Retrouvez nos évènements passés et à venir.</p>
        </section>

        <nav className={styles.filters} aria-label="Filtrer par type">
          <Link href="/evenements" className={styles.filter} aria-current={activeType ? undefined : 'page'}>
            Tous
          </Link>
          {(Object.keys(TYPE_LABELS) as EventType[]).map((key) => (
            <Link
              key={key}
              href={`/evenements?type=${key}`}
              className={styles.filter}
              aria-current={activeType === key ? 'page' : undefined}
            >
              {TYPE_LABELS[key]}
            </Link>
          ))}
        </nav>

        {events.length === 0 ? (
          <p className={styles.empty}>Aucun évènement pour le moment.</p>
        ) : (
          <ul className={styles.grid}>
            {events.map((event) => {
              const body = (
                <>
                  {event.coverImagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.coverImagePath} alt="" loading="lazy" className={styles.cover} />
                  ) : null}
                  <div className={styles.cardBody}>
                    <span className={styles.badge}>{TYPE_LABELS[event.type]}</span>
                    <h2>{event.title}</h2>
                    <time dateTime={event.startsAt.toISOString()}>{dateFormatter.format(event.startsAt)}</time>
                    {event.summary ? <p>{event.summary}</p> : null}
                  </div>
                </>
              )
              return (
                <li key={event.id}>
                  {event.hasArticle ? (
                    <Link href={`/evenements/${event.slug}`} className={`${styles.card} ${styles.cardLink}`}>
                      {body}
                    </Link>
                  ) : (
                    <div className={styles.card}>{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </main>
      <BackToTopButton />
      <SiteFooter />
    </div>
  )
}

export default EventsPage
