'use client';

import { useState } from 'react';
import Link from 'next/link';

const CONTENT = {
  it: {
    title: 'Privacy Policy',
    intro: 'In questa pagina spieghiamo in linguaggio semplice come FrostDesk tratta i tuoi dati.',
    whatWeCollect: 'Cosa raccogliamo',
    whatWeCollectBody:
      'Raccogliamo: il numero WhatsApp che colleghi al servizio; i messaggi che i clienti inviano a quel numero (e le risposte che invii dalla Inbox); nome, email e dati del profilo (resort, lingua, bio); dati relativi a prenotazioni e servizi che offri.',
    howWeUse: 'Come li usiamo',
    howWeUseBody:
      'Usiamo questi dati per gestire le prenotazioni, mostrarti le conversazioni nella Inbox, migliorare il servizio e rispettare obblighi di legge. Non vendiamo i tuoi dati a terzi per marketing.',
    whatsappSpecific: 'WhatsApp',
    whatsappSpecificBody:
      'FrostDesk riceve solo i messaggi che i clienti inviano al numero WhatsApp che hai collegato al servizio. Tali messaggi vengono mostrati nella tua Inbox. Non accediamo al resto del tuo telefono né ad altri numeri o chat personali.',
    legalBasis: 'Base giuridica',
    legalBasisBody:
      'Il trattamento è fondato su esecuzione del contratto (erogazione del servizio), su legittimo interesse (miglioramento del servizio e sicurezza) e, ove richiesto, sul tuo consenso.',
    retention: 'Conservazione',
    retentionBody:
      'Conserviamo i dati per il tempo necessario a erogare il servizio e per gli obblighi di legge. Puoi chiedere la cancellazione del tuo account e dei dati associati.',
    yourRights: 'I tuoi diritti',
    yourRightsBody:
      'Hai diritto ad accesso, rettifica, cancellazione, portabilità dei dati, opposizione e reclamo all’autorità di controllo. Per esercitarli contatta il titolare del trattamento.',
    controller: 'Titolare del trattamento',
    controllerBody: 'FrostDesk. Per domande sulla privacy puoi contattarci tramite l’app o l’email indicata nel servizio.',
    backToApp: 'Torna all’app',
  },
  en: {
    title: 'Privacy Policy',
    intro: 'This page explains in plain language how FrostDesk handles your data.',
    whatWeCollect: 'What we collect',
    whatWeCollectBody:
      'We collect: the WhatsApp number you link to the service; messages that customers send to that number (and replies you send from the Inbox); your name, email and profile data (resort, language, bio); data related to bookings and the services you offer.',
    howWeUse: 'How we use it',
    howWeUseBody:
      'We use this data to manage bookings, show you conversations in the Inbox, improve the service and comply with legal obligations. We do not sell your data to third parties for marketing.',
    whatsappSpecific: 'WhatsApp',
    whatsappSpecificBody:
      'FrostDesk only receives messages that customers send to the WhatsApp number you have linked to the service. Those messages are shown in your Inbox. We do not access the rest of your phone or other numbers or personal chats.',
    legalBasis: 'Legal basis',
    legalBasisBody:
      'Processing is based on contract performance (delivering the service), legitimate interest (service improvement and security) and, where required, your consent.',
    retention: 'Retention',
    retentionBody:
      'We keep data for as long as needed to provide the service and to meet legal obligations. You can request deletion of your account and associated data.',
    yourRights: 'Your rights',
    yourRightsBody:
      'You have the right to access, rectification, erasure, data portability, objection and to lodge a complaint with a supervisory authority. To exercise them, contact the data controller.',
    controller: 'Data controller',
    controllerBody: 'FrostDesk. For privacy-related questions you can contact us via the app or the email indicated in the service.',
    backToApp: 'Back to app',
  },
} as const;

export default function PrivacyPage() {
  const [lang, setLang] = useState<'it' | 'en'>('en');
  const c = CONTENT[lang];

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '1.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'rgba(226, 232, 240, 0.95)', margin: 0 }}>
          {c.title}
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setLang('en')}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.8125rem',
              fontWeight: lang === 'en' ? 600 : 500,
              border: '1px solid rgba(148, 163, 184, 0.35)',
              borderRadius: '0.375rem',
              background: lang === 'en' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: 'rgba(226, 232, 240, 0.95)',
              cursor: 'pointer',
            }}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLang('it')}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.8125rem',
              fontWeight: lang === 'it' ? 600 : 500,
              border: '1px solid rgba(148, 163, 184, 0.35)',
              borderRadius: '0.375rem',
              background: lang === 'it' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: 'rgba(226, 232, 240, 0.95)',
              cursor: 'pointer',
            }}
          >
            IT
          </button>
        </div>
      </div>

      <p style={{ fontSize: '0.9375rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
        {c.intro}
      </p>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.5rem' }}>
          {c.whatWeCollect}
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'rgba(148, 163, 184, 0.9)', margin: 0, lineHeight: 1.55 }}>
          {c.whatWeCollectBody}
        </p>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.5rem' }}>
          {c.howWeUse}
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'rgba(148, 163, 184, 0.9)', margin: 0, lineHeight: 1.55 }}>
          {c.howWeUseBody}
        </p>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.5rem' }}>
          {c.whatsappSpecific}
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'rgba(148, 163, 184, 0.9)', margin: 0, lineHeight: 1.55 }}>
          {c.whatsappSpecificBody}
        </p>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.5rem' }}>
          {c.legalBasis}
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'rgba(148, 163, 184, 0.9)', margin: 0, lineHeight: 1.55 }}>
          {c.legalBasisBody}
        </p>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.5rem' }}>
          {c.retention}
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'rgba(148, 163, 184, 0.9)', margin: 0, lineHeight: 1.55 }}>
          {c.retentionBody}
        </p>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.5rem' }}>
          {c.yourRights}
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'rgba(148, 163, 184, 0.9)', margin: 0, lineHeight: 1.55 }}>
          {c.yourRightsBody}
        </p>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.5rem' }}>
          {c.controller}
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'rgba(148, 163, 184, 0.9)', margin: 0, lineHeight: 1.55 }}>
          {c.controllerBody}
        </p>
      </section>

      <p style={{ marginTop: '2rem' }}>
        <Link
          href="/instructor/dashboard"
          style={{
            color: '#93c5fd',
            textDecoration: 'underline',
            fontSize: '0.9375rem',
          }}
        >
          {c.backToApp}
        </Link>
      </p>
    </div>
  );
}
