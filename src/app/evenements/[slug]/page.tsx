import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import SiteHeader from '@/components/home/SiteHeader'
import SiteFooter from '@/components/home/SiteFooter'
import BackToTopButton from '@/components/BackToTopButton'
import BlockRenderer from '@/components/events/BlockRenderer'
import { mainNavItems } from '@/lib/navigation'
import { getPublishedEvent } from '@/lib/events'
import { EventDates } from '@/components/events/EventDates'
import styles from './page.module.scss'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const event = await getPublishedEvent(slug)
  if (!event) return { title: 'Évènement introuvable | FRVtubers' }
  return {
    title: `${event.title} | FRVtubers`,
    description: event.summary ?? `Découvrez l'évènement ${event.title} organisé par FRVtubers.`,
  }
}

const EventPage = async ({ params }: PageProps) => {
  const { slug } = await params
  const event = await getPublishedEvent(slug)
  if (!event) notFound()

  return (
    <div className={styles.page}>
      <SiteHeader navItems={mainNavItems} />
      <main className={styles.content}>
        <Link href="/evenements" className={styles.back}>
          ← Tous les évènements
        </Link>
        <article className={styles.article}>
          <header className={styles.header}>
            <h1>{event.title}</h1>
            <EventDates startsAt={event.startsAt} endsAt={event.endsAt} />
            {event.summary ? <p className={styles.summary}>{event.summary}</p> : null}
          </header>
          {event.coverImagePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.coverImagePath} alt="" className={styles.cover} />
          ) : null}
          <BlockRenderer blocks={event.blocks} eventSlug={event.slug} photos={event.photos} />
          {event.photos.length > 0 ? (
            <Link href={`/galerie/${event.slug}`} className={styles.photosLink}>
              Voir les photos
            </Link>
          ) : null}
        </article>
      </main>
      <BackToTopButton />
      <SiteFooter />
    </div>
  )
}

export default EventPage
