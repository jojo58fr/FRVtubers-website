import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import SiteHeader, { type NavItem } from '../../../components/home/SiteHeader'
import SiteFooter from '../../../components/home/SiteFooter'
import BackToTopButton from '../../../components/BackToTopButton'
import MagazineViewerWrapper from '../../../components/kokori/MagazineViewerWrapper'
import { fetchMagazineBySlug, fetchPublishedMagazines } from '../../../lib/magazines'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import styles from './page.module.scss'

type RouteParams = { slug: string }

const navItems: NavItem[] = [
  { label: 'Kokori Mag', href: '/kokori-mag' },
  { label: 'Kokori pour les créateurs', href: '/kokori-pour-les-createurs' },
]

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const isPromise = <T,>(value: Promise<T> | T): value is Promise<T> =>
  typeof (value as Promise<T>).then === 'function'

const resolveParams = async (params: Promise<RouteParams> | RouteParams) =>
  isPromise(params) ? await params : params

export async function generateStaticParams() {
  const magazines = await fetchPublishedMagazines()
  return magazines.map((magazine) => ({ slug: magazine.slug }))
}

export const revalidate = 120

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams> | RouteParams
}): Promise<Metadata> {
  const { slug } = await resolveParams(params)
  const magazine = await fetchMagazineBySlug(slug, { includeDrafts: true })

  if (!magazine) {
    return {
      title: 'Kokori Mag - Numero introuvable',
    }
  }

  return {
    title: `${magazine.title} | Kokori Mag`,
    description:
      magazine.description ??
      'Kokori Mag, le magazine communautaire de FRVtubers a feuilleter en ligne avec effet pageflip.',
    openGraph: {
      title: magazine.title,
      description: magazine.description ?? undefined,
      images: magazine.coverImageUrl ? [{ url: magazine.coverImageUrl }] : undefined,
    },
  }
}

export const dynamicParams = true

export default async function KokoriMagazinePage({
  params,
}: {
  params: Promise<RouteParams> | RouteParams
}) {
  const { slug } = await resolveParams(params)
  const [magazine, session] = await Promise.all([
    fetchMagazineBySlug(slug, { includeDrafts: true }),
    getServerSession(authOptions),
  ])

  if (!magazine) {
    notFound()
  }

  if (!magazine.published && !session?.hasVtuberRole) {
    redirect('/kokori-mag')
  }

  const formattedDate = dateFormatter.format(new Date(magazine.releaseDate))

  return (
    <div className={styles.page}>
      <SiteHeader navItems={navItems} />
      <main className={styles.content}>
        <div className={styles.breadcrumb}>
          <Link href="/">Accueil</Link>
          <span>/</span>
          <Link href="/kokori-mag">Kokori Mag</Link>
          <span>/</span>
          <span>{magazine.issueNumber ?? magazine.title}</span>
        </div>

        <section className={styles.hero}>
          <div className={styles.heroCover}>
            <img src={magazine.coverImageUrl} alt={`Couverture de ${magazine.title}`} />
          </div>
          <div className={styles.heroContent}>
            <span className={styles.issueTag}>Numero {magazine.issueNumber ?? 'special'}</span>
            <h1 className={styles.title}>{magazine.title}</h1>
            <div className={styles.meta}>
              <span>Publication : {formattedDate}</span>
              <span>Format : PDF interactif</span>
            </div>
            {magazine.description ? <p className={styles.description}>{magazine.description}</p> : null}
          </div>
        </section>

        <section className={styles.viewerSection}>
          <MagazineViewerWrapper file={magazine.pdfPath} title={magazine.title} />
          <a className={styles.downloadLink} href={magazine.pdfPath} download>
            Telecharger la version PDF
          </a>
        </section>
      </main>
      <BackToTopButton />
      <SiteFooter />
    </div>
  )
}
