import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Politique de confidentialité | FRVtubers',
  description: 'Données personnelles et droits des utilisateurs de FRVtubers — document de travail à valider.',
  robots: { index: false, follow: false },
}

const sections = [
  { id: 'responsable', title: 'Responsable et contact' },
  { id: 'donnees', title: 'Données et utilisations' },
  { id: 'bases-legales', title: 'Bases légales proposées' },
  { id: 'destinataires', title: 'Destinataires et prestataires' },
  { id: 'transferts', title: 'Transferts internationaux' },
  { id: 'conservation', title: 'Conservation' },
  { id: 'traceurs', title: 'Cookies et contenus externes' },
  { id: 'droits', title: 'Vos droits' },
]

export default function PrivacyPage() {
  return (
    <LegalPage title="Politique de confidentialité" sections={sections}>
      <section id="responsable">
        <h2>Responsable du traitement et contact</h2>
        <p>Cette politique concerne le site FRVtubers et les traitements décrits ci-dessous. Les applications
          associées peuvent avoir leurs propres traitements, à préciser avant publication.</p>
        <p>Responsable du traitement : <strong>[À COMPLÉTER]</strong> — identité ou dénomination, statut et adresse.
          Contact RGPD : <strong>[À COMPLÉTER]</strong> — adresse électronique et/ou postale dédiée aux demandes de droits.
          Délégué à la protection des données, si désigné : <strong>[À COMPLÉTER]</strong>.</p>
      </section>
      <section id="donnees">
        <h2>Quelles données utilisons-nous et pourquoi ?</h2>
        <ul>
          <li><strong>Connexion Discord et compte.</strong> Discord nous transmet un identifiant, un pseudonyme ou nom
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
          <li><strong>Candidature VTuber.</strong> Le type de VTuber, le pseudonyme, les plateformes et les liens
            sont obligatoires pour envoyer la candidature ; le lien de réseau social est facultatif. Votre
            identifiant Discord accompagne la demande ; l’identifiant interne sert à vérifier la session côté site.
            La candidature est transmise au staff
            dans un salon Discord dédié pour évaluer la candidature et attribuer le rôle. Le site ne possède pas
            de dossier de candidature distinct en base ; le message reste à gérer dans Discord.</li>
          <li><strong>Contact.</strong> Le nom et prénom, l’e-mail, l’objet et le message sont actuellement requis
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
            Des événements techniques de sécurité sont journalisés. L’hébergement et le proxy peuvent aussi traiter
            des adresses IP, dates et métadonnées de requêtes : contenu exact et destinataires <strong>[À COMPLÉTER]</strong>.</li>
          <li><strong>Dons.</strong> La page de dons intègre Open Collective. Les informations sont saisies auprès
            de ce service et de ses prestataires de paiement ; aucune collecte de numéro de carte par les formulaires
            de ce site n’est identifiée. Certaines contributions peuvent être publiques selon les réglages du service.
            Données reçues par FRVtubers et obligations de conservation applicables : <strong>[À COMPLÉTER]</strong>.</li>
        </ul>
        <p>Aucune décision produisant des effets juridiques fondée exclusivement sur un profilage automatisé
          n’est identifiée dans les fonctions examinées. Les critères d’accès techniques reposent sur le compte
          et les rôles ; l’examen des candidatures relève du staff.</p>
      </section>
      <section id="bases-legales">
        <h2>Bases légales proposées — à valider</h2>
        <p>Les propositions suivantes ne constituent pas encore les fondements définitivement retenus.
          Base légale finale pour chaque finalité : <strong>[À COMPLÉTER]</strong>.</p>
        <ul>
          <li>Compte, connexion, préférences et candidature : exécution du service demandé, si ses conditions
            sont réunies, ou intérêt légitime documenté à organiser la communauté et gérer ses accès.</li>
          <li>Contact : intérêt légitime à répondre aux sollicitations ; mesures précontractuelles uniquement
            pour les demandes qui en relèvent effectivement.</li>
          <li>Sécurité, modération et comptage des ressources : intérêt légitime à protéger le service et à gérer
            le catalogue, sous réserve de l’analyse de nécessité et des droits des personnes.</li>
          <li>Publication de ressources, avatars et magazines, dons et éventuelles obligations comptables :
            fondements à déterminer pour chaque usage ; ne pas appliquer une obligation légale indistinctement.</li>
          <li>Traceurs non strictement nécessaires : consentement préalable lorsque requis. Le mécanisme des
            intégrations externes reste à mettre en place après vérification de leurs traceurs.</li>
        </ul>
        <p>L’autorisation technique donnée à Discord pour la connexion ne vaut pas acceptation générale
          de tous les traitements de FRVtubers.</p>
      </section>
      <section id="destinataires">
        <h2>Qui reçoit les données ?</h2>
        <p>Les membres habilités de l’équipe accèdent aux informations nécessaires à leur mission.
          Les candidatures vont au staff du salon Discord dédié ; les coordonnées des déposants sont réservées
          aux accès de gestion autorisés. Liste précise des destinataires, permissions des salons et bots :
          <strong> [À COMPLÉTER]</strong>.</p>
        <ul>
          <li>Discord : authentification, vérification de l’appartenance et des rôles, avatars et messages
            de candidature ou de publication.</li>
          <li>EmailJS, fournisseur de messagerie et destinataires du modèle d’envoi : acheminement des demandes
            de contact. Service de messagerie, destinataires, copies et historique EmailJS : <strong>[À COMPLÉTER]</strong>.</li>
          <li>Hébergeur, stockage, sauvegardes, proxy et éventuel CDN : identité et sous-traitants <strong>[À COMPLÉTER]</strong>.</li>
          <li>Twitch (lecteur), Wikimedia (images de drapeaux), Open Collective et ses prestataires de paiement :
            chargement de contenus ou services externes selon la page consultée.</li>
          <li>Applications FRVtubers autorisées : une session peut leur être transmise pour les services associés.
            Liste des applications, données nécessaires et responsabilités respectives : <strong>[À COMPLÉTER]</strong>.</li>
        </ul>
        <p>Les rôles juridiques des prestataires (sous-traitant ou responsable distinct selon l’usage), leurs
          entités contractantes et leurs garanties doivent être confirmés : <strong>[À COMPLÉTER]</strong>.
          Les liens vers les réseaux sociaux et d’autres sites conduisent à des services ayant leurs propres politiques.</p>
      </section>
      <section id="transferts">
        <h2>Transferts internationaux</h2>
        <p>L’utilisation de ces prestataires peut impliquer des traitements ou accès hors de l’Espace économique
          européen. Pays, entités, services concernés et garanties effectivement applicables (décision d’adéquation,
          clauses contractuelles types et mesures complémentaires le cas échéant) : <strong>[À COMPLÉTER]</strong>.
          Le moyen d’obtenir une copie des garanties est également <strong>[À COMPLÉTER]</strong>.
          Nous ne pouvons pas affirmer à ce stade que toutes les données restent dans l’Union européenne.</p>
      </section>
      <section id="conservation">
        <h2>Combien de temps les données sont-elles conservées ?</h2>
        <p>Les durées organisationnelles ne sont pas encore validées. Les critères ci-dessous sont à préciser
          et à mettre en œuvre ; ils ne décrivent pas une purge automatique déjà disponible.</p>
        <ul>
          <li>Compte, données Discord et jetons : pendant l’utilisation du compte, puis délai d’inactivité,
            de retrait et éventuelles exceptions justifiées <strong>[À COMPLÉTER]</strong>.</li>
          <li>Candidatures et messages Discord : durée d’examen, délai après décision, copies et sauvegardes
            <strong> [À COMPLÉTER]</strong>.</li>
          <li>Contacts : délai après clôture de la demande, historique EmailJS et archives de messagerie
            <strong> [À COMPLÉTER]</strong>.</li>
          <li>Propositions de ressources, coordonnées des déposants et clics : délais selon statut et besoin
            d’agrégation <strong>[À COMPLÉTER]</strong>.</li>
          <li>Avatars, magazines, couvertures et crédits : durée de publication, retrait, caches et sauvegardes
            <strong> [À COMPLÉTER]</strong>.</li>
          <li>Journaux, données de dons éventuellement reçues et sauvegardes : finalités, durées et exceptions
            légales réellement applicables <strong>[À COMPLÉTER]</strong>.</li>
        </ul>
        <p>La session est configurée pour 30 jours par défaut, avec possibilité de renouvellement et de configuration
          différente en exploitation. Cela ne fixe pas la durée du compte ni celle des jetons en base. La vérification
          des rôles utilise un cache de 5 minutes par défaut ; ce n’est pas un délai d’effacement des données.</p>
      </section>
      <section id="traceurs">
        <h2>Cookies, préférences et contenus externes</h2>
        <p>Des cookies servent à la connexion et à sa sécurité. Leur exemption de consentement suppose qu’ils restent
          strictement nécessaires. Le thème et la langue sont enregistrés dans le stockage local du navigateur,
          sans expiration applicative actuellement définie. Vous pouvez les effacer dans les réglages du navigateur ;
          les préférences associées au compte peuvent ensuite être réappliquées.</p>
        <p>Le lecteur Twitch de l’accueil et le formulaire Open Collective des dons sont actuellement intégrés sans
          mécanisme de choix préalable sur ce site. Les images Wikimedia et certains avatars distants peuvent aussi
          communiquer l’adresse IP et des métadonnées de connexion au service contacté. L’inventaire réseau et
          les réglages de consentement ou de retrait restent à finaliser : <strong>[À COMPLÉTER]</strong>.
          Cette politique ne remplace pas le recueil d’un consentement lorsqu’il est requis.</p>
      </section>
      <section id="droits">
        <h2>Vos droits et comment les exercer</h2>
        <p>Selon le traitement et les conditions prévues par le RGPD, vous disposez de droits d’accès, de rectification,
          d’effacement, de limitation et d’opposition, notamment lorsque le traitement repose sur l’intérêt légitime.
          La portabilité concerne les traitements automatisés fondés sur le consentement ou le contrat.
          Lorsqu’un traitement repose sur votre consentement, vous pouvez le retirer pour l’avenir,
          sans remettre en cause les traitements antérieurs.</p>
        <p>Adressez votre demande au contact RGPD <strong>[À COMPLÉTER]</strong>, en précisant le service concerné
          et les éléments utiles pour retrouver vos données. Une vérification proportionnée de votre identité
          peut être nécessaire en cas de doute ; n’envoyez pas spontanément de pièce d’identité.
          Le délai de réponse est en principe d’un mois, avec prolongation possible de deux mois selon la complexité
          ou le nombre de demandes, en vous informant et en motivant cette prolongation.</p>
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
