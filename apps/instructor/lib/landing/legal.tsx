/**
 * Legal document content for landing: Refund, Privacy, ToS, Cookie, AUP.
 * EN + IT, FR, DE. Adapted from template for FrostDesk.
 */
/* eslint-disable react/no-unescaped-entities */

import React from "react";
import Link from "next/link";
import type { Lang } from "./translations";

export const LEGAL_LAST_UPDATED = "Mar 10, 2026";
export const CONTACT_EMAIL = "Hello@ArmoFlow.com";

export type LegalSection = { title: string; body: React.ReactNode };
export type LegalDocument = {
  title: string;
  lastUpdated: string;
  contactEmail: string;
  sections: LegalSection[];
  backToHome: string;
};

function mailto(email: string): React.ReactNode {
  return (
    <a href={`mailto:${email}`} className="text-primary underline hover:opacity-90">
      {email}
    </a>
  );
}

function docLink(href: string, label: string): React.ReactNode {
  return (
    <Link href={href} className="text-primary underline hover:opacity-90">
      {label}
    </Link>
  );
}

const REFUND_EN: LegalDocument = {
  title: "Refund Policy",
  lastUpdated: LEGAL_LAST_UPDATED,
  contactEmail: CONTACT_EMAIL,
  backToHome: "Back to home",
  sections: [
    {
      title: "1. Subscription Payments",
      body: (
        <>
          FrostDesk provides software services on a subscription basis. By purchasing a subscription, you agree to the recurring billing terms presented at checkout. Subscriptions are billed in advance on a recurring basis (monthly or annually depending on the plan selected).
        </>
      ),
    },
    {
      title: "2. Refund Eligibility",
      body: (
        <>
          If you are not satisfied with the service, you may request a refund within <strong>14 days of the initial purchase</strong>. Refunds may be granted under the following conditions: the request is made within 14 days of the initial payment; the account has not engaged in abusive or fraudulent activity; the request is submitted through our support email. Refunds are issued at the discretion of FrostDesk. For the one-time early-access deposit offered on the landing page, the same 14-day refund eligibility applies unless otherwise stated at checkout.
        </>
      ),
    },
    {
      title: "3. Subscription Cancellation",
      body: (
        <>
          You may cancel your subscription at any time. After cancellation: your subscription will remain active until the end of the current billing period; no further charges will be made; partial refunds for unused subscription time are not normally provided.
        </>
      ),
    },
    {
      title: "4. Processing Refunds",
      body: (
        <>
          Approved refunds will be processed to the original payment method used during purchase. Refund processing times may vary depending on your payment provider.
        </>
      ),
    },
    {
      title: "5. Contact",
      body: (
        <>
          If you have questions about this policy or would like to request a refund, please contact: {mailto(CONTACT_EMAIL)}.
        </>
      ),
    },
  ],
};

const PRIVACY_EN: LegalDocument = {
  title: "Privacy Policy",
  lastUpdated: LEGAL_LAST_UPDATED,
  contactEmail: CONTACT_EMAIL,
  backToHome: "Back to home",
  sections: [
    {
      title: "1. Information We Collect",
      body: (
        <>
          We may collect: <strong>Personal information</strong> — name, email address, account login information. <strong>Payment information</strong> — payments are processed securely by third-party payment providers; we do not store full credit card details. <strong>Usage data</strong> — we may collect information about how users interact with our service (e.g. IP address, browser type, device information, pages visited). For instructors, we also process data related to the WhatsApp number linked to the service, messages in the inbox, and booking-related data.
        </>
      ),
    },
    {
      title: "2. How We Use Information",
      body: (
        <>
          We use collected data to: provide and operate our services; process payments and manage subscriptions; improve our product and user experience; communicate with users; prevent fraud or abuse.
        </>
      ),
    },
    {
      title: "3. Data Sharing",
      body: (
        <>
          We do not sell personal data. We may share data with trusted third-party providers that help operate our service (e.g. payment processors, cloud hosting providers, analytics tools). These providers only process data necessary to provide their services.
        </>
      ),
    },
    {
      title: "4. Data Security",
      body: (
        <>
          We take reasonable technical and organizational measures to protect personal information from unauthorized access, loss, or misuse.
        </>
      ),
    },
    {
      title: "5. Data Retention",
      body: (
        <>
          We retain personal data only as long as necessary to provide our services or comply with legal obligations.
        </>
      ),
    },
    {
      title: "6. Your Rights",
      body: (
        <>
          Depending on your location, you may have the right to: request access to your personal data; request correction or deletion of your data; withdraw consent for certain processing. Requests may be submitted via the contact email below.
        </>
      ),
    },
    {
      title: "7. Contact",
      body: (
        <>
          For privacy-related inquiries, please contact: {mailto(CONTACT_EMAIL)}.
        </>
      ),
    },
  ],
};

function getTermsSectionsEn(lang: Lang): LegalSection[] {
  const base = `/${lang}`;
  return [
    {
      title: "1. Use of the Service",
      body: (
        <>
          You must be at least 18 years old to use our services. You agree to use the service only for lawful purposes and in accordance with these Terms. You may not: use the service in a way that violates any applicable laws or regulations; attempt to gain unauthorized access to our systems or networks; interfere with or disrupt the operation of the service; use the service to distribute harmful or malicious content. We reserve the right to suspend or terminate accounts that violate these terms.
        </>
      ),
    },
    {
      title: "2. Accounts",
      body: (
        <>
          To access certain features, you may need to create an account. You agree to: provide accurate information; maintain the security of your account credentials; notify us immediately if you suspect unauthorized access. You are responsible for all activity that occurs under your account.
        </>
      ),
    },
    {
      title: "3. Subscriptions and Payments",
      body: (
        <>
          Some features of the service may require payment. Subscriptions are billed in advance on a recurring basis (e.g. monthly or annually). By purchasing a subscription, you authorize us to charge your payment method on a recurring basis until cancellation. Payments are processed through secure third-party payment providers. You may cancel your subscription at any time; cancellation will take effect at the end of the current billing period. Refunds are handled in accordance with our {docLink(`${base}/refund`, "Refund Policy")}.
        </>
      ),
    },
    {
      title: "4. Intellectual Property",
      body: (
        <>
          All content, software, and materials provided through the service are owned by or licensed to FrostDesk. You are granted a limited, non-exclusive, non-transferable license to access and use the service for its intended purposes. You may not: copy, modify, or distribute our software; reverse engineer or attempt to extract source code; use our intellectual property without permission.
        </>
      ),
    },
    {
      title: "5. User Content",
      body: (
        <>
          If you submit or upload content to the service, you retain ownership of that content. By submitting content, you grant FrostDesk a limited license to use, store, and process that content solely for the purpose of providing the service. You are responsible for ensuring that any content you submit does not violate applicable laws or third-party rights.
        </>
      ),
    },
    {
      title: "6. Service Availability",
      body: (
        <>
          We aim to provide reliable services but do not guarantee uninterrupted availability. We may modify, suspend, or discontinue parts of the service at any time.
        </>
      ),
    },
    {
      title: "7. Limitation of Liability",
      body: (
        <>
          To the maximum extent permitted by law, FrostDesk will not be liable for any indirect, incidental, or consequential damages arising from the use of the service. Our total liability for any claims relating to the service will not exceed the amount paid by you for the service during the previous 12 months.
        </>
      ),
    },
    {
      title: "8. Termination",
      body: (
        <>
          We may suspend or terminate your access to the service if you violate these Terms or use the service in a way that could harm the platform or other users. You may stop using the service at any time.
        </>
      ),
    },
    {
      title: "9. Changes to These Terms",
      body: (
        <>
          We may update these Terms from time to time. If changes are significant, we will provide notice through the website or service. Continued use of the service after changes take effect constitutes acceptance of the updated Terms.
        </>
      ),
    },
    {
      title: "10. Governing Law",
      body: (
        <>
          These Terms are governed by the laws of England and Wales. Any disputes arising from these Terms will be subject to the exclusive jurisdiction of the courts of England and Wales.
        </>
      ),
    },
    {
      title: "11. Contact",
      body: (
        <>
          If you have questions about these Terms, please contact us: {mailto(CONTACT_EMAIL)}.
        </>
      ),
    },
  ];
}

const COOKIES_EN: LegalDocument = {
  title: "Cookie Policy",
  lastUpdated: LEGAL_LAST_UPDATED,
  contactEmail: CONTACT_EMAIL,
  backToHome: "Back to home",
  sections: [
    {
      title: "1. What Are Cookies",
      body: (
        <>
          Cookies are small text files stored on your device when you visit a website. They help websites function properly and improve the user experience.
        </>
      ),
    },
    {
      title: "2. Types of Cookies We Use",
      body: (
        <>
          <strong>Essential cookies</strong> — necessary for the operation of our website and services (e.g. login authentication and security). <strong>Analytics cookies</strong> — help us understand how visitors interact with our website so we can improve our services. <strong>Functional cookies</strong> — allow the website to remember user preferences and settings.
        </>
      ),
    },
    {
      title: "3. Third-Party Cookies",
      body: (
        <>
          Some cookies may be set by third-party services we use, such as analytics providers or payment processors.
        </>
      ),
    },
    {
      title: "4. Managing Cookies",
      body: (
        <>
          Most web browsers allow you to control or disable cookies through your browser settings. Please note that disabling certain cookies may affect the functionality of our website.
        </>
      ),
    },
    {
      title: "5. Changes to This Policy",
      body: (
        <>
          We may update this Cookie Policy periodically. Updated versions will be posted on this page.
        </>
      ),
    },
    {
      title: "6. Contact",
      body: (
        <>
          If you have any questions about this Cookie Policy, please contact: {mailto(CONTACT_EMAIL)}.
        </>
      ),
    },
  ],
};

const AUP_EN: LegalDocument = {
  title: "Acceptable Use Policy",
  lastUpdated: LEGAL_LAST_UPDATED,
  contactEmail: CONTACT_EMAIL,
  backToHome: "Back to home",
  sections: [
    {
      title: "1. Prohibited Activities",
      body: (
        <>
          Users may not use the service to: violate any applicable laws or regulations; infringe the intellectual property rights of others; distribute malware, viruses, or harmful code; engage in fraudulent or deceptive activities; harass, abuse, or harm other users; attempt unauthorized access to systems or data.
        </>
      ),
    },
    {
      title: "2. Abuse and Security Violations",
      body: (
        <>
          You may not attempt to: circumvent security protections; interfere with or disrupt the operation of the service; use automated systems to abuse or overload the platform.
        </>
      ),
    },
    {
      title: "3. Content Responsibility",
      body: (
        <>
          Users are responsible for any content they upload, share, or distribute using the service. Content must not be illegal, harmful, defamatory, or infringe the rights of others.
        </>
      ),
    },
    {
      title: "4. Enforcement",
      body: (
        <>
          We reserve the right to investigate violations of this Policy. If we determine that a user has violated this Policy, we may take actions including: warning the user; suspending or terminating accounts; removing prohibited content.
        </>
      ),
    },
    {
      title: "5. Changes to This Policy",
      body: (
        <>
          We may update this Policy from time to time. Continued use of the service after updates constitutes acceptance of the revised Policy.
        </>
      ),
    },
    {
      title: "6. Contact",
      body: (
        <>
          Questions regarding this Acceptable Use Policy may be sent to: {mailto(CONTACT_EMAIL)}.
        </>
      ),
    },
  ],
};

// --- IT ---
const REFUND_IT: LegalDocument = {
  ...REFUND_EN,
  title: "Politica di rimborso",
  backToHome: "Torna alla home",
  sections: [
    { title: "1. Pagamenti abbonamento", body: <>FrostDesk fornisce servizi software in abbonamento. Con l&apos;acquisto di un abbonamento accetti i termini di fatturazione ricorrente presentati al checkout. Gli abbonamenti sono fatturati in anticipo (mensilmente o annualmente a seconda del piano).</> },
    { title: "2. Requisiti per il rimborso", body: <>Se non sei soddisfatto del servizio, puoi richiedere un rimborso entro <strong>14 giorni dall&apos;acquisto iniziale</strong>. I rimborsi possono essere concessi se: la richiesta è effettuata entro 14 giorni dal primo pagamento; l&apos;account non ha compiuto attività abusive o fraudolente; la richiesta è inviata alla nostra email di supporto. I rimborsi sono erogati a discrezione di FrostDesk. Per il deposito una tantum offerto sulla landing, si applica la stessa eligibilità di rimborso entro 14 giorni salvo diversa indicazione al checkout.</> },
    { title: "3. Cancellazione abbonamento", body: <>Puoi cancellare l&apos;abbonamento in qualsiasi momento. Dopo la cancellazione: l&apos;abbonamento resterà attivo fino alla fine del periodo di fatturazione corrente; non saranno effettuati altri addebiti; i rimborsi parziali per il tempo non utilizzato non sono normalmente previsti.</> },
    { title: "4. Elaborazione rimborsi", body: <>I rimborsi approvati saranno accreditati al metodo di pagamento originale. I tempi di elaborazione possono variare in base al provider di pagamento.</> },
    { title: "5. Contatti", body: <>Per domande su questa policy o per richiedere un rimborso, contatta: {mailto(CONTACT_EMAIL)}.</> },
  ],
};

const PRIVACY_IT: LegalDocument = {
  ...PRIVACY_EN,
  title: "Privacy Policy",
  backToHome: "Torna alla home",
  sections: [
    { title: "1. Informazioni che raccogliamo", body: <>Raccogliamo: <strong>Dati personali</strong> — nome, email, dati di accesso. <strong>Dati di pagamento</strong> — i pagamenti sono elaborati da terze parti; non memorizziamo i dettagli completi delle carte. <strong>Dati di utilizzo</strong> — come gli utenti interagiscono con il servizio (IP, browser, dispositivo, pagine visitate). Per gli istruttori, elaboriamo anche il numero WhatsApp collegato, i messaggi in inbox e i dati relativi alle prenotazioni.</> },
    { title: "2. Come usiamo le informazioni", body: <>Utilizziamo i dati per: erogare e gestire i servizi; elaborare i pagamenti e gli abbonamenti; migliorare prodotto e esperienza utente; comunicare con gli utenti; prevenire frodi o abusi.</> },
    { title: "3. Condivisione dei dati", body: <>Non vendiamo dati personali. Possiamo condividere dati con fornitori terzi fidati (pagamenti, hosting, analytics) solo per erogare i loro servizi.</> },
    { title: "4. Sicurezza dei dati", body: <>Adottiamo misure tecniche e organizzative per proteggere i dati personali da accessi non autorizzati, perdita o uso improprio.</> },
    { title: "5. Conservazione dei dati", body: <>Conserviamo i dati personali solo per il tempo necessario a erogare i servizi o adempiere obblighi di legge.</> },
    { title: "6. I tuoi diritti", body: <>A seconda della tua ubicazione, puoi avere diritto a: accesso, rettifica, cancellazione, portabilità, opposizione e reclamo all&apos;autorità di controllo. Le richieste possono essere inviate all&apos;email di contatto indicata sotto.</> },
    { title: "7. Contatti", body: <>Per richieste sulla privacy: {mailto(CONTACT_EMAIL)}.</> },
  ],
};

const COOKIES_IT: LegalDocument = {
  ...COOKIES_EN,
  title: "Cookie Policy",
  backToHome: "Torna alla home",
  sections: [
    { title: "1. Cosa sono i cookie", body: <>I cookie sono piccoli file di testo memorizzati sul dispositivo quando visiti un sito. Servono a far funzionare il sito e migliorare l&apos;esperienza utente.</> },
    { title: "2. Tipi di cookie che usiamo", body: <>Cookie <strong>essenziali</strong> — necessari per il funzionamento del sito (es. autenticazione). Cookie <strong>analytics</strong> — per capire come i visitatori usano il sito. Cookie <strong>funzionali</strong> — per ricordare preferenze e impostazioni.</> },
    { title: "3. Cookie di terze parti", body: <>Alcuni cookie possono essere impostati da servizi terzi (analytics, pagamenti).</> },
    { title: "4. Gestione dei cookie", body: <>La maggior parte dei browser permette di controllare o disabilitare i cookie. Disabilitare alcuni cookie può limitare le funzionalità del sito.</> },
    { title: "5. Modifiche a questa policy", body: <>Possiamo aggiornare questa Cookie Policy periodicamente. Le versioni aggiornate saranno pubblicate su questa pagina.</> },
    { title: "6. Contatti", body: <>Per domande su questa Cookie Policy: {mailto(CONTACT_EMAIL)}.</> },
  ],
};

const AUP_IT: LegalDocument = {
  ...AUP_EN,
  title: "Politica di utilizzo accettabile",
  backToHome: "Torna alla home",
  sections: [
    { title: "1. Attività vietate", body: <>È vietato usare il servizio per: violare leggi applicabili; violare diritti di proprietà intellettuale; distribuire malware o contenuti dannosi; frodi o inganno; molestare o danneggiare altri utenti; tentare accessi non autorizzati.</> },
    { title: "2. Abusi e violazioni di sicurezza", body: <>È vietato: eludere le misure di sicurezza; interferire o perturbare il servizio; usare sistemi automatizzati per abusare o sovraccaricare la piattaforma.</> },
    { title: "3. Responsabilità sui contenuti", body: <>Gli utenti sono responsabili dei contenuti che caricano o condividono. I contenuti non devono essere illegali, dannosi, diffamatori o lesivi di diritti di terzi.</> },
    { title: "4. Applicazione", body: <>Ci riserviamo il diritto di indagare sulle violazioni. In caso di violazione possiamo: avvisare l&apos;utente; sospendere o chiudere account; rimuovere contenuti vietati.</> },
    { title: "5. Modifiche a questa policy", body: <>Possiamo aggiornare questa policy. L&apos;uso continuato del servizio dopo gli aggiornamenti costituisce accettazione della policy aggiornata.</> },
    { title: "6. Contatti", body: <>Domande su questa policy: {mailto(CONTACT_EMAIL)}.</> },
  ],
};

// --- FR ---
const REFUND_FR: LegalDocument = {
  ...REFUND_EN,
  title: "Politique de remboursement",
  backToHome: "Retour à l'accueil",
  sections: [
    { title: "1. Paiements d'abonnement", body: <>FrostDesk fournit des services logiciels sur abonnement. En souscrivant, vous acceptez les conditions de facturation présentées au checkout. Les abonnements sont facturés à l'avance (mensuellement ou annuellement selon le plan).</> },
    { title: "2. Éligibilité au remboursement", body: <>Si vous n'êtes pas satisfait du service, vous pouvez demander un remboursement sous <strong>14 jours après l'achat initial</strong>. Les remboursements peuvent être accordés si : la demande est faite dans les 14 jours ; le compte n'a pas eu d'activité abusive ou frauduleuse ; la demande est envoyée à notre email de support. Les remboursements sont accordés à la discrétion de FrostDesk. Pour le dépôt unique proposé sur la landing, la même éligibilité de 14 jours s'applique sauf indication contraire au checkout.</> },
    { title: "3. Annulation d'abonnement", body: <>Vous pouvez annuler votre abonnement à tout moment. Après annulation : l'abonnement reste actif jusqu'à la fin de la période en cours ; aucun prélèvement supplémentaire ; les remboursements partiels pour la période non utilisée ne sont normalement pas proposés.</> },
    { title: "4. Traitement des remboursements", body: <>Les remboursements approuvés seront crédités sur le moyen de paiement d'origine. Les délais varient selon le fournisseur de paiement.</> },
    { title: "5. Contact", body: <>Pour toute question ou demande de remboursement : {mailto(CONTACT_EMAIL)}.</> },
  ],
};

const PRIVACY_FR: LegalDocument = {
  ...PRIVACY_EN,
  title: "Politique de confidentialité",
  backToHome: "Retour à l'accueil",
  sections: [
    { title: "1. Informations collectées", body: <>Nous collectons : <strong>Données personnelles</strong> — nom, email, informations de compte. <strong>Paiement</strong> — traité par des tiers ; nous ne stockons pas les données complètes de carte. <strong>Usage</strong> — interaction avec le service (IP, navigateur, appareil, pages visitées). Pour les instructeurs : numéro WhatsApp, messages inbox, données de réservation.</> },
    { title: "2. Utilisation des données", body: <>Nous utilisons les données pour : fournir et exploiter nos services ; traiter les paiements ; améliorer le produit et l'expérience ; communiquer ; prévenir la fraude.</> },
    { title: "3. Partage des données", body: <>Nous ne vendons pas les données personnelles. Nous pouvons partager avec des prestataires de confiance (paiement, hébergement, analytics) uniquement pour leurs services.</> },
    { title: "4. Sécurité", body: <>Nous prenons des mesures techniques et organisationnelles pour protéger les données personnelles.</> },
    { title: "5. Conservation", body: <>Nous conservons les données personnelles uniquement le temps nécessaire au service ou aux obligations légales.</> },
    { title: "6. Vos droits", body: <>Selon votre lieu, vous pouvez avoir le droit d'accès, rectification, effacement, portabilité, opposition et réclamation auprès de l'autorité de contrôle. Envoyez votre demande à l'email ci-dessous.</> },
    { title: "7. Contact", body: <>Pour toute question relative à la confidentialité : {mailto(CONTACT_EMAIL)}.</> },
  ],
};

const COOKIES_FR: LegalDocument = {
  ...COOKIES_EN,
  title: "Politique des cookies",
  backToHome: "Retour à l'accueil",
  sections: [
    { title: "1. Qu'est-ce qu'un cookie", body: <>Les cookies sont de petits fichiers texte stockés sur votre appareil. Ils permettent au site de fonctionner et d'améliorer l'expérience utilisateur.</> },
    { title: "2. Types de cookies", body: <>Cookies <strong>essentiels</strong> — nécessaires au fonctionnement (ex. authentification). Cookies <strong>analytics</strong> — pour comprendre l'usage du site. Cookies <strong>fonctionnels</strong> — pour mémoriser les préférences.</> },
    { title: "3. Cookies tiers", body: <>Certains cookies sont déposés par des services tiers (analytics, paiement).</> },
    { title: "4. Gestion des cookies", body: <>La plupart des navigateurs permettent de contrôler ou désactiver les cookies. La désactivation peut affecter les fonctionnalités du site.</> },
    { title: "5. Modifications", body: <>Nous pouvons mettre à jour cette politique. Les versions mises à jour seront publiées sur cette page.</> },
    { title: "6. Contact", body: <>Pour toute question : {mailto(CONTACT_EMAIL)}.</> },
  ],
};

const AUP_FR: LegalDocument = {
  ...AUP_EN,
  title: "Politique d'utilisation acceptable",
  backToHome: "Retour à l'accueil",
  sections: [
    { title: "1. Activités interdites", body: <>Il est interdit d'utiliser le service pour : violer les lois ; porter atteinte aux droits de propriété intellectuelle ; distribuer des logiciels malveillants ; fraude ; harcèlement ; accès non autorisé.</> },
    { title: "2. Abus et sécurité", body: <>Il est interdit de : contourner les protections ; perturber le service ; utiliser des systèmes automatisés pour abuser de la plateforme.</> },
    { title: "3. Responsabilité des contenus", body: <>Les utilisateurs sont responsables des contenus qu'ils publient. Les contenus ne doivent pas être illégaux, nuisibles ou porter atteinte aux droits d'autrui.</> },
    { title: "4. Application", body: <>Nous nous réservons le droit d'enquêter. En cas de violation : avertissement, suspension ou résiliation du compte, suppression de contenu.</> },
    { title: "5. Modifications", body: <>Nous pouvons mettre à jour cette politique. L'utilisation continue vaut acceptation.</> },
    { title: "6. Contact", body: <>Questions : {mailto(CONTACT_EMAIL)}.</> },
  ],
};

// --- DE ---
const REFUND_DE: LegalDocument = {
  ...REFUND_EN,
  title: "Rückerstattungsrichtlinie",
  backToHome: "Zurück zur Startseite",
  sections: [
    { title: "1. Abonnementzahlungen", body: <>FrostDesk bietet Software-Dienste im Abonnement. Mit dem Kauf akzeptierst du die wiederkehrenden Zahlungsbedingungen. Abonnements werden im Voraus abgerechnet (monatlich oder jährlich).</> },
    { title: "2. Rückerstattungsberechtigung", body: <>Wenn du nicht zufrieden bist, kannst du innerhalb von <strong>14 Tagen nach dem ersten Kauf</strong> eine Rückerstattung beantragen. Voraussetzungen: Antrag innerhalb von 14 Tagen; kein Missbrauch oder Betrug; Antrag per Support-E-Mail. Rückerstattungen erfolgen nach Ermessen von FrostDesk. Für die einmalige Anzahlung auf der Landing gilt dieselbe 14-Tage-Regel, sofern nicht anders angegeben.</> },
    { title: "3. Abo-Kündigung", body: <>Du kannst das Abonnement jederzeit kündigen. Danach: Das Abo bleibt bis zum Ende des Abrechnungszeitraums aktiv; keine weiteren Abbuchungen; Teilrückerstattungen für ungenutzte Zeit werden in der Regel nicht gewährt.</> },
    { title: "4. Abwicklung", body: <>Genehmigte Rückerstattungen werden auf die ursprüngliche Zahlungsmethode überwiesen. Die Dauer hängt vom Zahlungsanbieter ab.</> },
    { title: "5. Kontakt", body: <>Fragen oder Rückerstattungswunsch: {mailto(CONTACT_EMAIL)}.</> },
  ],
};

const PRIVACY_DE: LegalDocument = {
  ...PRIVACY_EN,
  title: "Datenschutzerklärung",
  backToHome: "Zurück zur Startseite",
  sections: [
    { title: "1. Erhobene Daten", body: <>Wir erheben: <strong>Personendaten</strong> — Name, E-Mail, Kontodaten. <strong>Zahlungsdaten</strong> — Zahlungen laufen über Drittanbieter; wir speichern keine vollständigen Kartendaten. <strong>Nutzungsdaten</strong> — Interaktion mit dem Dienst (IP, Browser, Gerät, besuchte Seiten). Bei Lehrern: WhatsApp-Nummer, Inbox-Nachrichten, Buchungsdaten.</> },
    { title: "2. Verwendung", body: <>Wir nutzen die Daten für: Bereitstellung und Betrieb; Zahlungen und Abos; Verbesserung von Produkt und Nutzererlebnis; Kommunikation; Betrugsprävention.</> },
    { title: "3. Weitergabe", body: <>Wir verkaufen keine personenbezogenen Daten. Wir können Daten an vertrauenswürdige Drittanbieter weitergeben (Zahlung, Hosting, Analytics), nur soweit für deren Dienst nötig.</> },
    { title: "4. Sicherheit", body: <>Wir setzen technische und organisatorische Maßnahmen zum Schutz personenbezogener Daten ein.</> },
    { title: "5. Aufbewahrung", body: <>Wir speichern personenbezogene Daten nur so lange wie für den Dienst oder gesetzliche Pflichten nötig.</> },
    { title: "6. Deine Rechte", body: <>Je nach Ort kannst du Anspruch auf Auskunft, Berichtigung, Löschung, Datenübertragbarkeit, Widerspruch und Beschwerde bei der Aufsichtsbehörde haben. Anfragen an die unten genannte E-Mail.</> },
    { title: "7. Kontakt", body: <>Datenschutzanfragen: {mailto(CONTACT_EMAIL)}.</> },
  ],
};

const COOKIES_DE: LegalDocument = {
  ...COOKIES_EN,
  title: "Cookie-Richtlinie",
  backToHome: "Zurück zur Startseite",
  sections: [
    { title: "1. Was sind Cookies", body: <>Cookies sind kleine Textdateien auf deinem Gerät. Sie ermöglichen die Funktion der Website und verbessern die Nutzererfahrung.</> },
    { title: "2. Arten von Cookies", body: <> <strong>Essenzielle Cookies</strong> — für den Betrieb nötig (z. B. Anmeldung). <strong>Analytics-Cookies</strong> — um die Nutzung zu verstehen. <strong>Funktionale Cookies</strong> — für Einstellungen und Präferenzen.</> },
    { title: "3. Drittanbieter-Cookies", body: <>Einige Cookies werden von Diensten Dritter gesetzt (Analytics, Zahlung).</> },
    { title: "4. Cookie-Verwaltung", body: <>Die meisten Browser erlauben, Cookies zu kontrollieren oder zu deaktivieren. Das Deaktivieren kann die Funktionalität einschränken.</> },
    { title: "5. Änderungen", body: <>Wir können diese Cookie-Richtlinie aktualisieren. Aktualisierte Fassungen werden auf dieser Seite veröffentlicht.</> },
    { title: "6. Kontakt", body: <>Fragen zur Cookie-Richtlinie: {mailto(CONTACT_EMAIL)}.</> },
  ],
};

const AUP_DE: LegalDocument = {
  ...AUP_EN,
  title: "Richtlinie zur akzeptablen Nutzung",
  backToHome: "Zurück zur Startseite",
  sections: [
    { title: "1. Verbotene Aktivitäten", body: <>Die Nutzung des Dienstes ist untersagt zur: Verletzung geltender Gesetze; Verletzung geistiger Eigentumsrechte; Verbreitung von Schadsoftware; Betrug; Belästigung; unbefugter Zugriff.</> },
    { title: "2. Missbrauch und Sicherheit", body: <>Untersagt ist: Umgehung von Sicherheitsmaßnahmen; Störung des Dienstes; automatisierte Systeme zum Missbrauch oder zur Überlastung der Plattform.</> },
    { title: "3. Verantwortung für Inhalte", body: <>Nutzer sind für von ihnen hochgeladene oder geteilte Inhalte verantwortlich. Inhalte dürfen nicht illegal, schädlich, verleumderisch oder rechtsverletzend sein.</> },
    { title: "4. Durchsetzung", body: <>Wir behalten uns vor, Verstöße zu prüfen. Bei Verstößen: Verwarnung, Kontoaussetzung oder -kündigung, Entfernung von Inhalten.</> },
    { title: "5. Änderungen", body: <>Wir können diese Richtlinie aktualisieren. Fortgesetzte Nutzung gilt als Akzeptanz.</> },
    { title: "6. Kontakt", body: <>Fragen: {mailto(CONTACT_EMAIL)}.</> },
  ],
};

// Terms (EN) built with link
function getTermsEn(lang: Lang): LegalDocument {
  return {
    title: "Terms of Service",
    lastUpdated: LEGAL_LAST_UPDATED,
    contactEmail: CONTACT_EMAIL,
    backToHome: "Back to home",
    sections: getTermsSectionsEn(lang),
  };
}

function getTermsIt(lang: Lang): LegalDocument {
  return {
    title: "Termini di servizio",
    lastUpdated: LEGAL_LAST_UPDATED,
    contactEmail: CONTACT_EMAIL,
    backToHome: "Torna alla home",
    sections: [
      { title: "1. Uso del servizio", body: <>Devi avere almeno 18 anni. Accetti di usare il servizio solo per scopi leciti. È vietato: violare leggi; accedere senza autorizzazione; interferire con il servizio; distribuire contenuti dannosi. Ci riserviamo il diritto di sospendere o chiudere account in violazione.</> },
      { title: "2. Account", body: <>Per alcune funzioni serve un account. Accetti di: fornire informazioni accurate; mantenere sicure le credenziali; avvisarci in caso di accesso non autorizzato. Sei responsabile di tutta l'attività sotto il tuo account.</> },
      { title: "3. Abbonamenti e pagamenti", body: <>Alcune funzioni richiedono pagamento. Gli abbonamenti sono fatturati in anticipo. Autorizzi l'addebito ricorrente fino a cancellazione. Puoi cancellare in qualsiasi momento; la cancellazione ha effetto alla fine del periodo. I rimborsi sono regolati dalla nostra {docLink(`/${lang}/refund`, "Politica di rimborso")}.</> },
    { title: "4. Proprietà intellettuale", body: <>Contenuti, software e materiali sono di FrostDesk o licenziati. Hai una licenza limitata, non esclusiva e non trasferibile. È vietato copiare, modificare, distribuire il software, fare reverse engineering o usare la proprietà intellettuale senza permesso.</> },
    { title: "5. Contenuti utente", body: <>Conservi la proprietà dei contenuti che invii. Con l'invio concedi a FrostDesk una licenza limitata per usarli, conservarli e trattarli per erogare il servizio. Sei responsabile della conformità alle leggi e ai diritti di terzi.</> },
    { title: "6. Disponibilità del servizio", body: <>Ci impegniamo per un servizio affidabile ma non garantiamo disponibilità ininterrotta. Possiamo modificare, sospendere o interrompere parti del servizio.</> },
    { title: "7. Limitazione di responsabilità", body: <>Nei limiti di legge, FrostDesk non è responsabile per danni indiretti, incidentali o consequenziali. La nostra responsabilità totale non supera l'importo pagato da te per il servizio negli ultimi 12 mesi.</> },
    { title: "8. Risoluzione", body: <>Possiamo sospendere o terminare l'accesso in caso di violazione dei Termini o uso dannoso. Puoi smettere di usare il servizio in qualsiasi momento.</> },
    { title: "9. Modifiche ai Termini", body: <>Possiamo aggiornare i Termini. In caso di modifiche significative forniremo avviso tramite il sito o il servizio. L'uso continuato dopo le modifiche costituisce accettazione.</> },
    { title: "10. Legge applicabile", body: <>I Termini sono regolati dalla legge di Inghilterra e Galles. Le controversie sono di competenza esclusiva dei tribunali di Inghilterra e Galles.</> },
    { title: "11. Contatti", body: <>Per domande sui Termini: {mailto(CONTACT_EMAIL)}.</> },
    ],
  };
}

function getTermsFr(lang: Lang): LegalDocument {
  return {
    title: "Conditions d'utilisation",
    lastUpdated: LEGAL_LAST_UPDATED,
    contactEmail: CONTACT_EMAIL,
    backToHome: "Retour à l'accueil",
    sections: [
      { title: "1. Utilisation du service", body: <>Vous devez avoir au moins 18 ans. Vous acceptez d'utiliser le service à des fins licites uniquement. Interdictions : violer les lois ; accès non autorisé ; perturber le service ; distribuer des contenus nuisibles. Nous pouvons suspendre ou résilier les comptes en violation.</> },
      { title: "2. Comptes", body: <>Un compte peut être requis. Vous acceptez de : fournir des informations exactes ; sécuriser vos identifiants ; nous notifier en cas d'accès non autorisé. Vous êtes responsable de toute activité sous votre compte.</> },
      { title: "3. Abonnements et paiements", body: <>Certaines fonctionnalités sont payantes. Les abonnements sont facturés à l'avance. Vous nous autorisez à débiter votre moyen de paiement jusqu'à annulation. Vous pouvez annuler à tout moment ; l'annulation prend effet en fin de période. Les remboursements sont régis par notre {docLink(`/${lang}/refund`, "Politique de remboursement")}.</> },
    { title: "4. Propriété intellectuelle", body: <>Contenus et logiciels sont la propriété de FrostDesk ou sous licence. Licence limitée, non exclusive, non transférable. Interdiction de copier, modifier, distribuer, faire de l'ingénierie inverse ou utiliser sans autorisation.</> },
    { title: "5. Contenu utilisateur", body: <>Vous conservez la propriété du contenu que vous soumettez. En soumettant, vous accordez à FrostDesk une licence limitée pour l'utilisation, le stockage et le traitement afin de fournir le service. Vous êtes responsable du respect des lois et des droits des tiers.</> },
    { title: "6. Disponibilité", body: <>Nous visons une disponibilité fiable mais ne garantissons pas un service ininterrompu. Nous pouvons modifier, suspendre ou interrompre des parties du service.</> },
    { title: "7. Limitation de responsabilité", body: <>Dans la mesure permise par la loi, FrostDesk n'est pas responsable des dommages indirects ou consécutifs. Notre responsabilité totale ne dépasse pas le montant payé par vous au cours des 12 derniers mois.</> },
    { title: "8. Résiliation", body: <>Nous pouvons suspendre ou résilier l'accès en cas de violation. Vous pouvez cesser d'utiliser le service à tout moment.</> },
    { title: "9. Modifications", body: <>Nous pouvons modifier ces Conditions. En cas de changement important, nous informerons via le site ou le service. L'utilisation continue vaut acceptation.</> },
    { title: "10. Droit applicable", body: <>Ces Conditions sont régies par le droit d'Angleterre et du pays de Galles. Les litiges relèvent de la compétence exclusive des tribunaux d'Angleterre et du pays de Galles.</> },
    { title: "11. Contact", body: <>Questions sur les Conditions : {mailto(CONTACT_EMAIL)}.</> },
    ],
  };
}

function getTermsDe(lang: Lang): LegalDocument {
  return {
    title: "Nutzungsbedingungen",
    lastUpdated: LEGAL_LAST_UPDATED,
    contactEmail: CONTACT_EMAIL,
    backToHome: "Zurück zur Startseite",
    sections: [
      { title: "1. Nutzung des Dienstes", body: <>Du musst mindestens 18 Jahre alt sein. Du nutzt den Dienst nur für rechtmäßige Zwecke. Verboten: Gesetzesverstöße; unbefugter Zugriff; Störung des Dienstes; Verbreitung schädlicher Inhalte. Wir behalten uns vor, Konten bei Verstößen zu sperren oder zu kündigen.</> },
      { title: "2. Konten", body: <>Für bestimmte Funktionen ist ein Konto nötig. Du verpflichtest dich zu korrekten Angaben, sicheren Zugangsdaten und sofortiger Meldung bei unbefugtem Zugriff. Du bist für alle Aktivitäten unter deinem Konto verantwortlich.</> },
      { title: "3. Abonnements und Zahlungen", body: <>Einige Funktionen sind kostenpflichtig. Abos werden im Voraus abgerechnet. Du autorisierst uns zur wiederkehrenden Belastung bis zur Kündigung. Kündigung jederzeit möglich; sie wird zum Ende des Abrechnungszeitraums wirksam. Rückerstattungen regelt unsere {docLink(`/${lang}/refund`, "Rückerstattungsrichtlinie")}.</> },
    { title: "4. Geistiges Eigentum", body: <>Alle Inhalte und die Software gehören FrostDesk oder sind lizenziert. Du erhältst eine beschränkte, nicht ausschließliche, nicht übertragbare Lizenz. Du darfst die Software nicht kopieren, ändern, verbreiten, reverse engineer betreiben oder ohne Erlaubnis nutzen.</> },
    { title: "5. Nutzerinhalte", body: <>Du behältst das Eigentum an eingereichten Inhalten. Mit der Einreichung räumst du FrostDesk eine beschränkte Lizenz zur Nutzung, Speicherung und Verarbeitung ein. Du bist verantwortlich für die Rechtmäßigkeit und die Rechte Dritter.</> },
    { title: "6. Verfügbarkeit", body: <>Wir streben Zuverlässigkeit an, garantieren aber keine unterbrechungsfreie Verfügbarkeit. Wir können Teile des Dienstes ändern, aussetzen oder einstellen.</> },
    { title: "7. Haftungsbeschränkung", body: <>FrostDesk haftet nicht für indirekte oder Folgeschäden, soweit gesetzlich zulässig. Die Gesamthaftung übersteigt nicht den Betrag, den du in den letzten 12 Monaten für den Dienst gezahlt hast.</> },
    { title: "8. Beendigung", body: <>Wir können den Zugang bei Verstößen sperren oder beenden. Du kannst die Nutzung jederzeit einstellen.</> },
    { title: "9. Änderungen", body: <>Wir können diese Bedingungen aktualisieren. Bei wesentlichen Änderungen informieren wir über die Website oder den Dienst. Fortgesetzte Nutzung gilt als Akzeptanz.</> },
    { title: "10. Anwendbares Recht", body: <>Es gilt das Recht von England und Wales. Streitigkeiten unterliegen der ausschließlichen Zuständigkeit der Gerichte von England und Wales.</> },
    { title: "11. Kontakt", body: <>Fragen zu den Nutzungsbedingungen: {mailto(CONTACT_EMAIL)}.</> },
    ],
  };
}

// Getters
const REFUND: Record<Lang, LegalDocument> = { en: REFUND_EN, it: REFUND_IT, fr: REFUND_FR, de: REFUND_DE };
const PRIVACY: Record<Lang, LegalDocument> = { en: PRIVACY_EN, it: PRIVACY_IT, fr: PRIVACY_FR, de: PRIVACY_DE };
const COOKIES: Record<Lang, LegalDocument> = { en: COOKIES_EN, it: COOKIES_IT, fr: COOKIES_FR, de: COOKIES_DE };
const AUP: Record<Lang, LegalDocument> = { en: AUP_EN, it: AUP_IT, fr: AUP_FR, de: AUP_DE };

export function getRefundContent(lang: Lang): LegalDocument {
  return REFUND[lang];
}
export function getPrivacyContent(lang: Lang): LegalDocument {
  return PRIVACY[lang];
}
export function getTermsContent(lang: Lang): LegalDocument {
  return lang === "en" ? getTermsEn(lang) : lang === "it" ? getTermsIt(lang) : lang === "fr" ? getTermsFr(lang) : getTermsDe(lang);
}
export function getCookiesContent(lang: Lang): LegalDocument {
  return COOKIES[lang];
}
export function getAcceptableUseContent(lang: Lang): LegalDocument {
  return AUP[lang];
}

// Footer link labels
const FOOTER_LINKS: Record<Lang, { refund: string; privacy: string; terms: string; cookies: string; acceptableUse: string }> = {
  en: { refund: "Refund Policy", privacy: "Privacy Policy", terms: "Terms of Service", cookies: "Cookie Policy", acceptableUse: "Acceptable Use Policy" },
  it: { refund: "Politica di rimborso", privacy: "Privacy Policy", terms: "Termini di servizio", cookies: "Cookie Policy", acceptableUse: "Politica di utilizzo accettabile" },
  fr: { refund: "Politique de remboursement", privacy: "Politique de confidentialité", terms: "Conditions d'utilisation", cookies: "Politique des cookies", acceptableUse: "Politique d'utilisation acceptable" },
  de: { refund: "Rückerstattungsrichtlinie", privacy: "Datenschutz", terms: "Nutzungsbedingungen", cookies: "Cookie-Richtlinie", acceptableUse: "Richtlinie zur akzeptablen Nutzung" },
};

export function getLegalFooterLinks(lang: Lang) {
  return FOOTER_LINKS[lang];
}
