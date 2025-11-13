import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faArrowUpRightFromSquare, faCircleNodes, faEarthEurope, faEuro, faMoneyBill, faShieldHeart } from '@fortawesome/free-solid-svg-icons'
import styles from './OpenCollectiveSection.module.scss'

const OPEN_COLLECTIVE_URL = 'https://opencollective.com/frvtubers'

const benefits = [
  {
    icon: faEarthEurope,
    title: 'Structure européenne reconnue',
    description:
      'Notre collecte est hebergée par l\'Open Collective Europe. Cette fondation agit comme partenaire fiscal et juridique pour toutes les dépenses de FRVtubers et de nombreux projets Open-source.',
  },
  {
    icon: faMoneyBill,
    title: 'Transparence financière',
    description:
      'Chaque don, facture et remboursement est publié automatiquement sur notre page Open Collective. Vous pouvez suivre l\'évolution du budget en temps reel.',
  },
  {
    icon: faShieldHeart,
    title: 'Soutien aux projets',
    description:
      'Les contributions financent les serveurs, les ateliers techniques, Kokori Mag et les frais engagés par l\'équipe bénévole lors des évènements.',
  },
]

const OpenCollectiveSection = () => {
  return (
    <section className={styles.section} id="open-collective">
      <div className={styles.header}>
        <span className={styles.badge}>
          <FontAwesomeIcon icon={faCircleNodes} aria-hidden="true" />
          Open Collective Europe
        </span>
        <h2 className={styles.title}>FRVtubers appartient & est ouvert à tous !</h2>
        <p className={styles.lead}>
          Nous utilisons la plateforme Open Collective pour collecter et redistribuer les fonds de la communauté. Cela
          nous permet de rester transparents, de publier nos dépenses et de bénéficier du cadre légal de la branche
          européenne <strong>Open Collective Europe</strong>.
        </p>
      </div>

      <div className={styles.cards}>
        {benefits.map((item) => (
          <article key={item.title} className={styles.card}>
            <FontAwesomeIcon icon={item.icon} className={styles.cardIcon} />
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>

      <div className={styles.actions}>
        <Link href="/dons" className={styles.primaryAction}>
          Comprendre comment donner
          <FontAwesomeIcon icon={faArrowRight} className={styles.primaryArrow} />
        </Link>
        <Link href={OPEN_COLLECTIVE_URL} target="_blank" rel="noreferrer" className={styles.secondaryAction}>
          Voir la page Open Collective
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
        </Link>
      </div>
    </section>
  )
}

export default OpenCollectiveSection

