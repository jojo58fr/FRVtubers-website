import type { Metadata } from 'next'
import Link from 'next/link'
import SiteHeader from '@/components/home/SiteHeader'
import SiteFooter from '@/components/home/SiteFooter'
import BackToTopButton from '@/components/BackToTopButton'
import { mainNavItems } from '@/lib/navigation'
import { listPublishedStaff } from '@/lib/staff'
import { isSafeHttpUrl } from '@/lib/event-blocks'
import styles from './page.module.scss'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Staff | FRVtubers',
  description: "Rencontrez l'équipe de FRVtubers : les membres actuels, les anciens membres et leurs contributions.",
}

type StaffLink = { label: string; url: string }

// `links` is a raw Json column: keep only well-formed, safe http(s) entries.
const parseLinks = (raw: unknown): StaffLink[] => {
  if (!Array.isArray(raw)) return []
  const result: StaffLink[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const { label, url } = item as Record<string, unknown>
    if (typeof label !== 'string' || typeof url !== 'string') continue
    if (!label.trim() || !isSafeHttpUrl(url)) continue
    result.push({ label, url })
  }
  return result
}

const getInitials = (name: string) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join('')
  return initials ? initials.toUpperCase() : '?'
}

type Contribution = { id: string; text: string; year: number | null; eventSlug: string | null }

// Public view model: only what is rendered, so internal fields (userId, raw links...) never reach props.
type Member = {
  id: string
  name: string
  title: string
  photoPath: string | null
  bio: string | null
  isActive: boolean
  links: StaffLink[]
  contributions: Contribution[]
}

const MemberCard = ({ member }: { member: Member }) => {
  const { links } = member
  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        {member.photoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.photoPath} alt={`Photo de ${member.name}`} loading="lazy" className={styles.photo} />
        ) : (
          <span className={styles.initials} aria-hidden="true">
            {getInitials(member.name)}
          </span>
        )}
        <div className={styles.identity}>
          <h3>{member.name}</h3>
          <p className={styles.role}>{member.title}</p>
        </div>
      </div>

      {member.bio ? <p className={styles.bio}>{member.bio}</p> : null}

      {links.length > 0 ? (
        <ul className={styles.links}>
          {links.map((link, index) => (
            <li key={`${link.url}-${index}`}>
              <a href={link.url} target="_blank" rel="noreferrer noopener">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {member.contributions.length > 0 ? (
        <div className={styles.contributions}>
          <h4>Contributions</h4>
          <ul>
            {member.contributions.map((contribution) => (
              <li key={contribution.id}>
                {contribution.year != null ? <span className={styles.year}>{contribution.year}</span> : null}
                {contribution.eventSlug ? (
                  <Link href={`/evenements/${contribution.eventSlug}`}>{contribution.text}</Link>
                ) : (
                  <span>{contribution.text}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  )
}

const StaffPage = async () => {
  const members: Member[] = (await listPublishedStaff()).map((m) => ({
    id: m.id,
    name: m.name,
    title: m.title,
    photoPath: m.photoPath,
    bio: m.bio,
    isActive: m.isActive,
    links: parseLinks(m.links),
    contributions: m.contributions.map((c) => ({
      id: c.id,
      text: c.text,
      year: c.year,
      eventSlug: c.eventSlug,
    })),
  }))
  const active = members.filter((member) => member.isActive)
  const former = members.filter((member) => !member.isActive)

  return (
    <div className={styles.page}>
      <SiteHeader navItems={mainNavItems} />
      <main className={styles.content}>
        <section className={styles.hero}>
          <p className={styles.kicker}>Équipe</p>
          <h1>Le staff de FRVtubers</h1>
          <p>Les personnes qui font vivre la communauté et ses évènements.</p>
        </section>

        {members.length === 0 ? (
          <p className={styles.empty}>L&apos;équipe sera présentée ici très bientôt, revenez nous voir !</p>
        ) : (
          <>
            {active.length > 0 ? (
              <section className={styles.section}>
                <h2>L&apos;équipe</h2>
                <div className={styles.grid}>
                  {active.map((member) => (
                    <MemberCard key={member.id} member={member} />
                  ))}
                </div>
              </section>
            ) : null}

            {former.length > 0 ? (
              <section className={styles.section}>
                <h2>Anciens membres</h2>
                <div className={styles.grid}>
                  {former.map((member) => (
                    <MemberCard key={member.id} member={member} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>
      <BackToTopButton />
      <SiteFooter />
    </div>
  )
}

export default StaffPage
