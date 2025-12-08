import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowUpRightFromSquare, faShieldHeart, faCircleCheck, faCircleNodes } from '@fortawesome/free-solid-svg-icons'
import SiteHeader from '../../components/home/SiteHeader'
import SiteFooter from '../../components/home/SiteFooter'
import BackToTopButton from '../../components/BackToTopButton'
import styles from './page.module.scss'
import { mainNavItems } from '@/lib/navigation'

const OPEN_COLLECTIVE_URL = 'https://opencollective.com/frvtubers'

const highlightCards = [
  {
    title: 'Cadre européen',
    description:
      'Open Collective Europe gère la partie légale et fiscale. Cela nous évite de monter une association et garantit que chaque dépense est conforme.',
  },
  {
    title: 'Budget communautaire',
    description:
      'Les dons financent l\'hebergement des services, les ateliers techniques, le magazine Kokori Mag et les frais engagés lors des évènements FRVtubers.',
  },
  {
    title: 'Traqueur public',
    description:
      'Toutes les contributions et factures sont visibles en temps réel sur la page Open Collective. Aucune surprise, tout est documenté.',
  },
]

const spendList = [
  'Paiement des serveurs, noms de domaine et outils collaboratifs.',
  'Production de contenus communautaires (Magazine Kokori, visuels, tutoriels).',
  'Organisation d\'ateliers en ligne et de rencontres physiques.',
  'Remboursement des frais bénévoles validés par l\'équipe (déplacements, licences...).',
]

const DonPage = () => {
  return (
    <div className={styles.page}>
      <SiteHeader navItems={mainNavItems} />
      <main className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <span className={styles.badge}><FontAwesomeIcon icon={faCircleNodes} aria-hidden="true" /> Open Collective Europe</span>
            <h1 className={styles.title}>Soutenir FRVtubers de manière transparente</h1>
            <p className={styles.lead}>
              FRVtubers fonctionne grâce aux dons de la communauté. Avec Open Collective, chaque contribution est
              tracée et accessible au public. Vous pouvez suivre l&apos;utilisation du budget ligne par ligne.
            </p>
            <div className={styles.heroActions}>
              <Link href={OPEN_COLLECTIVE_URL} target="_blank" rel="noreferrer" className={styles.primaryCta}>
                Faire un don
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
              </Link>
              <a href="#pourquoi" className={styles.secondaryCta}>
                En savoir plus
              </a>
            </div>
          </div>
        </section>

        <section className={styles.section} id="pourquoi">
          <header className={styles.sectionHeader}>
            <FontAwesomeIcon icon={faShieldHeart} className={styles.sectionIcon} />
            <div>
              <h2>Pourquoi passer par Open Collective&nbsp;?</h2>
              <p>
                Nous utilisons la branche européenne Open Collective Europe. Elle collecte les dons, conserve la
                comptabilité et publie automatiquement nos dépenses. Cela garantit un fonctionnement clair pour tous.
              </p>
            </div>
          </header>
          <div className={styles.cards}>
            {highlightCards.map((card) => (
              <article key={card.title} className={styles.card}>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <FontAwesomeIcon icon={faCircleCheck} className={styles.sectionIcon} />
            <div>
              <h2>Ce que vous financez</h2>
              <p>
                Les dons servent exclusivement a des dépenses utiles a la communauté. Voici les postes principaux qui
                sont couverts aujourd&apos;hui :
              </p>
            </div>
          </header>
          <ul className={styles.list}>
            {spendList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.callout}>
          <div>
            <h2>Prêt a contribuer ?</h2>
            <p>
              Rendez-vous sur notre page Open Collective pour faire un don ponctuel ou mettre en place une contribution
              récurente. Chaque euro aide la scene du VTubing francophone à grandir.
            </p>
          </div>
          <iframe src="https://opencollective.com/embed/frvtubers/donate" style={{width: "100%", minHeight: "100vh", borderRadius: "15px"}}></iframe>
          <Link href={OPEN_COLLECTIVE_URL} target="_blank" rel="noreferrer" className={styles.calloutCta}>
            Donner via Open Collective (ouvrir sur un nouvelle onglet)
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
          </Link>
        </section>
      </main>
      <BackToTopButton />
      <SiteFooter />
    </div>
  )
}

export default DonPage

