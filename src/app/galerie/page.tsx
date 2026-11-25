import type { Metadata } from 'next'
import Link from 'next/link'
import SiteHeader from '@/components/home/SiteHeader'
import SiteFooter from '@/components/home/SiteFooter'
import BackToTopButton from '@/components/BackToTopButton'
import { mainNavItems } from '@/lib/navigation'
import { listAlbums } from '@/lib/events'
import styles from './page.module.scss'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Galerie | FRVtubers',
  description: 'Les photos des évènements organisés par FRVtubers.',
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris',
})

const GalleryPage = async () => {
  const albums = await listAlbums()

  return (
    <div className={styles.page}>
      <SiteHeader navItems={mainNavItems} />
      <main className={styles.content}>
        <section className={styles.hero}>
          <p className={styles.kicker}>Galerie</p>
          <h1>La galerie photo</h1>
          <p>Revivez les moments forts de nos évènements.</p>
        </section>

        {albums.length === 0 ? (
          <p className={styles.empty}>Aucune photo pour le moment, revenez bientôt !</p>
        ) : (
          <ul className={styles.grid}>
            {albums.map((album) => (
              <li key={album.id}>
                <Link href={`/galerie/${album.slug}`} className={styles.card}>
                  {album.coverPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={album.coverPath} alt="" loading="lazy" className={styles.cover} />
                  ) : (
                    <div className={styles.coverPlaceholder} aria-hidden="true" />
                  )}
                  <div className={styles.cardBody}>
                    <h2>{album.title}</h2>
                    <time dateTime={album.startsAt.toISOString()}>{dateFormatter.format(album.startsAt)}</time>
                    <span className={styles.count}>
                      {album.photoCount} photo{album.photoCount > 1 ? 's' : ''}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <BackToTopButton />
      <SiteFooter />
    </div>
  )
}

export default GalleryPage
