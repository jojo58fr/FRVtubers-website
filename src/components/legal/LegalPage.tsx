import type { ReactNode } from 'react'
import Link from 'next/link'
import SiteHeader from '@/components/home/SiteHeader'
import SiteFooter from '@/components/home/SiteFooter'
import { mainNavItems } from '@/lib/navigation'
import styles from './LegalPage.module.scss'

type LegalPageProps = {
  title: string
  sections: ReadonlyArray<{ id: string; title: string }>
  children: ReactNode
  draft?: boolean
}

export default function LegalPage({ title, sections, children }: LegalPageProps) {
  return (
    <div className={styles.page} lang="fr">
      <a className={styles.skipLink} href="#legal-content">Aller au contenu légal</a>
      <SiteHeader navItems={mainNavItems} />
      <main id="legal-content" className={styles.content} tabIndex={-1} aria-labelledby="legal-title">
        <p className={styles.kicker}>Informations légales</p>
        <h1 id="legal-title">{title}</h1>
        <nav className={styles.contents} aria-label="Sommaire">
          <ol>
            {sections.map(section => (
              <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>
            ))}
          </ol>
        </nav>
        <article className={styles.article}>{children}</article>
        <nav className={styles.related} aria-label="Autres informations légales">
          <Link href="/confidentialite">Politique de confidentialité</Link>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/contact">Contacter l’équipe</Link>
        </nav>
      </main>
      <SiteFooter />
    </div>
  )
}
