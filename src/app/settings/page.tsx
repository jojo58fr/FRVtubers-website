import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '../api/auth/[...nextauth]/route'
import UserSettingsForm from '@/components/settings/UserSettingsForm'
import { DEFAULT_PREFERENCES } from '@/lib/user-preferences'
import styles from './settings.module.scss'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent('/settings')}`)
  }

  const preferences = session.preferences ?? DEFAULT_PREFERENCES

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Préférences du compte</h1>
          <p className={styles.subtitle}>
            Personnalisez la langue du site et choisissez le thème qui vous convient. Ces réglages sont mémorisés
            pour chaque connexion.
          </p>
        </div>
        <Link href="/profile" className={styles.backLink}>
          ← Retour au profil
        </Link>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Paramètres d’affichage</h2>
        <UserSettingsForm initialPreferences={preferences} />
      </section>
    </div>
  )
}
