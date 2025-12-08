'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faXmark } from '@fortawesome/free-solid-svg-icons'
import ThemeToggle from '../ThemeToggle'
import styles from './SiteHeader.module.scss'

import FRVtubersLogo from '../../assets/FRVtubers_logo_without_subtitle.png'
import { faDiscord } from '@fortawesome/free-brands-svg-icons'

export type NavItem = {
  label: string
  href: string
  children?: Array<{ label: string; href: string }>
}

type SiteHeaderProps = {
  navItems: NavItem[]
}

const SiteHeader = ({ navItems }: SiteHeaderProps) => {
  const { data: session } = useSession()
  const hasVtuberRole = session?.hasVtuberRole ?? false
  const isAuthenticated = Boolean(session)
  const [menuOpen, setMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [openMobileItem, setOpenMobileItem] = useState<string | null>(null)
  const overflowRef = useRef<string>('')
  const dropdownCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!overflowRef.current) {
      overflowRef.current = document.documentElement.style.overflow || ''
    }

    if (menuOpen) {
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.documentElement.style.overflow = overflowRef.current
    }

    return () => {
      document.documentElement.style.overflow = overflowRef.current
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) {
      setOpenMobileItem(null)
    }
  }, [menuOpen])

  useEffect(() => {
    return () => {
      if (dropdownCloseTimeout.current) {
        clearTimeout(dropdownCloseTimeout.current)
      }
    }
  }, [])

  const handleOpenDropdown = (label: string | null) => {
    if (dropdownCloseTimeout.current) {
      clearTimeout(dropdownCloseTimeout.current)
      dropdownCloseTimeout.current = null
    }
    setOpenDropdown(label)
  }

  const handleCloseDropdown = () => {
    if (dropdownCloseTimeout.current) {
      clearTimeout(dropdownCloseTimeout.current)
    }
    dropdownCloseTimeout.current = setTimeout(() => setOpenDropdown(null), 160)
  }

  const closeMenu = () => setMenuOpen(false)
  const toggleMenu = () => setMenuOpen((prev) => !prev)

  const handleSignIn = () => {
    closeMenu()
    void signIn('discord', { callbackUrl: '/' })
  }

  const handleSignOut = () => {
    closeMenu()
    void signOut({ callbackUrl: '/' })
  }

  const profileInitial =
    (session?.user?.name ?? session?.user?.email ?? 'P')
      .trim()
      .charAt(0)
      .toUpperCase() || 'P'
  const profileImage = session?.user?.image ?? null
  const profileAlt = session?.user?.name ?? session?.user?.email ?? 'Avatar utilisateur'

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.branding}>
          <Link href="/" aria-label="FRVtubers - retour a l'accueil">
            <Image
              src={FRVtubersLogo}
              alt="FRVtubers"
              width={160}
              height={64}
              priority
              className={styles.logo}
            />
          </Link>
        </div>

        <nav className={styles.navigation}>
          {navItems.map((item) => {
            const hasChildren = Array.isArray(item.children) && item.children.length > 0
            const isOpen = openDropdown === item.label

            return (
              <div
                key={item.href}
                className={`${styles.navItem} ${hasChildren ? styles.navItemHasChildren : ''}`}
                onMouseEnter={() => handleOpenDropdown(item.label)}
                onMouseLeave={handleCloseDropdown}
              >
                <a
                  href={item.href}
                  className={`${styles.navLink} ${hasChildren ? styles.navLinkHasChildren : ''} ${
                    isOpen ? styles.navLinkOpen : ''
                  }`}
                  onClick={(event) => {
                    if (hasChildren) {
                      event.preventDefault()
                    }
                  }}
                >
                  {item.label}
                  {hasChildren ? <span className={styles.navCaret} aria-hidden="true">▾</span> : null}
                </a>
                {hasChildren ? (
                  <div className={`${styles.submenu} ${isOpen ? styles.submenuOpen : ''}`}>
                    {item.children!.map((child) => (
                      <a key={child.href} href={child.href} className={styles.submenuLink}>
                        {child.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </nav>

        <button
          type="button"
          className={styles.menuToggle}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={toggleMenu}
        >
          <FontAwesomeIcon icon={faBars} />
        </button>

        <div className={styles.actions}>
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <div className={styles.sessionBox}>
                {!hasVtuberRole && (
                  <Link href="/onboarding" className={styles.requestRoleButton}>
                    Demander le role VtuberFR
                  </Link>
                )}
                <Link href="/profile" className={styles.profilButton} aria-label="Acceder a mon profil">
                  <span className={styles.joinButtonAvatar}>
                    {profileImage ? (
                      <Image
                        src={profileImage}
                        alt={profileAlt}
                        width={28}
                        height={28}
                        className={styles.joinButtonAvatarImage}
                      />
                    ) : (
                      <span className={styles.joinButtonInitial}>{profileInitial}</span>
                    )}
                  </span>
                  <span>Mon profil</span>
                </Link>
                <button type="button" className={styles.sessionButton} onClick={handleSignOut}>
                  Se deconnecter
                </button>
              </div>
            </>
          ) : (
            <div className={styles.authButtons}>
              <button type="button" className={styles.sessionSignin} onClick={handleSignIn}>
                Se connecter
              </button>
              <a
                href="https://discord.gg/meyHQYWvjU"
                target="_blank"
                rel="noreferrer"
                className={styles.joinButton}
              >
                <FontAwesomeIcon icon={faDiscord} />
                Rejoindre
              </a>
            </div>
          )}
        </div>
      </div>

      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`}>
        <div className={styles.mobileHeader}>
          <button
            type="button"
            className={styles.mobileClose}
            onClick={closeMenu}
            aria-label="Fermer le menu"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <nav className={styles.mobileNav}>
          {navItems.map((item) => {
            const hasChildren = Array.isArray(item.children) && item.children.length > 0
            const isOpen = openMobileItem === item.label

            if (!hasChildren) {
              return (
                <a key={item.href} href={item.href} onClick={closeMenu}>
                  {item.label}
                </a>
              )
            }

            return (
              <div key={item.href} className={styles.mobileNavItem}>
                <button
                  type="button"
                  className={styles.mobileNavToggle}
                  onClick={() => setOpenMobileItem(isOpen ? null : item.label)}
                  aria-expanded={isOpen}
                >
                  {item.label}
                  <span className={styles.mobileNavChevron}>{isOpen ? '−' : '+'}</span>
                </button>
                <div className={`${styles.mobileSubmenu} ${isOpen ? styles.mobileSubmenuOpen : ''}`}>
                  {item.children!.map((child) => (
                    <a key={child.href} href={child.href} onClick={closeMenu}>
                      {child.label}
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        <div className={styles.mobileActions}>
          {isAuthenticated ? (
            <>
              {!hasVtuberRole && (
                <Link href="/onboarding" className={styles.mobileLinkButton} onClick={closeMenu}>
                  Demander le role VtuberFR
                </Link>
              )}
              <button type="button" onClick={handleSignOut}>
                Se deconnecter
              </button>
              <Link href="/profile" className={styles.mobileJoin} onClick={closeMenu} aria-label="Voir mon profil">
                {profileImage ? (
                  <Image
                    src={profileImage}
                    alt={profileAlt}
                    width={36}
                    height={36}
                    className={styles.mobileJoinImage}
                  />
                ) : (
                  <span className={styles.mobileJoinInitial}>{profileInitial}</span>
                )}
                <span>Voir mon profil</span>
              </Link>
            </>
          ) : (
            <>
              <button type="button" onClick={handleSignIn}>
                Se connecter
              </button>
              <a
                href="https://discord.gg/meyHQYWvjU"
                target="_blank"
                rel="noreferrer"
                className={styles.mobileJoin}
                onClick={closeMenu}
              >
                <FontAwesomeIcon icon={faDiscord} />
                Rejoindre le serveur
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default SiteHeader
