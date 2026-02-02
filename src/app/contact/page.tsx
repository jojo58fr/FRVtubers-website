import type { Metadata } from 'next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEnvelope,
  faUsers,
  faCloud,
} from '@fortawesome/free-solid-svg-icons'
import {
  faSquareXTwitter,
  faTwitch,
  faTiktok,
  faYoutube,
  faInstagram,
} from '@fortawesome/free-brands-svg-icons'
import SiteHeader from '@/components/home/SiteHeader'
import SiteFooter from '@/components/home/SiteFooter'
import BackToTopButton from '@/components/BackToTopButton'
import { mainNavItems } from '@/lib/navigation'
import styles from './page.module.scss'

export const metadata: Metadata = {
  title: 'Contact | FRVtubers',
  description:
    'Contacte l’équipe FRVtubers pour la presse, les partenariats ou toute question à propos de la communauté.',
}

const pressKitUrl = 'https://frvtubers.com/press-kit'
const directEmail = 'frvtubers@gmail.com'

const socialLinks = [
  { label: 'Twitter', href: 'https://x.com/FRVtubers', icon: faSquareXTwitter },
  { label: 'Bluesky', href: 'https://bsky.app/profile/frvtubers.bsky.social', icon: faCloud },
  { label: 'Twitch', href: 'https://www.twitch.tv/frvtubers', icon: faTwitch },
  { label: 'TikTok', href: 'https://www.tiktok.com/@frvtubers', icon: faTiktok },
  { label: 'YouTube', href: 'https://www.youtube.com/@frvtubers', icon: faYoutube },
  { label: 'Instagram', href: 'https://www.instagram.com/frvtubers', icon: faInstagram },
  { label: 'Groupe VRC', href: 'https://vrchat.com/home/group/grp_b4c2d2d7-9652-42f9-a56b-aeabc6def903', icon: faUsers },
  { label: 'Mail', href: `mailto:${directEmail}`, icon: faEnvelope },
]

const ContactPage = () => {
  return (
    <div className={styles.page}>
      <SiteHeader navItems={mainNavItems} />
      <main className={styles.content}>
        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}>Contact</p>
            <h1>Parlons-en</h1>
            <p className={styles.lead}>
              Une question sur FRVtubers, un partenariat à proposer ou un accès presse ? Envoie-nous un message via le
              formulaire ou écris directement à <a href={`mailto:${directEmail}`}>{directEmail}</a>.
            </p>
          </div>
          <div className={styles.pressKit}>
            <h2>Press kit</h2>
            <p>
              Télécharge le kit presse (logo, visuels, charte) pour présenter FRVtubers dans tes contenus.
            </p>
            <a className={styles.primaryButton} href={pressKitUrl} target="_blank" rel="noreferrer">
              Télécharger le press kit
            </a>
          </div>
        </section>

        <section className={styles.grid}>
          <div className={styles.card}>
            <h3>Formulaire de contact</h3>
            <form className={styles.form}>
              <label>
                <span>Nom et prénom</span>
                <input type="text" name="name" placeholder="Ton nom complet" required />
              </label>
              <label>
                <span>Adresse e-mail</span>
                <input type="email" name="email" placeholder="nom@domaine.com" required />
              </label>
              <label>
                <span>Objet</span>
                <input type="text" name="subject" placeholder="Sujet de ton message" required />
              </label>
              <label>
                <span>Message</span>
                <textarea name="message" rows={5} placeholder="Raconte-nous tout" required />
              </label>
              <button type="submit">Envoyer</button>
            </form>
          </div>

          <div className={styles.card}>
            <h3>Réseaux & contact direct</h3>
            <p className={styles.body}>
              Retrouve-nous sur les réseaux sociaux où nous partageons toute notre actualité en ligne. Suis-nous pour
              ne rien manquer ou envoie-nous un message privé.
            </p>
            <div className={styles.socials}>
              {socialLinks.map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                  <FontAwesomeIcon icon={link.icon} />
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
            <div className={styles.directEmail}>
              <span>Email direct</span>
              <a href={`mailto:${directEmail}`}>{directEmail}</a>
            </div>
          </div>
        </section>
      </main>
      <BackToTopButton />
      <SiteFooter />
    </div>
  )
}

export default ContactPage

