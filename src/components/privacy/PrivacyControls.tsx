'use client'

import Link from 'next/link'
import { useTwitchConsent } from './useTwitchConsent'
import styles from './PrivacyControls.module.scss'

export default function PrivacyControls() {
  const { openPreferences } = useTwitchConsent()
  return (
    <section className={styles.controls} aria-labelledby="twitch-settings-title" lang="fr">
      <h2 id="twitch-settings-title">Lecteur Twitch</h2>
      <p>Ce service facultatif de Twitch Interactive, Inc. permet de regarder la chaîne FRVtubers.
        Son activation transmet notamment votre adresse IP à Twitch et peut permettre des traceurs de lecture,
        de mesure d’audience et de publicité, y compris personnalisée, selon ses réglages.</p>
      <p><a href="https://legal.twitch.com/en/legal/privacy-notice/" target="_blank" rel="noopener noreferrer">Politique de confidentialité de Twitch (nouvel onglet)</a>
        {' · '}<a href="https://legal.twitch.com/en/legal/cookie-notice/" target="_blank" rel="noopener noreferrer">Cookies Twitch (nouvel onglet)</a></p>
      <button type="button" onClick={openPreferences}>Ouvrir le gestionnaire de cookies</button>
      <p>L’accord et le refus sont conservés 180 jours à partir du choix, sans renouvellement à chaque visite,
        dans ce navigateur et pour ce site uniquement. Si le stockage est indisponible, le choix s’applique à la page en cours.</p>
      <p>Le retrait masque le lecteur et empêche ses nouveaux chargements sur le site. Il ne supprime pas les cookies
        déjà déposés par Twitch et ne ferme pas les onglets Twitch ouverts séparément. Vous pouvez gérer les données
        déjà enregistrées dans les réglages de votre navigateur et les choix proposés par Twitch.</p>
      <p><Link href="/confidentialite#traceurs">En savoir plus sur les cookies et les services tiers</Link></p>
    </section>
  )
}
