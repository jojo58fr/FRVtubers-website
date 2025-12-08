import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCreativeCommons,
  faCreativeCommonsBy,
  faCreativeCommonsNcEu,
  faDiscord,
} from '@fortawesome/free-brands-svg-icons'
import { faCircleCheck, faTriangleExclamation, faQuoteLeft, faWarning } from '@fortawesome/free-solid-svg-icons'
import SiteHeader from '../../components/home/SiteHeader'
import SiteFooter from '../../components/home/SiteFooter'
import BackToTopButton from '../../components/BackToTopButton'
import styles from './page.module.scss'

import KokoriGoodEnough from '../../assets/kokori_goodenough.png'
import CreditExampleList from '../../components/kokori/CreditExampleList'
import { mainNavItems } from '@/lib/navigation'

type AssetDownload = {
  title: string
  description: string
  file: string
}

export const metadata: Metadata = {
  title: 'Kokori pour les créateurs — Creative Commons | FRVtubers',
  description:
    'Découvrez comment utiliser Kokori, la mascotte FRVtubers, sous licence Creative Commons et récupérez les assets officiels.',
}

const allowedUses = [
  'Illustrations, fanarts et affiches destinés à la communauté FRVtubers.',
  'Habillages de stream, overlays, alertes ou éléments graphiques non commerciaux.',
  'Présentations pédagogiques ou ateliers autour du VTubing francophone.',
  'Supports événementiels communautaires en ligne ou hors ligne, sans vente directe.',
]
const commitments = [
  'Mentionner clairement « Kokori - mascotte FRVtubers » dans vos descriptions ou crédits.',
  'Respecter l’univers établi de Kokori sans nuire à son image ou à celle de FRVtubers.',
  'Partager vos créations dans une optique non commerciale (pas de vente ni de monétisation directe sauf accord de FRVtubers).',
  'Informer FRVtubers si vous envisagez une utilisation médiatique, commerciale ou institutionnelle.',
]
const restrictedUses = [
  'Usage commercial, placement produit ou vente de produits dérivés sans accord explicite.',
  'Contenus violents, haineux, discriminants ou contraires aux conditions Discord/Twitch.',
  'Association à une marque ou un organisme tiers sans validation de l’équipe FRVtubers.',
  'Réutilisation des modèles originaux pour créer un avatar VTuber dérivé destiné à un tiers.',
]
const creditExamples = [
  'Modèle Kokori par FRVtubers (CC BY-NC 4.0).',
  'Assets Kokori, proposé par FRVtubers sous licence Creative Commons Attribution - Pas d’Utilisation Commerciale 4.0.',
]
const assetDownloads: AssetDownload[] = [
  /*{
    title: 'Modèle Live2D par Cookie Wolie',
    description:
      'Fichiers sources et textures optimisés pour FaceRig/VSF. Comprend les expressions de base, la palette de couleurs officielle et une fiche de référence.',
    file: '/',
  },
  {
    title: 'Modèle 3D par Marius Munier',
    description:
      'Version VRM + FBX avec textures PBR et rig complet. Inclus : scène Blender d’exemple, réglages de shading et guide d’import pour VSeeFace.',
    file: 'https://drive.google.com/drive/folders/1g-OIqYlR3lueb6soEK190uzaL_YtaF-T?usp=sharing',
  },*/
]

const assetVideos = [
  {
    title: 'Modèle 3D low poly par Marius Munier',
    description: 'Version animée prête pour la VR, rig complet et textures optimisées pour VSeeFace.',
    source: '/kokori_low_poly_marius.mp4',
    file: 'https://drive.google.com/drive/folders/1g-OIqYlR3lueb6soEK190uzaL_YtaF-T?usp=sharing',
  },
  {
    title: 'Rig Live2D par Cookie Wolie',
    description: 'Aperçu du rig Live2D avec expressions et mouvements fluides adaptés au streaming.',
    source: '/kokori_cookiewoli.mp4',
    file: 'https://drive.google.com/drive/folders/15tJKdgPTZuu-ftEWjziEjsnqWUXBUPQQ?usp=sharing',
  },
  {
    title: 'Pourquoi pas votre version ?',
    description:
      "Vous pouvez proposer votre modèle en #🎫|ticket-support. À noter qu'il sera obligatoirement sous la même licence Creative Commons.",
  },
]

const KokoriForCreatorsPage = () => {
  return (
    <div className={styles.page}>
      <SiteHeader navItems={mainNavItems} />
      <main className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              <FontAwesomeIcon icon={faCreativeCommons} />
              <FontAwesomeIcon icon={faCreativeCommonsBy} />
              <FontAwesomeIcon icon={faCreativeCommonsNcEu} />
              <span>CC BY-NC 4.0</span>
            </div>
            <h1 className={styles.heroTitle}>Kokori gratuit pour la communauté...<br/>Et pourquoi pas ?</h1>
            <p className={styles.heroSubtitle}>
              Kokori est la mascotte officielle de FRVtubers. À l’image de notre communauté, elle est partagée sous
              licence{' '}
              <Link
                href="https://creativecommons.org/licenses/by-nc/4.0/deed.fr"
                target="_blank"
                rel="noreferrer"
                className={styles.heroLink}
              >
                Creative Commons Attribution – Pas d’Utilisation Commerciale 4.0 International
              </Link>{' '}
              afin d’encourager les créations collaboratives et la visibilité des VTubers francophones.
            </p>
          </div>
          <div className={styles.heroVisual} aria-hidden="true">
            <Image
              src={KokoriGoodEnough}
              alt="Illustration stylisée de Kokori"
              width={420}
              height={420}
              priority
              className={styles.heroImage}
            />
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <FontAwesomeIcon icon={faCircleCheck} className={styles.sectionIcon} />
            <div>
              <h2>Ce que vous pouvez faire</h2>
              <p>La licence vous autorise un usage créatif riche, tant qu’il reste communautaire et non commercial.</p>
            </div>
          </header>
          <ul className={styles.list}>
            {allowedUses.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <FontAwesomeIcon icon={faQuoteLeft} className={styles.sectionIcon} />
            <div>
              <h2>Vos engagements</h2>
              <p>Un rappel des bonnes pratiques pour que Kokori reste l’ambassadrice bienveillante des FRVtubers.</p>
            </div>
          </header>
          <ul className={styles.list}>
            {commitments.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <FontAwesomeIcon icon={faTriangleExclamation} className={styles.sectionIcon} />
            <div>
              <h2>Ce qui reste interdit</h2>
              <p>Quelques limites pour protéger Kokori, ses créateurs et la réputation de toute la communauté.</p>
            </div>
          </header>
          <ul className={styles.list}>
            {restrictedUses.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className={styles.contactNote}>
            Vous avez un projet commercial autour de Kokori&nbsp;? Merci de contacter FRVtubers à{' '}
            <a href="mailto:frvtubers@gmail.com">frvtubers@gmail.com</a> pour obtenir une autorisation dédiée.
          </p>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <FontAwesomeIcon icon={faQuoteLeft} className={styles.sectionIcon} />
            <div>
              <h2>Exemples de crédits</h2>
              <p>Copiez-collez ces exemples dans vos descriptions, overlays ou génériques.</p>
            </div>
          </header>
          <CreditExampleList examples={creditExamples} />
          <p className={styles.creditNote}>
            <FontAwesomeIcon icon={faWarning} /> N’oubliez pas de citer également les créateurs des modèles : Cookie Wolie (Live2D) et Marius Munier (3D), en
            plus de FRVtubers.
          </p>
        </section>

        {assetVideos.length > 0 && (<section className={styles.showcase}>
          <header className={styles.sectionHeader}>
            <div>
              <h2>Découvrez Kokori en action</h2>
              <p>Visualisez les modèles disponibles avant de télécharger les kits officiels.</p>
            </div>
          </header>
          <div className={styles.videoGrid}>
            {assetVideos.map((video) => (
              <figure
                key={video.title}
                className={`${styles.videoCard}${!video.source ? ` ${styles.videoCardStandalone}` : ''}`}
              >
                {video.source ? (
                  <video
                    className={styles.videoPlayer}
                    src={video.source}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : null}
                <figcaption className={styles.videoCaption}>
                  <h3>{video.title}</h3>
                  <p>{video.description}</p>
                  {video.file ? (
                    <a href={video.file} target="blank" className={styles.downloadButton}>
                      Télécharger le modèle
                    </a>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>)}

        {assetDownloads.length > 0 && (<section className={styles.downloads}>
          <header className={styles.sectionHeader}>
            <div>
              <h2>Téléchargez les assets officiels</h2>
              <p>Chaque kit inclut une fiche de licence, les fichiers sources et une checklist d’utilisation.</p>
            </div>
          </header>
          <div className={styles.downloadGrid}>
            {assetDownloads.map((asset) => (
              <article key={asset.title} className={styles.downloadCard}>
                <h3>{asset.title}</h3>
                <p>{asset.description}</p>
                <a href={asset.file} target="blank" className={styles.downloadButton}>
                  Télécharger le kit
                </a>
              </article>
            ))}
          </div>
        </section>)}

        <section className={styles.help}>
          <h2>Un projet communautaire en évolution</h2>
          <p>
            Vous avez un doute sur une utilisation spécifique, ou vous souhaitez contribuer à Kokori&nbsp;? Contactez
            l’équipe FRVtubers sur Discord pour en discuter. Cette page évoluera au fil des retours et des besoins de la
            communauté.
          </p>
          <a
            href="https://discord.gg/meyHQYWvjU"
            target="_blank"
            rel="noreferrer"
            className={styles.discordButton}
          >
            <FontAwesomeIcon icon={faDiscord} />
            Rejoindre FRVtubers sur Discord
          </a>
        </section>
      </main>
      <BackToTopButton />
      <SiteFooter />
    </div>
  )
}

export default KokoriForCreatorsPage
