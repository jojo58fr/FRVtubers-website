import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Mentions légales | FRVtubers',
  description: 'Édition et hébergement du site FRVtubers',
  robots: { index: false, follow: false },
}

const sections = [
  { id: 'editeur', title: 'Éditeur & Publication' },
  { id: 'hebergement', title: 'Hébergement' },
  { id: 'contenus', title: 'Contenus et données personnelles' },
]

export default function LegalNoticesPage() {
  return (
    <LegalPage title="Mentions légales" sections={sections}>
      <section id="editeur">
        <h2>Éditeur du site & Direction de publication</h2>
        <p>Le site FRVtubers est édité par <strong>Joachim Miens</strong>.</p>
        <ul>
          <li>Statut de l’éditeur : <strong>particulier</strong>.</li>
          <li>Adresse électronique : <a href="mailto:contact@joachim-miens.com">contact@joachim-miens.com</a>.</li>
          <li>Site de l’éditeur : <a href="https://www.joachim-miens.com">www.joachim-miens.com</a>.</li>
        </ul>
      </section>
      <section id="hebergement">
        <h2>Hébergeur du site</h2>
        <ul>
          <li>Hébergeur : <strong>OVH</strong>.</li>
          <li>Adresse communiquée : 2 rue Kellermann, 59100 Roubaix – France.</li>
          <li>Site internet : <a href="https://www.ovh.com">www.ovh.com</a>.</li>
        </ul>
        <p>Les prestataires de stockage, de sauvegarde et de diffusion éventuellement distincts sont à identifier
          dans la politique de confidentialité. Aucun hébergeur n’est déduit des exemples de configuration du projet.</p>
      </section>
      <section id="contenus">
        <h2>Contenus et données personnelles</h2>
        <p>Pour signaler une erreur ou un contenu vous concernant, utilisez le <Link href="/contact">contact de l’équipe</Link>.
          Les traitements de données personnelles et les modalités d’exercice des droits sont détaillés dans
          la <Link href="/confidentialite">politique de confidentialité</Link>.</p>
      </section>
    </LegalPage>
  )
}
