'use client'

import { useTwitchConsent } from './useTwitchConsent'
import styles from './PrivacyControls.module.scss'

export default function TwitchPlayer({ embedUrl }: { embedUrl: string }) {
  const { choice, allow } = useTwitchConsent()
  return (
    <div className={styles.player} lang="fr">
      {choice === 'granted' ? (
        <div className={styles.frame}>
          <iframe src={embedUrl} title="FRVtubers Live de la semaine" allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        </div>
      ) : (
        <div className={styles.preview}>
          <span className={styles.playIcon} aria-hidden="true">▶</span>
          <h3>Regarder la chaîne FRVtubers sur Twitch</h3>
          <p>Le lecteur est désactivé. Des cookies sont nécessaires pour son activation. (Transmission de l'adresse IP, de cookies et traceurs à Twitch Interactive, Inc.)</p>
          <p>Vous pouvez le modifier dans les paramètres de confidentialité en bas de page.</p>
          <p><a href="https://legal.twitch.com/en/legal/privacy-notice/" target="_blank" rel="noopener noreferrer">Politique de confidentialité de Twitch</a>
            {' · '}<a href="https://legal.twitch.com/en/legal/cookie-notice/" target="_blank" rel="noopener noreferrer">Cookies Twitch</a></p>
          {choice === 'denied' && <p role="status">Twitch reste désactivé selon votre choix.</p>}
        </div>
      )}
      {choice !== 'granted' && (
        <div className={styles.actions}>
          <button type="button" onClick={allow}>Autoriser Twitch et afficher le lecteur</button>
        </div>
      )}
    </div>
  )
}
