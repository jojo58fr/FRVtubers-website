import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'
import PrivacyControls from '@/components/privacy/PrivacyControls'

export const metadata: Metadata = { title: 'Paramètres de confidentialité | FRVtubers' }

export default function PrivacySettingsPage() {
  return (
    <LegalPage title="Paramètres de confidentialité" sections={[{ id: 'services-facultatifs', title: 'Services facultatifs' }]} draft={false}>
      <section id="services-facultatifs">
        <p>Vous pouvez consulter le site sans activer Twitch. Les cookies nécessaires à la connexion et les préférences
          de thème/langue sont distincts de ce choix. Open Collective est accessible par un lien externe.</p>
        <PrivacyControls />
      </section>
    </LegalPage>
  )
}
