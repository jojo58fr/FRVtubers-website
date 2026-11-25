import Link from 'next/link'
import styles from './PrivacyNotice.module.scss'

const notices = {
  contact: {
    text: 'Votre nom, e-mail, objet et message, actuellement demandés par le formulaire, servent à transmettre votre demande à l’équipe et à vous répondre. Ils passent par EmailJS et le service de messagerie configuré. Évitez les données sensibles ou inutiles concernant des tiers.',
    section: 'contact',
  },
  application: {
    text: 'Les informations de candidature et votre identifiant Discord sont transmis au staff dans un salon Discord dédié pour examiner votre demande et attribuer le rôle. Le lien de réseau social est facultatif. Évitez les informations sensibles ou inutiles concernant des tiers.',
    section: 'candidatures',
  },
  discord: {
    text: 'La connexion Discord permet de récupérer votre identifiant, pseudonyme, e-mail et avatar, et de vérifier votre appartenance et vos rôles dans le serveur FRVtubers. Ces informations servent à créer ou retrouver votre compte et à gérer les accès.',
    section: 'connexion-discord',
  },
} as const

export default function PrivacyNotice({ kind }: { kind: keyof typeof notices }) {
  const notice = notices[kind]
  return (
    <aside className={styles.notice} lang="fr" aria-label="Information sur les données personnelles">
      <p>{notice.text}</p>
      <p><Link href={`/confidentialite#${notice.section}`}>Politique de confidentialité</Link>
        {' · '}<Link href="/confidentialite#droits">Comment exercer vos droits</Link></p>
    </aside>
  )
}
