import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Mentions légales | FRVtubers',
  description: 'Édition et hébergement du site FRVtubers — document de travail à compléter.',
  robots: { index: false, follow: false },
}

const sections = [
  { id: 'editeur', title: 'Éditeur' },
  { id: 'publication', title: 'Publication' },
  { id: 'hebergement', title: 'Hébergement' },
  { id: 'contenus', title: 'Contenus et données personnelles' },
]

export default function LegalNoticesPage() {
  return (
    <LegalPage title="Mentions légales" sections={sections}>
      <section id="editeur">
        <h2>Éditeur du site</h2>
        <p>Le site FRVtubers est édité par : <strong>[À COMPLÉTER]</strong>.</p>
        <ul>
          <li>Identité ou dénomination exacte et statut juridique de l’éditeur : <strong>[À COMPLÉTER]</strong>.</li>
          <li>Adresse ou siège : <strong>[À COMPLÉTER]</strong>.</li>
          <li>Adresse électronique de l’éditeur : <strong>[À COMPLÉTER]</strong>.</li>
          <li>Numéro de téléphone : <strong>[À COMPLÉTER]</strong>.</li>
          <li>Selon le statut et l’activité : immatriculation et registre compétent, capital social, numéro de TVA
            et mentions professionnelles éventuellement applicables : <strong>[À COMPLÉTER]</strong>.</li>
        </ul>
        <p>Le statut réel de l’éditeur doit être confirmé pour déterminer les mentions obligatoires applicables.
          Le nom figurant dans le pied de page ne suffit pas à établir son identité juridique.</p>
      </section>
      <section id="publication">
        <h2>Direction de la publication</h2>
        <p>Directeur ou directrice de la publication : <strong>[À COMPLÉTER]</strong> — nom et qualité.</p>
        <p>Responsable de la rédaction, le cas échéant : <strong>[À COMPLÉTER]</strong>.</p>
      </section>
      <section id="hebergement">
        <h2>Hébergeur du site</h2>
        <ul>
          <li>Nom ou dénomination sociale : <strong>[À COMPLÉTER]</strong>.</li>
          <li>Adresse : <strong>[À COMPLÉTER]</strong>.</li>
          <li>Numéro de téléphone : <strong>[À COMPLÉTER]</strong>.</li>
          <li>Site internet et service d’hébergement utilisé : <strong>[À COMPLÉTER]</strong>.</li>
        </ul>
        <p>Les prestataires de stockage, de sauvegarde et de diffusion éventuellement distincts sont à identifier
          dans la politique de confidentialité. Aucun hébergeur n’est déduit des exemples de configuration du projet.</p>
      </section>
      <section id="contenus">
        <h2>Contenus et données personnelles</h2>
        <p>Les crédits, titulaires des droits et autorisations applicables aux logos, illustrations, avatars,
          ressources et magazines doivent être précisés : <strong>[À COMPLÉTER]</strong>.
          La licence du code ne détermine pas à elle seule les droits de réutilisation de tous ces contenus.</p>
        <p>Pour signaler une erreur ou un contenu vous concernant, utilisez le <Link href="/contact">contact de l’équipe</Link>.
          Les traitements de données personnelles et les modalités d’exercice des droits sont détaillés dans
          la <Link href="/confidentialite">politique de confidentialité</Link>.</p>
      </section>
    </LegalPage>
  )
}
