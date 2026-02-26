import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SiteHeader from '@/components/home/SiteHeader'
import SiteFooter from '@/components/home/SiteFooter'
import BackToTopButton from '@/components/BackToTopButton'
import { authOptions } from '../api/auth/[...nextauth]/route'
import styles from './profile.module.scss'
import { DEFAULT_PREFERENCES } from '@/lib/user-preferences'
import { mainNavItems } from '@/lib/navigation'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent('/profile')}`)
  }

  const { user, hasVtuberRole, isGuildMember, discordMember, preferences } = session
  const preferenceSnapshot = preferences ?? DEFAULT_PREFERENCES

  const displayInitial = (user?.name ?? user?.email ?? 'M').charAt(0).toUpperCase()

  return (
    <>
      <SiteHeader navItems={mainNavItems} />
      <main className={styles.wrapper}>
        <header className={styles.header}>
          <div className={styles.identity}>
            <div className={styles.avatar}>
              {user?.image ? (
                <img src={user.image} alt={user?.name ?? 'Avatar utilisateur'} />
              ) : (
                <span>{displayInitial}</span>
              )}
            </div>
            <div>
              <h1 className={styles.title}>{user?.name ?? 'Membre FRVtubers'}</h1>
              {user?.email && <p className={styles.subtitle}>{user.email}</p>}
              <div className={styles.badges}>
                {isGuildMember && <span className={styles.badge}>Membre Discord</span>}
                {hasVtuberRole && <span className={styles.badgeHighlight}>Role VTuber validé</span>}
                {discordMember?.pending && <span className={styles.badgePending}>Role en attente de validation</span>}
              </div>
            </div>
          </div>

          <Link href="/settings" className={styles.editLink}>
            Modifier mes parametres
          </Link>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Statut communautaire</h2>
          <ul className={styles.list}>
            <li>
              <span className={styles.listLabel}>Identifiant Discord</span>
              <span className={styles.listValue}>{user?.id ?? 'Non communiqué'}</span>
            </li>
            <li>
              <span className={styles.listLabel}>Presence sur le serveur</span>
              <span className={styles.listValue}>{isGuildMember ? 'Actif' : 'Non membre'}</span>
            </li>
            <li>
              <span className={styles.listLabel}>Role VTuber</span>
              <span className={styles.listValue}>{hasVtuberRole ? 'Attribué' : 'Non attribué'}</span>
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Preferences enregistrées</h2>
          <ul className={styles.list}>
            <li>
              <span className={styles.listLabel}>Langue</span>
              <span className={styles.listValue}>
                {preferenceSnapshot.language === 'fr' ? 'Francais' : 'English'}
              </span>
            </li>
            <li>
              <span className={styles.listLabel}>Theme</span>
              <span className={styles.listValue}>
                {preferenceSnapshot.theme === 'dark' ? 'Theme sombre' : 'Theme clair'}
              </span>
            </li>
          </ul>
        </section>
      </main>
      <BackToTopButton />
      <SiteFooter />
    </>
  )
}
