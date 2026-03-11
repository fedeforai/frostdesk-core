'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  postInstructorFeedback,
  getInstructorFeedback,
  type InstructorFeedbackItem,
} from '@/lib/instructorApi';

export type FeedbackLocale = 'en' | 'it' | 'fr' | 'de';

const FEEDBACK_COPY: Record<
  FeedbackLocale,
  {
    title: string;
    placeholder: string;
    send: string;
    sending: string;
    success: string;
    errorGeneric: string;
    yourMessages: string;
    emptyMessages: string;
    dateLabel: string;
  }
> = {
  en: {
    title: 'Notes for the team',
    placeholder: 'Write a message, request, or bug report…',
    send: 'Send',
    sending: 'Sending…',
    success: 'Message sent.',
    errorGeneric: 'Could not send. Please try again.',
    yourMessages: 'Your recent messages',
    emptyMessages: 'No messages yet.',
    dateLabel: 'Date',
  },
  it: {
    title: 'Note per il team',
    placeholder: 'Scrivi un messaggio, una richiesta o un bug…',
    send: 'Invia',
    sending: 'Invio…',
    success: 'Messaggio inviato.',
    errorGeneric: 'Impossibile inviare. Riprova.',
    yourMessages: 'I tuoi ultimi messaggi',
    emptyMessages: 'Nessun messaggio ancora.',
    dateLabel: 'Data',
  },
  fr: {
    title: 'Notes pour l\'équipe',
    placeholder: 'Écrivez un message, une demande ou un bug…',
    send: 'Envoyer',
    sending: 'Envoi…',
    success: 'Message envoyé.',
    errorGeneric: 'Impossible d\'envoyer. Réessayez.',
    yourMessages: 'Vos derniers messages',
    emptyMessages: 'Aucun message pour l\'instant.',
    dateLabel: 'Date',
  },
  de: {
    title: 'Notizen für das Team',
    placeholder: 'Nachricht, Anfrage oder Bug melden…',
    send: 'Senden',
    sending: 'Wird gesendet…',
    success: 'Nachricht gesendet.',
    errorGeneric: 'Senden fehlgeschlagen. Bitte erneut versuchen.',
    yourMessages: 'Ihre letzten Nachrichten',
    emptyMessages: 'Noch keine Nachrichten.',
    dateLabel: 'Datum',
  },
};

function formatDate(iso: string, locale: FeedbackLocale): string {
  try {
    const lang = locale === 'en' ? 'en-GB' : locale === 'it' ? 'it-IT' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    return new Date(iso).toLocaleString(lang, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

interface ProfileFeedbackSectionProps {
  locale?: FeedbackLocale;
}

export default function ProfileFeedbackSection({ locale = 'en' }: ProfileFeedbackSectionProps) {
  const copy = FEEDBACK_COPY[locale] ?? FEEDBACK_COPY.en;
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [items, setItems] = useState<InstructorFeedbackItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const loadFeedback = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await getInstructorFeedback();
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setBanner(null);
    try {
      await postInstructorFeedback(trimmed);
      setMessage('');
      setBanner({ type: 'success', text: copy.success });
      await loadFeedback();
    } catch {
      setBanner({ type: 'error', text: copy.errorGeneric });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        marginTop: '1.5rem',
      }}
    >
      <h2
        style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: 'rgba(226, 232, 240, 0.95)',
          marginBottom: '1rem',
        }}
      >
        {copy.title}
      </h2>

      <form onSubmit={handleSubmit}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={copy.placeholder}
          rows={3}
          disabled={sending}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '0.375rem',
            fontSize: '0.9375rem',
            color: 'rgba(226, 232, 240, 0.95)',
            background: 'rgba(15, 23, 42, 0.6)',
            resize: 'vertical',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={sending || !message.trim()}
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: sending ? 'rgba(255, 255, 255, 0.05)' : 'rgba(59, 130, 246, 0.2)',
            color: 'rgba(226, 232, 240, 0.95)',
            fontWeight: 600,
            cursor: sending ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
          }}
        >
          {sending ? copy.sending : copy.send}
        </button>
      </form>

      {banner && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            backgroundColor:
              banner.type === 'success'
                ? 'rgba(34, 197, 94, 0.15)'
                : 'rgba(239, 68, 68, 0.1)',
            border:
              banner.type === 'success'
                ? '1px solid rgba(34, 197, 94, 0.3)'
                : '1px solid rgba(239, 68, 68, 0.25)',
            color: banner.type === 'success' ? 'rgba(134, 239, 172, 0.95)' : 'rgba(252, 165, 165, 0.95)',
          }}
        >
          {banner.text}
        </div>
      )}

      <div style={{ marginTop: '1.25rem' }}>
        <h3
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'rgba(148, 163, 184, 0.95)',
            marginBottom: '0.5rem',
          }}
        >
          {copy.yourMessages}
        </h3>
        {loadingList ? (
          <p style={{ fontSize: '0.8125rem', color: 'rgba(148, 163, 184, 0.8)' }}>Loading…</p>
        ) : items.length === 0 ? (
          <p style={{ fontSize: '0.8125rem', color: 'rgba(148, 163, 184, 0.8)' }}>{copy.emptyMessages}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {items.map((item) => (
              <li
                key={item.id}
                style={{
                  padding: '0.5rem 0',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: '0.8125rem',
                }}
              >
                <span style={{ color: 'rgba(148, 163, 184, 0.9)' }}>
                  {copy.dateLabel}: {formatDate(item.created_at, locale)}
                </span>
                <div style={{ color: 'rgba(226, 232, 240, 0.9)', marginTop: '0.25rem' }}>{item.body}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
