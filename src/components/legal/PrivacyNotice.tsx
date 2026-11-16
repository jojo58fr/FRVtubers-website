import Link from 'next/link'
import styles from './PrivacyNotice.module.scss'

const notices = {
  contact: 'Les champs sont requis pour acheminer votre demande et y répondre. Votre nom, e-mail, objet et message sont transmis via EmailJS au service de messagerie et aux destinataires configurés de l’équipe. Évitez les données sensibles ou inutiles concernant des tiers.',
  application: 'Les champs marqués * sont nécessaires à l’examen de votre candidature ; le réseau social est facultatif. La demande et votre identifiant Discord sont envoyés au staff dans un salon Discord dédié pour évaluer votre candidature et attribuer le rôle. Votre identifiant interne sert à vérifier la session côté site.',
  discord: 'La connexion transmet votre identifiant Discord, pseudonyme, e-mail et avatar, ainsi que les autorisations permettant de vérifier votre appartenance et vos rôles dans le serveur FRVtubers. Ces données servent à créer ou retrouver votre compte et à gérer les accès. Sans connexion, les fonctions réservées restent indisponibles.',
}

export default function PrivacyNotice({ kind }: { kind: keyof typeof notices }) {
  return (
    <aside className={styles.notice} lang="fr" aria-label="Information sur les données personnelles">
      <p>{notices[kind]}</p>
      <p>Responsable, base légale, durée de conservation et contact RGPD : <strong>[À COMPLÉTER]</strong> avant publication.
        {' '}Droits d’accès, de rectification, d’effacement et autres droits selon les conditions applicables :
        {' '}<Link href={`/confidentialite#${kind === 'discord' ? 'donnees' : 'droits'}`}>politique de confidentialité</Link> (projet à valider).</p>
    </aside>
  )
}
