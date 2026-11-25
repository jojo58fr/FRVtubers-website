import type { CookieConsentConfig, CookieValue } from 'vanilla-cookieconsent'

export const CONSENT_KEY = 'frvtubers_consent'
export const CONSENT_REVISION = 1
export const CONSENT_DAYS = 180

export function createCookieConsentConfig(onUpdate: (cookie: CookieValue) => void): CookieConsentConfig {
  return {
    mode: 'opt-in', autoShow: false, revision: CONSENT_REVISION,
    hideFromBots: false,
    manageScriptTags: false, // React alone mounts/unmounts the iframe.
    autoClearCookies: false, // Never clear authentication or claim to erase Twitch cookies.
    disablePageInteraction: false,
    cookie: { name: CONSENT_KEY, useLocalStorage: true, expiresAfterDays: CONSENT_DAYS, domain: '', path: '/' },
    guiOptions: {
      consentModal: { layout: 'box inline', position: 'bottom center', equalWeightButtons: true },
      preferencesModal: { layout: 'box', equalWeightButtons: true },
    },
    onConsent: ({ cookie }) => onUpdate(cookie),
    onChange: ({ cookie }) => onUpdate(cookie),
    categories: {
      necessary: { enabled: true, readOnly: true },
      media: { enabled: false, services: { twitch: { label: 'Twitch — Twitch Interactive, Inc.' } } },
    },
    language: {
      default: 'fr', autoDetect: 'document',
      translations: {
        fr: {
          consentModal: {
            title: 'Votre choix pour les services tiers',
            description: 'Twitch reste désactivé sans votre accord. Son lecteur peut utiliser des traceurs de mesure d’audience et de publicité, y compris personnalisée.',
            acceptAllBtn: 'Autoriser les services facultatifs', acceptNecessaryBtn: 'Refuser les services facultatifs',
            showPreferencesBtn: 'Choisir les services', footer: '<a href="/confidentialite#traceurs">Politique de confidentialité</a>',
          },
          preferencesModal: {
            title: 'Paramètres de confidentialité', closeIconLabel: 'Fermer sans modifier les choix',
            acceptAllBtn: 'Tout autoriser', acceptNecessaryBtn: 'Tout refuser', savePreferencesBtn: 'Enregistrer mes choix',
            serviceCounterLabel: 'Service|Services',
            sections: [
              { title: 'Votre choix', description: 'Les services facultatifs sont désactivés par défaut. Accord et refus sont conservés 180 jours dans ce navigateur. Vous pouvez revenir ici depuis le footer.' },
              { title: 'Fonctionnement nécessaire', linkedCategory: 'necessary', description: 'Connexion et sécurité, préférences d’interface et mémorisation de vos choix. Ce panneau ne désactive pas les fonctions nécessaires au service demandé.' },
              { title: 'Contenus externes : Twitch', linkedCategory: 'media', description: 'Twitch Interactive, Inc. reçoit notamment votre adresse IP lors du chargement du lecteur. Des traceurs peuvent servir à la lecture, à la mesure d’audience et à la publicité, y compris personnalisée, selon ses réglages. <a href="https://legal.twitch.com/en/legal/privacy-notice/" target="_blank" rel="noopener noreferrer">Confidentialité Twitch (nouvel onglet)</a> · <a href="https://legal.twitch.com/en/legal/cookie-notice/" target="_blank" rel="noopener noreferrer">Cookies Twitch (nouvel onglet)</a>' },
              { title: 'Retrait et informations', description: 'Le retrait masque le lecteur et bloque ses nouveaux chargements. Il ne supprime pas les cookies déjà déposés par Twitch. <a href="/confidentialite#traceurs">Consulter notre politique de confidentialité</a>.' },
            ],
          },
        },
        en: {
          consentModal: {
            title: 'Your choice for third-party services',
            description: 'Twitch stays disabled until you agree. Its player may use audience measurement and advertising trackers, including personalised advertising.',
            acceptAllBtn: 'Allow optional services', acceptNecessaryBtn: 'Reject optional services',
            showPreferencesBtn: 'Choose services', footer: '<a href="/confidentialite#traceurs" lang="fr">Privacy policy (French)</a>',
          },
          preferencesModal: {
            title: 'Privacy settings', closeIconLabel: 'Close without changing choices',
            acceptAllBtn: 'Allow all', acceptNecessaryBtn: 'Reject all', savePreferencesBtn: 'Save my choices',
            serviceCounterLabel: 'Service|Services',
            sections: [
              { title: 'Your choice', description: 'Optional services are disabled by default. Acceptance and refusal are stored for 180 days in this browser. You can reopen these settings from the footer.' },
              { title: 'Necessary functions', linkedCategory: 'necessary', description: 'Sign-in and security, interface preferences and remembering your choices. This panel does not disable functions necessary for the requested service.' },
              { title: 'External content: Twitch', linkedCategory: 'media', description: 'Loading the player sends your IP address to Twitch Interactive, Inc. Trackers may be used for playback, audience measurement and advertising, including personalised advertising, depending on its settings. <a href="https://legal.twitch.com/en/legal/privacy-notice/" target="_blank" rel="noopener noreferrer">Twitch privacy notice (new tab)</a> · <a href="https://legal.twitch.com/en/legal/cookie-notice/" target="_blank" rel="noopener noreferrer">Twitch cookie notice (new tab)</a>' },
              { title: 'Withdrawal and information', description: 'Withdrawal hides the player and prevents it from loading again. It does not delete cookies already set by Twitch. <a href="/confidentialite#traceurs" lang="fr">Read our privacy policy (French)</a>.' },
            ],
          },
        },
      },
    },
  }
}
