'use client'

import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowRight,
  faBookOpen,
  faCalendarDays,
  faCamera,
  faGraduationCap,
  faHandshake,
  faLaptopCode,
  faMicrophoneLines,
  faShieldHalved,
  faUsers,
  faVideo,
} from '@fortawesome/free-solid-svg-icons'
import { faDiscord, faTwitch, faYoutube } from '@fortawesome/free-brands-svg-icons'
import { useSession, signIn, signOut } from 'next-auth/react'
import ThemeToggle from '../components/ThemeToggle'
import BackToTopButton from '../components/BackToTopButton'

import FRVtuberLogo from '../assets/FRVtubers_logo_without_subtitle.png'

const navItems = [
  { label: 'Communaute', href: '#community' },
  { label: 'Ressources', href: '#resources' },
  { label: 'Evenements', href: '#events' },
  { label: 'Equipe', href: '#team' },
]

const stats = [
  { value: '950+', label: 'Membres actifs sur Discord' },
  { value: '500+', label: 'VTubers qui nous ont rejoint' },
  { value: '35', label: 'Evenements produits en 2024' },
]

const communityPillars = [
  {
    icon: faUsers,
    title: 'Communauté francophone',
    description:
      'Créations d\'Évènements ou collab en lien avec des groupes communautaires Vtuber ou non',
  },
  {
    icon: faHandshake,
    title: 'Représentation physique',
    description:
      'Vulgarisation du concept de vtubing et des technologies lors de conventions, évènements..etc',
  },
  {
    icon: faCamera,
    title: 'Aide aux créateurs',
    description:
      'Vulgarisation/Documentation du vtubing, de la technologie et mise en avant de nos créateurs français sur différents réseaux (youtube, tiktok, bestof...)',
  },
]

const resourceCards = [
  {
    icon: faLaptopCode,
    title: 'Wiki communautaire',
    description:
      'Fiches detaillees, tutoriels logiciels et bonnes pratiques redigees par la communaute.',
  },
  {
    icon: faBookOpen,
    title: 'Boite a outils',
    description:
      'Selection d overlays, assets, plugins OBS et ressources graphiques libres.',
  },
  {
    icon: faGraduationCap,
    title: 'Ateliers live',
    description:
      'Sessions mensuelles avec des invites pour progresser sur la technique et la scene.',
  },
  {
    icon: faShieldHalved,
    title: 'Veille moderation',
    description:
      'Conseils pour securiser vos lives et constituer une equipe de moderation solide.',
  },
]

const scheduleEvents = [
  {
    icon: faCalendarDays,
    title: 'Marathon communautaire',
    date: '26 avril 2025',
    description:
      'Un week-end complet de relais sur Twitch au profit d une association partenaire.',
  },
  {
    icon: faMicrophoneLines,
    title: 'Open mic decouverte',
    date: 'Tous les premiers dimanches du mois',
    description:
      'Une scene ouverte pour presenter vos avatars et tester votre setup en direct.',
  },
  {
    icon: faVideo,
    title: 'Soirees watch party',
    date: 'Chaque vendredi 21h',
    description:
      'On se retrouve sur Discord pour revoir les temps forts des streams de la semaine.',
  },
]

const teamMembers = [
  {
    name: 'Aelis',
    role: 'Lead commu',
    focus: 'Coordination Discord et accueil des nouveaux membres.',
    links: [
      { icon: faDiscord, label: 'Discord', href: 'https://discord.gg/meyHQYWvjU' },
    ],
  },
  {
    name: 'Kawa',
    role: 'Tech coach',
    focus: 'Support streaming, routing audio et optimisation OBS.',
    links: [
      { icon: faTwitch, label: 'Twitch', href: 'https://www.twitch.tv/' },
    ],
  },
  {
    name: 'Mira',
    role: 'Programmation',
    focus: 'Planification des evenements et partenariats communautaires.',
    links: [
      { icon: faYoutube, label: 'YouTube', href: 'https://www.youtube.com/' },
    ],
  },
]

const twitchEmbedUrl =
  'https://player.twitch.tv/?channel=frvtubers&parent=localhost&parent=frvtubers.fr&parent=stream.frvtubers.com&muted=true'

export default function Home() {
  const { data: session } = useSession()

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--text-primary)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top,var(--glow),transparent_65%)] md:h-[520px]"
        aria-hidden="true"
      />

      <header className="theme-transition sticky top-0 z-40 border-b border-[var(--border-soft)] bg-[var(--surface-overlay)]/80 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-10">
          <div className="flex items-center gap-3">
            <Image
              src={FRVtuberLogo}
              alt="FRVtubers"
              width={144}
              height={56}
              priority
              className="h-10 w-auto rounded-md shadow-sm"
            />
          </div>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-[var(--text-secondary)] md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group relative transition-colors duration-200 hover:text-[var(--text-primary)]"
              >
                <span className="pointer-events-none absolute -bottom-1 left-0 h-[2px] w-0 rounded-full bg-[var(--accent)] transition-all duration-300 group-hover:w-full" />
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {session ? (
              <div className="hidden items-center gap-3 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text-secondary)] shadow-sm sm:flex">
                <span>Salut {session.user?.name}</span>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--accent-strong)]"
                >
                  Se deconnecter
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => signIn()}
                className="hidden items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] shadow-sm transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:flex"
              >
                Se connecter
              </button>
            )}
            <a
              href="https://discord.gg/meyHQYWvjU"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--accent-strong)]"
            >
              Rejoindre
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-20 md:px-10">
        <section id="hero" className="grid gap-12 pb-24 pt-8 md:grid-cols-[1.05fr,0.95fr] md:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] shadow-sm">
              <span className="inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
              Pour la communauté, par la communauté
            </div>
            <div className="space-y-6">
              <h1 className="text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl">
                Vtubers et Fans ensembles 🇫🇷
              </h1>
              <p className="max-w-2xl text-base text-[var(--text-secondary)] md:text-lg">
                Serveur communautaire Francophone de Vtubing. (Serveur VtuberFR)
                <br/>Retrouvez les informations sur vos créateurs préférés et découvrez un discord communautaire pour les fans de vtubing !

                <br/><br/>Vous êtes créateurs/clippeur Francophone ? Cette place est aussi pour vous !
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="https://discord.gg/meyHQYWvjU"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition hover:bg-[var(--accent-strong)]"
              >
                <FontAwesomeIcon icon={faDiscord} className="text-base" />
                Rejoindre le serveur
                <FontAwesomeIcon icon={faArrowRight} className="text-xs opacity-80" />
              </a>
              <a
                href="https://stream.frvtubers.com/"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-sm transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              >
                <FontAwesomeIcon icon={faVideo} className="text-base text-[var(--accent-strong)]" />
                Acceder aux streams de la communaute
              </a>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-6 text-center shadow-sm"
                >
                  <p className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl">{item.value}</p>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div
              className="absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(circle_at_top,var(--accent-soft),transparent_70%)] blur-3xl"
              aria-hidden="true"
            />
            <div className="relative overflow-hidden rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                <span>Live de la semaine</span>
                <FontAwesomeIcon icon={faVideo} />
              </div>
              <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-elevated)]">
                <div className="relative aspect-video w-full">
                  <iframe
                    src={twitchEmbedUrl}
                    title="FRVtubers Live de la semaine"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    className="h-full w-full border-0"
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Focus : atelier avatars 2D</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Un atelier pour apprendre a optimiser votre rig et a preparer vos scenes OBS.
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)]/50 px-4 py-3 text-sm text-[var(--text-secondary)]">
                  <span>En direct jeudi 20h30</span>
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="community" className="space-y-12 pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Quelques Objectifs</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {communityPillars.map((item) => (
              <article
                key={item.title}
                className="group relative overflow-hidden rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-sm transition hover:-translate-y-1 hover:border-[var(--border-strong)] hover:shadow-lg"
              >
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  <FontAwesomeIcon icon={item.icon} className="text-xl" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">{item.title}</h3>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="resources"
          className="relative overflow-hidden rounded-[3rem] border border-[var(--border-soft)] bg-[var(--surface)] px-8 py-16 shadow-[var(--shadow-soft)] md:px-14"
        >
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,var(--gradient-start)_0%,transparent_65%)]"
            aria-hidden="true"
          />
          <div className="grid gap-12 md:grid-cols-[1.05fr,0.95fr] md:items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                <FontAwesomeIcon icon={faLaptopCode} />
                Vos outils
              </span>
              <h2 className="text-3xl font-bold md:text-4xl">
                Une base de connaissances vivante pour chaque talent
              </h2>
              <p className="text-base text-[var(--text-secondary)] md:text-lg">
                Du setup audio a la strategie de contenu, nous centralisons des guides, fiches et ressources partagees par les membres. Chaque mois, de nouveaux tutoriels rejoignent la plateforme wiki.
              </p>
              <ul className="grid gap-4 text-sm text-[var(--text-secondary)]">
                <li className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-elevated)] px-5 py-4 shadow-sm">
                  Guides obs, vts et capture pour un workflow stable.
                </li>
                <li className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-elevated)] px-5 py-4 shadow-sm">
                  Retour d experience de talents confirmes et fiches bonnes pratiques.
                </li>
                <li className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-elevated)] px-5 py-4 shadow-sm">
                  Templates de planning, briefs sponsors et checklists pre-live.
                </li>
              </ul>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {resourceCards.map((item) => (
                <article
                  key={item.title}
                  className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-elevated)]/90 p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                    <FontAwesomeIcon icon={item.icon} className="text-xl" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">{item.title}</h3>
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="events" className="space-y-12 pb-24 pt-24">
          <div className="grid gap-12 md:grid-cols-[0.9fr,1.1fr] md:items-start">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold md:text-4xl">Agenda communautaire</h2>
              <p className="text-base text-[var(--text-secondary)] md:text-lg">
                Une programmation traitee comme une grille TV : evenements caritatifs, ateliers techniques et rendez-vous conviviaux pour garder le lien.
              </p>
              <a
                href="https://discord.gg/meyHQYWvjU"
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-sm transition hover:border-[var(--border-strong)]"
              >
                Recevoir les rappels Discord
                <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
              </a>
            </div>
            <ul className="space-y-6">
              {scheduleEvents.map((item) => (
                <li
                  key={item.title}
                  className="group relative flex gap-4 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-sm transition hover:-translate-y-1 hover:border-[var(--border-strong)] hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                    <FontAwesomeIcon icon={item.icon} className="text-lg" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{item.date}</p>
                    <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{item.title}</h3>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="team" className="space-y-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Une equipe benevole engagee</h2>
            <p className="mt-4 text-base text-[var(--text-secondary)] md:text-lg">
              Moderateurs, programmateurs et coachs techniques accompagnent la communaute au quotidien pour proposer une experience sereine a tous.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {teamMembers.map((member) => (
              <article
                key={member.name}
                className="flex flex-col justify-between rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-[var(--border-strong)] hover:shadow-lg"
              >
                <div className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                    <FontAwesomeIcon icon={faUsers} className="text-lg" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">{member.name}</h3>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{member.role}</p>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{member.focus}</p>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  {member.links.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                    >
                      <FontAwesomeIcon icon={link.icon} />
                      {link.label}
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="relative mt-24 overflow-hidden rounded-[3rem] border border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--gradient-start)_60%,var(--gradient-end))] px-6 py-14 text-center text-white shadow-[var(--shadow-soft)] md:px-16">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,var(--glow),transparent_70%)] opacity-80" aria-hidden="true" />
          <h2 className="text-3xl font-bold md:text-4xl">Pret a rejoindre l aventure FRVtubers ?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base md:text-lg">
            Lancez-vous dans le vtubing avec une communaute bienveillante, des ressources expertes et un agenda anime toute l annee. On vous attend !
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="https://discord.gg/meyHQYWvjU"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black shadow-lg transition hover:scale-105"
            >
              <FontAwesomeIcon icon={faDiscord} />
              Rejoindre le serveur
            </a>
            <a
              href="https://frvtubers.fr/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/70 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Consulter le wiki
            </a>
          </div>
        </section>
      </main>
      <BackToTopButton />
    </div>
  )
}


