import Link from 'next/link'
import styles from './MagazineGrid.module.scss'
import type { PlainMagazine } from '../../lib/magazines'

type MagazineGridProps = {
  magazines: PlainMagazine[]
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
})

const MagazineGrid = ({ magazines }: MagazineGridProps) => (
  <section className={styles.section}>
    <div className={styles.sectionHeader}>
      <h2>Nos magazines</h2>
      <p>
        Parcourez l&apos;historique de tous les magazines de Kokori, du plus récent jusqu&apos;à nos premières
        éditions&nbsp;!
      </p>
    </div>
    <ul className={styles.grid}>
      {magazines.map((magazine) => {
        const formattedDate = dateFormatter.format(new Date(magazine.releaseDate))

        return (
          <li key={magazine.slug} className={styles.cardWrapper}>
            <Link href={`/kokori-mag/${magazine.slug}`} className={styles.card}>
              <div className={styles.cover}>
                <div className={styles.coverImage}>
                  <img src={magazine.coverImageUrl} alt={`Couverture de ${magazine.title}`} />
                </div>
                <div className={styles.coverOverlay} />
                <div className={styles.coverContent}>
                  <span className={styles.coverBadge}>Édition</span>
                  <span className={styles.coverIssue}>{magazine.issueNumber ?? 'Spécial'}</span>
                  <span className={styles.coverTitle}>Kokori Mag</span>
                </div>
              </div>
              <div className={styles.meta}>
                <h3>{magazine.title}</h3>
                <span className={styles.date}>{formattedDate}</span>
                {magazine.description ? (
                  <p className={styles.description}>{magazine.description}</p>
                ) : null}
                <span className={styles.cta}>Lire le magazine</span>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  </section>
)

export default MagazineGrid
