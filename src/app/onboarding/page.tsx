import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import SiteHeader, { type NavItem } from '../../components/home/SiteHeader'
import SiteFooter from '../../components/home/SiteFooter'
import BackToTopButton from '../../components/BackToTopButton'
import OnboardingForm from '../../components/onboarding/OnboardingForm'
import styles from '../../components/onboarding/Onboarding.module.scss'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDiscord } from '@fortawesome/free-brands-svg-icons'

const discordInvite = process.env.NEXT_PUBLIC_DISCORD_INVITE ?? 'https://discord.gg/meyHQYWvjU'
const vtuberRoleId = process.env.DISCORD_VTUBER_ROLE_ID

export const metadata = {
  title: 'Onboarding FRVTubers',
  description: 'Étapes pour rejoindre la communauté et candidater au rôle VTuber.',
}

const navItems: NavItem[] = [
  { label: 'Kokori Mag', href: '/kokori-mag' },
  { label: 'Faire un don', href: '/dons' }, 
  { label: 'Kokori pour les créateurs', href: '/kokori-pour-les-createurs' },
]

const OnboardingPage = async () => {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?callbackUrl=/onboarding')
  }

  const roles = session.discordMember?.roles ?? []
  const hasVtuberRole = vtuberRoleId ? roles.includes(vtuberRoleId) : false
  const isPending = session.discordMember?.pending ?? false
  const isGuildMember =
    session.isGuildMember ?? (session.discordMember ? !session.discordMember.pending : false)
  const membershipUnknown = typeof session.isGuildMember === 'undefined'

  return (
    <>
      <SiteHeader navItems={navItems} />
      <main className={styles.wrapper}>
        <h1>Candidature pour devenir VtuberFR</h1>

        <section className={styles.step}>
          <h2>1. Rejoins le Discord FRVTubers</h2>
          <p>
            Clique sur le bouton ci-dessous pour rejoindre le serveur. Assure-toi d’être connecté à Discord et
            d’accepter les règles du serveur.
          </p>
          <a href={discordInvite} target="_blank" rel="noreferrer" className={styles.primaryAction}>
            <FontAwesomeIcon icon={faDiscord} /> Rejoindre le serveur Discord
          </a>
        </section>

        <section className={styles.step}>
          <h2>2. Soumets ta candidature pour le rôle VTuber</h2>
          <p className={styles.instruction}>
            Pour obtenir le rôle de Vtuber, vérifie les critères ci-dessous puis remplis le formulaire. Ton message
            sera envoyé au staff via un salon dédié.
          </p>
          <ul className={styles.criteria}>
            <li>Avoir un avatar 2D/3D ou un PNG/GIF (Reactive inclus).</li>
            <li>Disposer d’une chaîne de créateur de contenu (YouTube, TikTok, Twitch…).</li>
            <li>
              Pour le grade « Futur Vtuber », fournir un reveal ou une date officielle de début ainsi que du contenu
              accessible.
            </li>
          </ul>
          <p className={styles.note}>
            Si tu fais partie d’un groupe et souhaites qu’il soit représenté au sein de la communauté, contacte le
            salon <strong>🎫｜support</strong>.
          </p>

          {isGuildMember ? (
            <OnboardingForm hasVtuberRole={hasVtuberRole} />
          ) : membershipUnknown ? (
            <p className={styles.membershipAlert}>
              Nous ne parvenons pas à vérifier automatiquement ton appartenance au serveur. Vérifie que l’autorisation
              Discord est à jour (scope <code>guilds</code>) puis rafraîchis la page. Si le souci persiste, contacte le
              staff.
            </p>
          ) : (
            <p className={styles.membershipAlert}>
              Le formulaire apparaîtra dès que ton compte Discord aura rejoint le serveur et terminé l’étape
              d’accueil. Reviens ici après avoir cliqué sur « Rejoindre le serveur Discord » et validé les règles !
            </p>
          )}
          
        </section>

        <section className={styles.step}>
          <h2>3. Statut de ta candidature</h2>
          <div className={hasVtuberRole ? styles.statusApproved : styles.statusPending}>
            {hasVtuberRole ? 'Candidature validée ✅' : isPending ? 'Candidature en attente ⏳' : 'Candidature non traitée ⏳'}
          </div>
          {!hasVtuberRole && (
            <p className={styles.statusHelp}>
              Ta demande est en cours de traitement. Dès qu’un membre de l’équipe la validera, tu recevras
              automatiquement le rôle (et les invitations associées).
            </p>
          )}
        </section>
      </main>
      <BackToTopButton />
      <SiteFooter />
    </>
  )
}

export default OnboardingPage
