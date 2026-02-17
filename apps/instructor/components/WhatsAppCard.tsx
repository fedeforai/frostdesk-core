'use client';

import { useState, useEffect } from 'react';
import { getWhatsappAccount, connectWhatsapp, type WhatsappAccount } from '@/lib/instructorApi';

const COPY = {
  it: {
    loading: 'Caricamento…',
    connectedTitle: 'Il tuo numero WhatsApp è collegato a FrostDesk',
    inboxLine: 'I messaggi dei clienti che scrivono a questo numero arrivano nella tua Inbox.',
    signupLine: 'È il numero che hai indicato in fase di registrazione.',
    pending: 'Collegamento in attesa di verifica.',
    connectTitle: 'Collega il tuo numero WhatsApp',
    connectHint: "Inserisci il numero (con prefisso internazionale) per ricevere i messaggi dei clienti nell'Inbox.",
    connectPlaceholder: '+39 333 1234567',
    connectButton: 'Collega WhatsApp',
    connecting: 'Collegamento…',
    errorRequired: 'Inserisci un numero con prefisso internazionale (es. +39...)',
    errorInvalid: 'Numero non valido. Usa il formato internazionale (es. +39 333 1234567).',
    errorGeneric: 'Errore di connessione',
  },
  en: {
    loading: 'Loading…',
    connectedTitle: 'Your WhatsApp number is linked to FrostDesk',
    inboxLine: 'Messages that customers send to this number appear in your Inbox.',
    signupLine: 'This is the number you provided during sign-up.',
    pending: 'Link pending verification.',
    connectTitle: 'Connect your WhatsApp number',
    connectHint: 'Enter the number (with country code) to receive customer messages in your Inbox.',
    connectPlaceholder: '+39 333 1234567',
    connectButton: 'Connect WhatsApp',
    connecting: 'Connecting…',
    errorRequired: 'Enter a number with country code (e.g. +39...)',
    errorInvalid: 'Invalid number. Use international format (e.g. +39 333 1234567).',
    errorGeneric: 'Connection error',
  },
} as const;

function isValidE164(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.startsWith('+')) return false;
  const digits = trimmed.slice(1).replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function WhatsAppCard({ locale = 'en' }: { locale?: 'it' | 'en' }) {
  const copy = COPY[locale];
  const [account, setAccount] = useState<WhatsappAccount | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState('');

  useEffect(() => {
    getWhatsappAccount()
      .then(setAccount)
      .catch(() => setAccount(null))
      .finally(() => setLoading(false));
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
      const result = await connectWhatsapp(phone);
      setAccount(result);
      setPhoneInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.errorGeneric);
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '1.25rem', color: 'rgba(148, 163, 184, 0.9)', fontSize: '0.875rem' }}>
        {copy.loading}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '1.25rem',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        borderRadius: '0.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
      }}
    >
      {account ? (
        <>
          <p
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'rgba(226, 232, 240, 0.95)',
              marginBottom: '0.5rem',
            }}
          >
            {copy.connectedTitle}
          </p>
          <p style={{ fontSize: '0.9375rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '0.25rem' }}>
            <strong style={{ color: 'rgba(226, 232, 240, 0.9)' }}>{account.phone_number}</strong>
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(148, 163, 184, 0.75)', marginBottom: '0.25rem' }}>
            {copy.inboxLine}
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(148, 163, 184, 0.75)', margin: 0 }}>
            {copy.signupLine}
          </p>
          {account.status === 'pending' && (
            <p
              style={{
                fontSize: '0.8125rem',
                color: '#f59e0b',
                marginTop: '0.75rem',
                marginBottom: 0,
              }}
            >
              {copy.pending}
            </p>
          )}
        </>
      ) : (
        <>
          <p
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'rgba(226, 232, 240, 0.95)',
              marginBottom: '0.5rem',
            }}
          >
            {copy.connectTitle}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '1rem' }}>
            {copy.connectHint}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-start' }}>
            <input
              type="tel"
              placeholder={copy.connectPlaceholder}
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid rgba(148, 163, 184, 0.35)',
                borderRadius: '0.375rem',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                color: 'rgba(226, 232, 240, 0.95)',
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
          </div>
          {error && (
            <p style={{ fontSize: '0.8125rem', color: '#fca5a5', marginTop: '0.5rem', marginBottom: 0 }}>
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
