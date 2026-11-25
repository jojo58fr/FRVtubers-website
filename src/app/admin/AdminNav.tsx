'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './AdminNav.module.scss'

type NavItem = { label: string; href: string; exact?: boolean }

const BASE_ITEMS: NavItem[] = [
  { label: 'Accueil admin', href: '/admin', exact: true },
  { label: 'Magazines', href: '/admin/magazines' },
  { label: 'Ressources', href: '/admin/ressources' },
  { label: 'Évènements', href: '/admin/evenements' },
  { label: 'Staff', href: '/admin/staff' },
]

const USERS_ITEM: NavItem = { label: 'Comptes & rôles', href: '/admin/users' }

export default function AdminNav({ showUsers }: { showUsers: boolean }) {
  const pathname = usePathname() ?? ''
  const items = showUsers ? [...BASE_ITEMS, USERS_ITEM] : BASE_ITEMS

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)

  return (
    <nav className={styles.nav} aria-label="Navigation administration">
      <div className={styles.inner}>
        <Link href="/" className={styles.back}>
          <span aria-hidden="true">←</span> Retour au site
        </Link>
        <ul className={styles.list}>
          {items.map((item) => {
            const active = isActive(item)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={active ? `${styles.link} ${styles.active}` : styles.link}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
