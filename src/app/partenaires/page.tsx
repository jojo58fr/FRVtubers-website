import type { Metadata } from 'next'
import type { StaticImageData } from 'next/image'
import Image from 'next/image'
import SiteHeader from '@/components/home/SiteHeader'
import SiteFooter from '@/components/home/SiteFooter'
import BackToTopButton from '@/components/BackToTopButton'
import { mainNavItems } from '@/lib/navigation'
import styles from './page.module.scss'
import VtuberQCLogo from '../../assets/partenaires/VtuberQC.jpg'
import NyassobiLogo from '../../assets/partenaires/Nyassobi.jpg'
import VirtuellementVirtuelLogo from '../../assets/partenaires/VirtuellementVirtuel.png'

type Partner = {
  name: string
  description: string
  links: Array<{ label: string; href: string }>
  logo?: StaticImageData
  logoText?: string
  logoTint?: string
}

export const metadata: Metadata = {
  title: 'Partenaires | FRVtubers',
  description:
    'Découvrez les structures partenaires de FRVtubers et comment proposer une collaboration avec la communauté.',
}

const partners: Partner[] = [
  {
    name: 'VTuberQC',
    description: 'Découvrez la belle communauté des québécois virtuels, prêts à conquérir le monde!! Avec plus de 500 membres depuis sa création en février 2022, notre groupe a pour mission de rassembler tous les vtubers québécois sous une même bannière, celle de VTuberQC.',
    links: [{ label: 'Site web', href: 'https://vtuberqc.ca/' }],
    logo: VtuberQCLogo,
  },
  {
    name: 'VTuberFans FR',
    description: 'Serveur Discord dédié pour les fans de VTubing !',
    links: [{ label: 'Discord', href: 'https://discord.gg/Uv7dcyJ' }],
    logoText: 'VF',
    logoTint: '#2563eb',
  },
  {
    name: 'Nyassobi',
    description: 'L\'association Nyassobi promeut la communauté des vtubers francophones en menant des actions en ligne et en convention pour faire découvrir ce milieu au grand public. Elle accompagne aussi les créateurs via des ateliers et diffuse toutes ses activités sur ses réseaux sociaux.',
    links: [{ label: 'Site web', href: 'https://nyassobi.fr/' }],
    logo: NyassobiLogo,
  },
  {
    name: 'Virtuellement Virtuel',
    description: 'Projet VR qui rassemble des créateurs virtuels autour d\'événements immersifs.',
    links: [
      { label: 'Discord', href: 'https://discord.gg/8kBR2R5AEp' },
      { label: 'Groupe VRC', href: 'https://vrc.group/VIRVIR.5702' },
      { label: 'Twitter', href: 'https://x.com/VVirtuelFr' },
    ],
    logo: VirtuellementVirtuelLogo,
  },
]

const PartnersPage = () => {
  return (
    <div className={styles.page}>
      <SiteHeader navItems={mainNavItems} />
      <main className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <p className={styles.kicker}>Partenariats</p>
            <h1>Nos partenaires et collaborations</h1>
            <p>
              FRVtubers travaille main dans la main avec les structures déjà existantes dans l&apos;écosystème VTuber ou du Virtuel ! <br/>
              Nous contactons les gérants pour imaginer des projets communs et donner plus de visibilité à la scène
              francophone. Voici les partenaires actuels : n&apos;hésitez pas à visiter leur Discord ou leur site&nbsp;!
            </p>
            <p className={styles.contact}>
              Tu veux devenir partenaire ? Écris-nous sur <a href="mailto:frvtubers@gmail.com">frvtubers@gmail.com</a>{' '}
              ou via le canal support sur Discord.
            </p>
          </div>
        </section>

        <section className={styles.partnersSection}>
          <div className={styles.sectionHeader}>
            <h2>Ils avancent avec nous</h2>
            <p>Des communautés et projets qui partagent la même énergie pour soutenir les créateurs virtuels.</p>
          </div>
          <div className={styles.partnerGrid}>
            {partners.map((partner) => (
              <article key={partner.name} className={styles.partnerCard}>
                <div className={styles.partnerLogo}>
                  {partner.logo ? (
                    <Image
                      src={partner.logo}
                      alt={`Logo ${partner.name}`}
                      className={styles.partnerLogoImage}
                      fill
                      sizes="96px"
                    />
                  ) : (
                    <span
                      className={styles.partnerLogoFallback}
                      style={{ background: partner.logoTint ?? 'var(--accent)' }}
                      aria-hidden="true"
                    >
                      {partner.logoText ?? partner.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className={styles.partnerBody}>
                  <header className={styles.partnerTitle}>
                    <h3>{partner.name}</h3>
                  </header>
                  <p className={styles.partnerDescription}>{partner.description}</p>
                  <div className={styles.partnerLinks}>
                    {partner.links.map((link) => (
                      <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.cta}>
          <div>
            <p className={styles.kicker}>Collaborer</p>
            <h2>Une idée de partenariat ?</h2>
            <p>
              Nous cherchons des initiatives prêtes à construire des ponts entre communautés : événements
              en ligne, relais de communication ou support technique, etc... Parlons-en ensemble !
            </p>
            <div className={styles.ctaActions}>
              <a className={styles.primaryButton} href="mailto:frvtubers@gmail.com">
                Proposer un partenariat
              </a>
              <a
                className={styles.secondaryButton}
                href="https://discord.gg/meyHQYWvjU"
                target="_blank"
                rel="noreferrer"
              >
                Ouvrir un ticket support
              </a>
            </div>
          </div>
        </section>
      </main>
      <BackToTopButton />
      <SiteFooter />
    </div>
  )
}

export default PartnersPage
