import SiteHeader, { type NavItem } from '../components/home/SiteHeader'
import HeroSection from '../components/home/HeroSection'
import CommunitySection from '../components/home/CommunitySection'
import ResourcesSection from '../components/home/ResourcesSection'
import EventsSection from '../components/home/EventsSection'
import TeamSection from '../components/home/TeamSection'
import FinalCtaSection from '../components/home/FinalCtaSection'
import SiteFooter from '../components/home/SiteFooter'
import BackToTopButton from '../components/BackToTopButton'
import styles from '../components/home/HomePage.module.scss'
import {
  faUsers,
  faHandshake,
  faCamera,
  faLaptopCode,
  faBookOpen,
  faGraduationCap,
  faShieldHalved,
  faCalendarDays,
  faMicrophoneLines,
  faVideo,
} from '@fortawesome/free-solid-svg-icons'
import { faDiscord, faTwitch, faYoutube } from '@fortawesome/free-brands-svg-icons'

const { DISCORD_GUILD_ID } = process.env

export const revalidate = 300

async function fetchDiscordPresenceCount(): Promise<number | null> {
  if (!DISCORD_GUILD_ID) {
    return null
  }

  try {
    const response = await fetch(`https://discord.com/api/guilds/${DISCORD_GUILD_ID}/widget.json`, {
      next: { revalidate },
    })

    if (!response.ok) {
      console.error('Discord widget responded with', response.status)
      return null
    }

    const data = await response.json()
    return typeof data?.presence_count === 'number' ? data.presence_count : null
  } catch (error) {
    console.error('Failed to fetch Discord widget data', error)
    return null
  }
}

const navItems: NavItem[] = [
  
]

const buildStats = (memberCount: number | null) => {
  const formatted = memberCount?.toLocaleString('fr-FR')
  const value = formatted ?? '950+'

  return [
    {
      value,
      label:
        formatted != null
          ? `Membres actifs sur Discord (${formatted} en ligne actuellement)`
          : 'Membres actifs sur Discord',
    },
    { value: '500+', label: 'VTubers qui nous ont rejoint' },
    { value: '8', label: 'Événements produits en 2024' },
  ]
}

const communityPillars = [
  {
    icon: faUsers,
    title: 'Communauté francophone',
    description: 'Créations d’événements ou collaborations avec les groupes communautaires vtuber ou non.',
  },
  {
    icon: faHandshake,
    title: 'Représentation physique',
    description: 'Vulgarisation du vtubing et démonstrations techniques lors de conventions et événements.',
  },
  {
    icon: faCamera,
    title: 'Aide aux créateurs',
    description: 'Documentation du vtubing et mise en avant de nos créateurs francophones sur les réseaux.',
  },
]

const resourceCards = [
  {
    icon: faLaptopCode,
    title: 'Wiki communautaire',
    description: 'Fiches détaillées, tutoriels logiciels et bonnes pratiques rédigées par la communauté.',
  },
  {
    icon: faBookOpen,
    title: 'Boîte à outils',
    description: 'Sélection d’overlays, assets, plugins OBS et ressources graphiques libres.',
  },
  {
    icon: faGraduationCap,
    title: 'Ateliers live',
    description: 'Sessions mensuelles avec des invités pour progresser sur la technique et la mise en scène.',
  },
  {
    icon: faShieldHalved,
    title: 'Veille modération',
    description: 'Conseils pour sécuriser vos lives et constituer une équipe de modération solide.',
  },
]

const scheduleEvents = [
  {
    icon: faCalendarDays,
    title: 'Marathon communautaire',
    date: '26 avril 2025',
    description: 'Un week-end complet de relais sur Twitch au profit d’une association partenaire.',
  },
  {
    icon: faMicrophoneLines,
    title: 'Open mic découverte',
    date: 'Tous les premiers dimanches du mois',
    description: 'Une scène ouverte pour présenter vos avatars et tester votre setup en direct.',
  },
  {
    icon: faVideo,
    title: 'Soirées watch party',
    date: 'Chaque vendredi 21h',
    description: 'On se retrouve sur Discord pour revoir les temps forts des streams de la semaine.',
  },
]

const teamMembers = [
  {
    name: 'Aelis',
    role: 'Lead commu',
    focus: 'Coordination Discord et accueil des nouveaux membres.',
    links: [{ icon: faDiscord, label: 'Discord', href: 'https://discord.gg/meyHQYWvjU' }],
  },
  {
    name: 'Kawa',
    role: 'Tech coach',
    focus: 'Support streaming, routing audio et optimisation OBS.',
    links: [{ icon: faTwitch, label: 'Twitch', href: 'https://www.twitch.tv/' }],
  },
  {
    name: 'Mira',
    role: 'Programmation',
    focus: 'Planification des événements et partenariats communautaires.',
    links: [{ icon: faYoutube, label: 'YouTube', href: 'https://www.youtube.com/' }],
  },
]

const streamUrl = 'https://stream.frvtubers.com/'
const twitchEmbedUrl =
  'https://player.twitch.tv/?channel=frvtubers&parent=localhost&parent=frvtubers.com&parent=stream.frvtubers.com&muted=true'

const HomePage = async () => {
  const memberCount = await fetchDiscordPresenceCount()
  const stats = buildStats(memberCount)

  return (
    <div className={styles.page}>
      <SiteHeader navItems={navItems} />
      <main className={styles.content}>
        <HeroSection stats={stats} streamUrl={streamUrl} twitchEmbedUrl={twitchEmbedUrl} />
        <CommunitySection pillars={communityPillars} />
        {/* <ResourcesSection resourceCards={resourceCards} />
        <EventsSection events={scheduleEvents} />
        <TeamSection members={teamMembers} /> */}
        <FinalCtaSection />
      </main>
      <BackToTopButton />
      <SiteFooter />
    </div>
  )
}

export default HomePage
