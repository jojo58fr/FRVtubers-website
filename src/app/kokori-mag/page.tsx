import Image from 'next/image'
import Link from 'next/link'
import SiteHeader, { type NavItem } from '../../components/home/SiteHeader'
import SiteFooter from '../../components/home/SiteFooter'
import BackToTopButton from '../../components/BackToTopButton'
import MagazineGrid from '../../components/kokori/MagazineGrid'
import { fetchPublishedMagazines } from '../../lib/magazines'
import styles from './page.module.scss'
import KokoriMagIllustration from '../../assets/kokori_mag.webp'
import { faBook, faNewspaper } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const navItems: NavItem[] = [
  { label: 'Kokori Mag', href: '/kokori-mag' },
  { label: 'Faire un don', href: '/dons' }, 
  { label: 'Kokori pour les créateurs', href: '/kokori-pour-les-createurs' },
]

export const revalidate = 120

const KokoriMagPage = async () => {
  const magazines = await fetchPublishedMagazines()
  const latestMagazine = magazines[0]

  return (
    <div className={styles.page}>
      <SiteHeader navItems={navItems} />
      <main className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Kokori Mag, le magazine de tes VTuberFR préférés</h1>
            <p className={styles.heroSubtitle}>
              C&apos;est le rendez-vous 100 % virtuel des fans et créateurs de la scène VTuber francophone ! Chaque numéro met en lumière les talents,
              projets et actualités de la communauté FRVtubers : interviews exclusives, dossiers thématiques, coups de projecteurs sur des chaînes émergentes,
              astuces pour les nouveaux créateurs et bien plus encore.
            </p>
            {latestMagazine ? (
              <div className={styles.heroActions}>
                <Link href={`/kokori-mag/${latestMagazine.slug}`} className={styles.heroCta}>
                  <FontAwesomeIcon icon={faNewspaper} className={styles.cardIcon} />
                  Lire la dernière parution ({latestMagazine.issueNumber ?? 'nouveau'})
                </Link>
              </div>
            ) : null}
          </div>
          <div className={styles.heroVisual} aria-hidden="true">
            <Image
              src={KokoriMagIllustration}
              alt="Illustration de Kokori feuilletant le Kokori Mag"
              width={420}
              height={420}
              priority
              className={styles.heroImage}
            />
            <div className={styles.creditImage}>
              <a href="https://itsmik.carrd.co/" target="blank">Art by @Itsmik</a>
            </div>
          </div>
        </section>
        {magazines.length > 0 ? (
          <MagazineGrid magazines={magazines} />
        ) : (
          <p className={styles.emptyState}>Kokori arrive très bientôt pour te dévoiler sa première édition !</p>
        )}
      </main>
      <BackToTopButton />
      <SiteFooter />
    </div>
  )
}

export default KokoriMagPage

