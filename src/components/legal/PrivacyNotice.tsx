import Link from 'next/link'
import styles from './PrivacyNotice.module.scss'

export default function PrivacyNotice({ kind }: { kind: keyof typeof notices }) {
  return (
    <aside className={styles.notice} lang="fr" aria-label="Information sur les données personnelles">
      <p>Votre nom, e-mail, objet et message, actuellement demandés par le formulaire, servent à transmettre votre demande à l’équipe et à vous répondre. Ils passent par EmailJS et le service de messagerie configuré. Évitez les données sensibles ou inutiles concernant des tiers.</p>
    </aside>
  )
}
