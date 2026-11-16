import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Politique de confidentialité | FRVtubers',
  description: 'Données personnelles et droits des utilisateurs de FRVtubers — document de travail à valider.',
  robots: { index: false, follow: false },
}

const sections = [
  { id: 'responsable', title: 'Responsable et contact' },
  { id: 'donnees', title: 'Données et utilisations' },
  { id: 'destinataires', title: 'Destinataires et prestataires' },
  { id: 'droits', title: 'Vos droits' },
]

export default function PrivacyPage() {
  return (
    <LegalPage title="Politique de confidentialité" sections={sections}>
      <section id="responsable">
        <h2>Responsable du traitement et contact</h2>
        <p>Cette politique concerne le site FRVtubers et les traitements décrits ci-dessous. Les applications
          associées peuvent avoir leurs propres traitements, à préciser avant publication.</p>
        <p>
          Responsable du traitement : <strong>FRVtubers, porté par Joachim Miens, particulier</strong>.
          <br/>
          Contact RGPD : <a href="mailto:frvtubers@gmail.com">frvtubers@gmail.com</a>.
        </p>
        <p>Le site est édité par Joachim Miens, particulier. Le financement communautaire est présenté sur
          {' '}<a href="https://opencollective.com/frvtubers" rel="noreferrer">Open Collective — FRVtubers</a>.
          Les traitements liés aux dons et leurs destinataires sont décrits ci-dessous.</p>
      </section>
      <section id="donnees">
        <h2>Quelles données utilisons-nous et pourquoi ?</h2>
        <ul>
          <li id="connexion-discord"><strong>Connexion Discord et compte.</strong> Discord nous transmet un identifiant, un pseudonyme ou nom
            global, une adresse e-mail et un avatar selon les informations disponibles. Nous recevons aussi des jetons
            techniques de connexion. Les autorisations demandées permettent de consulter vos serveurs et votre statut
            de membre du serveur FRVtubers. Nous conservons la synthèse relative à ce serveur (appartenance, rôles,
            accueil en attente, date de vérification), un identifiant interne et un rôle de gestion du site.
            Ces informations servent à vous connecter et à contrôler les accès. Les jetons OAuth ne sont pas
            affichés dans la session publique. Sans autorisation Discord, la connexion et les fonctions réservées
            ne sont pas disponibles ; les pages publiques restent consultables.</li>
          <li><strong>Préférences.</strong> Le thème et la langue sont enregistrés dans le navigateur et,
            lorsque vous êtes connecté, associés au compte pour retrouver vos choix. Le choix de langue
            ne signifie pas que tous les contenus du site sont traduits.</li>
          <li id="candidatures"><strong>Candidature VTuber.</strong> Le type de VTuber, le pseudonyme, les plateformes et les liens
            sont obligatoires pour envoyer la candidature ; le lien de réseau social est facultatif. Votre
            identifiant Discord accompagne la demande ; l’identifiant interne sert à vérifier la session côté site.
            La candidature est transmise au staff
            dans un salon Discord dédié pour évaluer la candidature et attribuer le rôle. Le site ne possède pas
            de dossier de candidature distinct en base ; le message reste à gérer dans Discord.</li>
          <li id="contact"><strong>Contact.</strong> Le nom et prénom, l’e-mail, l’objet et le message sont actuellement requis
            par le formulaire pour acheminer la demande et y répondre. Le navigateur les transmet à EmailJS,
            puis au service de messagerie et aux destinataires configurés. Le site ne conserve pas de copie
            métier de ces messages dans sa base. Évitez de transmettre des données sensibles ou des informations
            sur des tiers qui ne sont pas nécessaires à votre demande.</li>
          <li><strong>Ressources.</strong> Les propositions reçues par notre API comprennent un nom de déposant,
            éventuellement son e-mail et son Discord, et les informations de la ressource : créateur, titre,
            liens, image, description, type, prix, langues et tags. Elles servent à la modération et à la
            publication. Les coordonnées du déposant ne figurent pas dans les réponses publiques de consultation
            de ressources ; les informations éditoriales des ressources approuvées sont publiques. Une notification
            de publication peut être envoyée dans Discord. Les clics sont comptés avec la ressource et une date,
            sans champ IP ni identifiant de compte dans la table de clics. Les journaux techniques sont distincts.
            Si une proposition vous concerne sans que vous l’ayez déposée, vous pouvez demander une rectification
            ou contester sa publication auprès du contact RGPD.</li>
          <li><strong>Avatars et publications.</strong> Une copie de l’avatar Discord peut être stockée sur le site
            et accessible par une URL publique ; un avatar peut aussi être chargé depuis Discord. Les magazines
            et leurs couvertures peuvent contenir des pseudonymes, images et crédits. Les fichiers de magazines
            peuvent rester accessibles par leur URL, même si leur page est restreinte. La visibilité et les droits
            de publication doivent être validés avant d’y déposer des données non destinées au public.</li>
          <li><strong>Sécurité et gestion.</strong> Les comptes et leurs rôles servent à limiter les accès du staff.
            Des événements techniques de sécurité sont journalisés. </li>
          <li><strong>Dons.</strong> La page de dons propose un lien vers Open Collective, sans formulaire intégré.
            Les informations sont saisies auprès
            de ce service et de ses prestataires de paiement ; aucune collecte de numéro de carte par les formulaires
            de ce site n’est identifiée. </li>
        </ul>
        <p>Aucune décision produisant des effets juridiques fondée exclusivement sur un profilage automatisé
          n’est identifiée dans les fonctions examinées. Les critères d’accès techniques reposent sur le compte
          et les rôles ; l’examen des candidatures relève du staff.</p>
      </section>
      <section id="destinataires">
        <h2>Qui reçoit les données ?</h2>
        <p>Les membres habilités de l’équipe accèdent aux informations nécessaires à leur mission.
          Les candidatures vont au staff du salon Discord dédié ; les coordonnées des déposants sont réservées
          aux accès de gestion autorisés.</p>
        <ul>
          <li>Discord : authentification, vérification de l’appartenance et des rôles, avatars et messages
            de candidature ou de publication.</li>
          <li>EmailJS, fournisseur de messagerie et destinataires.</li>
          <li>Hébergement : OVH, 2 rue Kellermann, 59100 Roubaix – France. <br/>
            Entité contractante, service et lieu effectif de stockage, sauvegardes, proxy, éventuel CDN
            et sous-traitants.</li>
          <li>Twitch Interactive, Inc. : lecteur facultatif chargé après autorisation.</li>
          <li>Applications FRVtubers autorisées : une session peut leur être transmise pour les services associés.</li>
        </ul>
      </section>
      <section id="droits">
        <h2>Vos droits et comment les exercer</h2>
        <p>Selon le traitement et les conditions prévues par le RGPD, vous disposez de droits d’accès, de rectification,
          d’effacement, de limitation et d’opposition, notamment lorsque le traitement repose sur l’intérêt légitime.
          La portabilité concerne les traitements automatisés fondés sur le consentement ou le contrat.
          Lorsqu’un traitement repose sur votre consentement, vous pouvez le retirer pour l’avenir,
          sans remettre en cause les traitements antérieurs.</p>
        <p>Adressez votre demande à <a href="mailto:frvtubers@gmail.com">frvtubers@gmail.com</a>, en précisant le service concerné
          et les éléments utiles pour retrouver vos données. Une vérification proportionnée de votre identité
          peut être nécessaire en cas de doute ; n’envoyez pas spontanément de pièce d’identité.
          Le délai de réponse est en principe d’un mois, avec prolongation possible de deux mois selon la complexité
          ou le nombre de demandes. Vous devez être informé de la prolongation et de ses motifs dans le premier mois.</p>
        <p>Le traitement des droits nécessite une coordination entre le site, les messages Discord, les courriels,
          les fichiers publics, les caches et les sauvegardes. Aucun export ou effacement automatique global
          n’est actuellement proposé. Certaines données peuvent être conservées si un motif légal le justifie,
          à préciser dans la réponse.</p>
        <p>Vous pouvez déposer une réclamation auprès de la Commission nationale de l’informatique et des libertés :
          {' '}<a href="https://www.cnil.fr/fr/plaintes" rel="noreferrer">cnil.fr — adresser une plainte</a>.</p>
      </section>
    </LegalPage>
  )
}
