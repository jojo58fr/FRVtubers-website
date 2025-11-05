'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import ThemeToggle from '../ThemeToggle'
import styles from './SiteHeader.module.scss'

import FRVtubersLogo from '../../assets/FRVtubers_logo_without_subtitle.png'

export type NavItem = {
  label: string
  href: string
}

type SiteHeaderProps = {
  navItems: NavItem[]
}

const SiteHeader = ({ navItems }: SiteHeaderProps) => {
  const { data: session } = useSession()
  const hasVtuberRole = session?.hasVtuberRole ?? false

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.branding}>
          <Link href={"/"}><Image
            src={FRVtubersLogo}
            alt="FRVtubers"
            width={160}
            height={64}
            priority
            className={styles.logo}
          /></Link>
        </div>

        <nav className={styles.navigation}>
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <ThemeToggle />
          {session ? (
            <div className={styles.sessionBox}>
              <div className={styles.sessionAvatar}>
                {session.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user?.name ?? 'Avatar utilisateur'}
                    width={40}
                    height={40}
                    className={styles.sessionAvatarImage}
                  />
                ) : (
                  <span>{(session.user?.name ?? session.user?.email ?? 'M')[0]?.toUpperCase()}</span>
                )}
              </div>
              {!hasVtuberRole && (
                <Link href="/onboarding" className={styles.requestRoleButton}>
                  Demander le rôle VtuberFR
                </Link>
              )}
              <button
                type="button"
                className={styles.sessionButton}
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                Se déconnecter
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.sessionSignin}
              onClick={() => signIn('discord', { callbackUrl: '/' })}
            >
              Se connecter
            </button>
          )}
          {!session && (<a
            href="https://discord.gg/meyHQYWvjU"
            target="_blank"
            rel="noreferrer"
            className={styles.joinButton}
          >
            <FontAwesomeIcon icon={faDiscord} />
            Rejoindre
          </a>)}
        </div>
      </div>
    </header>
  )
}

export default SiteHeader
