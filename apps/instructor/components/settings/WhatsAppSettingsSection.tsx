'use client';

import { useState, useEffect } from 'react';
import { getWhatsappAccount, connectWhatsapp, type WhatsappAccount } from '@/lib/instructorApi';

const COPY = {
  it: {
    title: 'WhatsApp',
    guideTitle: 'Come collegare o cambiare il numero',
    guideSteps: [
      'Inserisci il numero con prefisso internazionale (es. +39 333 1234567).',
      'Clicca "Collega WhatsApp". Il numero verrà associato al tuo account.',
      'I messaggi che i clienti inviano a questo numero arriveranno nella tua Inbox. Puoi cambiare numero in qualsiasi momento da qui.',
    ],
    loading: 'Caricamento…',
    connectedNumber: 'Numero',
    inboxInfo: 'I messaggi dei clienti su questo numero arrivano nella tua Inbox.',
    pending: 'Collegamento in attesa di verifica.',
    changeNumber: 'Cambia numero',
    connectHint: "Inserisci il numero (con prefisso internazionale) per ricevere i messaggi nell'Inbox.",
    connectPlaceholder: '+39 333 1234567',
    connectButton: 'Collega WhatsApp',
    connecting: 'Collegamento…',
    cancel: 'Annulla',
    errorRequired: 'Inserisci un numero con prefisso internazionale (es. +39...).',
    errorInvalid: 'Numero non valido. Usa il formato internazionale (es. +39 333 1234567).',
    errorGeneric: 'Errore di connessione. Riprova.',
  },
  en: {
    title: 'WhatsApp',
    guideTitle: 'How to connect or change your number',
    guideSteps: [
      'Enter the number with country code (e.g. +39 333 1234567).',
      'Click "Connect WhatsApp". The number will be linked to your account.',
      'Messages that customers send to this number will appear in your Inbox. You can change the number anytime from here.',
    ],
    loading: 'Loading…',
    connectedNumber: 'Number',
    inboxInfo: 'Messages sent to this number by customers appear in your Inbox.',
    pending: 'Link pending verification.',
    changeNumber: 'Change number',
    connectHint: 'Enter the number (with country code) to receive messages in your Inbox.',
    connectPlaceholder: '+39 333 1234567',
    connectButton: 'Connect WhatsApp',
    connecting: 'Connecting…',
    cancel: 'Cancel',
    errorRequired: 'Enter a number with country code (e.g. +39...).',
    errorInvalid: 'Invalid number. Use international format (e.g. +39 333 1234567).',
    errorGeneric: 'Connection error. Please try again.',
  },
} as const;

function isValidE164(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.startsWith('+')) return false;
  const digits = trimmed.slice(1).replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

const sectionStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: '0.5rem',
  padding: '1.5rem',
  backgroundColor: '#ffffff',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  marginBottom: '1.5rem',
} as const;

const titleStyle = { fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.75rem' } as const;
const textStyle = { color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem', lineHeight: 1.5 } as const;
const listStyle = { ...textStyle, marginLeft: '1.25rem', paddingLeft: '0.25rem' } as const;

export default function WhatsAppSettingsSection({ locale = 'it' }: { locale?: 'it' | 'en' }) {
  const copy = COPY[locale];
  const [account, setAccount] = useState<WhatsappAccount | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [showChangeForm, setShowChangeForm] = useState(false);

  const loadAccount = () => {
    setLoading(true);
    getWhatsappAccount()
      .then((a) => {
        setAccount(a);
        setShowChangeForm(false);
      })
      .catch(() => setAccount(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAccount();
  }, []);

  async function handleConnect() {
    const phone = phoneInput.trim();
    if (!phone) {
      setError(copy.errorRequired);
      return;
    }
    if (!isValidE164(phone)) {
      setError(copy.errorInvalid);
      return;
    }
    setError(null);
    setActing(true);
    try {
      await connectWhatsapp(phone);
      setPhoneInput('');
      setShowChangeForm(false);
      await loadAccount();
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.errorGeneric);
    } finally {
      setActing(false);
    }
  }

  return (
    <section style={sectionStyle} aria-labelledby="whatsapp-settings-title">
      <h2 id="whatsapp-settings-title" style={titleStyle}>
        {copy.title}
      </h2>

      <div style={{ marginBottom: '1rem' }}>
        <p style={{ ...textStyle, fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
          {copy.guideTitle}
        </p>
        <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
          {copy.guideSteps.map((step, i) => (
            <li key={i} style={listStyle}>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {loading ? (
        <p style={textStyle}>{copy.loading}</p>
      ) : account && !showChangeForm ? (
        <div>
          <p style={{ ...textStyle, marginBottom: '0.25rem' }}>
            <strong style={{ color: '#111827' }}>{copy.connectedNumber}:</strong>{' '}
            <span style={{ color: '#374151' }}>{account.phone_number}</span>
          </p>
          <p style={textStyle}>{copy.inboxInfo}</p>
          {account.status === 'pending' && (
            <p style={{ ...textStyle, color: '#b45309', marginBottom: '0.75rem' }}>{copy.pending}</p>
          )}
          <button
            type="button"
            onClick={() => setShowChangeForm(true)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#3b82f6',
              background: 'none',
              border: '1px solid #93c5fd',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}
          >
            {copy.changeNumber}
          </button>
        </div>
      ) : (
        <div>
          <p style={{ ...textStyle, marginBottom: '0.75rem' }}>{copy.connectHint}</p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              alignItems: 'flex-start',
              marginBottom: '0.5rem',
            }}
          >
            <input
              type="tel"
              placeholder={copy.connectPlaceholder}
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                color: '#111827',
                minWidth: '12rem',
              }}
              aria-label={locale === 'it' ? 'Numero WhatsApp' : 'WhatsApp number'}
            />
            <button
              type="button"
              onClick={() => void handleConnect()}
              disabled={acting}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                backgroundColor: '#22c55e',
                color: '#fff',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: acting ? 'not-allowed' : 'pointer',
                opacity: acting ? 0.7 : 1,
              }}
            >
              {acting ? copy.connecting : copy.connectButton}
            </button>
            {account && (
              <button
                type="button"
                onClick={() => {
                  setShowChangeForm(false);
                  setError(null);
                  setPhoneInput('');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#6b7280',
                  background: 'none',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                }}
              >
                {copy.cancel}
              </button>
            )}
          </div>
          {error && (
            <p style={{ fontSize: '0.8125rem', color: '#dc2626', marginTop: '0.25rem', marginBottom: 0 }}>
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
