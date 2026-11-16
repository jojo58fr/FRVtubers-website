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
}

export default function LegalPage({ title, sections, children }: LegalPageProps) {
  return (
    <div className={styles.page} lang="fr">
      <SiteHeader navItems={mainNavItems} />
      <main className={styles.content}>
        <p className={styles.kicker}>Informations légales</p>
        <h1>{title}</h1>
        <aside className={styles.draft} aria-label="Statut du document">
          <strong>Document de travail — non validé pour publication.</strong>
          <p>Version préparée le 16 novembre 2026. Les mentions [À COMPLÉTER] et les bases légales proposées
            doivent être renseignées et validées par le responsable avant publication.</p>
        </aside>
        <nav className={styles.contents} aria-label="Sommaire">
          {sections.map(section => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}
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
