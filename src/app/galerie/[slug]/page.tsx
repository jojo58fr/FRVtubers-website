import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import SiteHeader from '@/components/home/SiteHeader'
import SiteFooter from '@/components/home/SiteFooter'
import BackToTopButton from '@/components/BackToTopButton'
import PhotoGrid from '@/components/gallery/PhotoGrid'
import { mainNavItems } from '@/lib/navigation'
import { getAlbum } from '@/lib/events'
import styles from '../page.module.scss'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ slug: string }>
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris',
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const album = await getAlbum(slug)
  if (!album) return { title: 'Album introuvable | FRVtubers' }
  return {
    title: `${album.title} - Galerie | FRVtubers`,
    description: `Les photos de l'évènement ${album.title} organisé par FRVtubers.`,
  }
}

const AlbumPage = async ({ params }: PageProps) => {
  const { slug } = await params
  const album = await getAlbum(slug)
  if (!album) notFound()

  return (
    <div className={styles.page}>
      <SiteHeader navItems={mainNavItems} />
      <main className={styles.content}>
        <Link href="/galerie" className={styles.back}>
          ← Toute la galerie
        </Link>
        <section className={styles.hero}>
          <h1>{album.title}</h1>
          <time dateTime={album.startsAt.toISOString()}>{dateFormatter.format(album.startsAt)}</time>
        </section>
        {album.hasArticle ? (
          <Link href={`/evenements/${album.slug}`} className={styles.articleLink}>
            Lire l&apos;article de l&apos;évènement
          </Link>
        ) : null}
        {album.photos.length === 0 ? (
          <p className={styles.empty}>Aucune photo pour cet évènement.</p>
        ) : (
          <PhotoGrid photos={album.photos} altPrefix={`Photo de ${album.title}`} />
        )}
      </main>
      <BackToTopButton />
      <SiteFooter />
    </div>
  )
}

export default AlbumPage
