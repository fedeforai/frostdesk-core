'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  fetchAdminInstructor,
  fetchInstructorFeedback,
  updateInstructorFeedback,
  type AdminInstructorDetail,
  type InstructorFeedbackItemAdmin,
} from '@/lib/adminApi';

type AdminFeedbackLocale = 'en' | 'it';

const COPY: Record<
  AdminFeedbackLocale,
  {
    back: string;
    detail: string;
    inboxTitle: string;
    date: string;
    read: string;
    unread: string;
    markRead: string;
    adminNotes: string;
    saveNotes: string;
    saving: string;
    saved: string;
    noFeedback: string;
    loading: string;
    error: string;
    retry: string;
  }
> = {
  en: {
    back: 'Back to list',
    detail: 'Instructor detail',
    inboxTitle: 'Inbox (feedback from instructor)',
    date: 'Date',
    read: 'Read',
    unread: 'Unread',
    markRead: 'Mark as read',
    adminNotes: 'Admin notes',
    saveNotes: 'Save notes',
    saving: 'Saving…',
    saved: 'Saved',
    noFeedback: 'No messages yet.',
    loading: 'Loading…',
    error: 'Failed to load.',
    retry: 'Retry',
  },
  it: {
    back: 'Torna alla lista',
    detail: 'Dettaglio instructor',
    inboxTitle: 'Inbox (feedback dal maestro)',
    date: 'Data',
    read: 'Letto',
    unread: 'Non letto',
    markRead: 'Segna come letto',
    adminNotes: 'Note admin',
    saveNotes: 'Salva note',
    saving: 'Salvataggio…',
    saved: 'Salvato',
    noFeedback: 'Nessun messaggio ancora.',
    loading: 'Caricamento…',
    error: 'Caricamento fallito.',
    retry: 'Riprova',
  },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function statusBadge(value: string | null, colors: Record<string, { bg: string; fg: string }>) {
  const v = value ?? 'unknown';
  const c = colors[v] ?? { bg: 'rgba(255, 255, 255, 0.06)', fg: '#6b7280' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: '0.6875rem',
        fontWeight: 600,
        background: c.bg,
        color: c.fg,
      }}
    >
      {v}
    </span>
  );
}

const APPROVAL_COLORS: Record<string, { bg: string; fg: string }> = {
  approved: { bg: '#d1fae5', fg: '#065f46' },
  pending: { bg: '#fef3c7', fg: '#92400e' },
  rejected: { bg: '#fee2e2', fg: '#991b1b' },
};

const HEALTH_COLORS: Record<string, { bg: string; fg: string }> = {
  ok: { bg: '#d1fae5', fg: '#065f46' },
  warning: { bg: '#fef3c7', fg: '#92400e' },
  critical: { bg: '#fee2e2', fg: '#991b1b' },
};

function truncateId(id: string, max = 8): string {
  return id.length <= max ? id : id.slice(0, max) + '…';
}

export default function AdminInstructorDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [locale, setLocale] = useState<AdminFeedbackLocale>('en');
  const [instructor, setInstructor] = useState<AdminInstructorDetail | null>(null);
  const [feedback, setFeedback] = useState<InstructorFeedbackItemAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const [instRes, feedRes] = await Promise.all([
        fetchAdminInstructor(id),
        fetchInstructorFeedback(id),
      ]);
      setInstructor(instRes.instructor);
      setFeedback(feedRes.items);
      const drafts: Record<string, string> = {};
      feedRes.items.forEach((item) => {
        drafts[item.id] = item.admin_notes ?? '';
      });
      setNoteDrafts(drafts);
    } catch (e: any) {
      setError(e?.message ?? COPY[locale].error);
      setInstructor(null);
      setFeedback([]);
    } finally {
      setLoading(false);
    }
  }, [id, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarkRead = async (item: InstructorFeedbackItemAdmin) => {
    if (item.read_at) return;
    setSavingId(item.id);
    try {
      await updateInstructorFeedback(item.id, {
        read_at: new Date().toISOString(),
      });
      setFeedback((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, read_at: new Date().toISOString() } : f
        )
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveNotes = async (item: InstructorFeedbackItemAdmin) => {
    const value = noteDrafts[item.id] ?? item.admin_notes ?? '';
    setSavingId(item.id);
    try {
      await updateInstructorFeedback(item.id, { admin_notes: value || null });
      setFeedback((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, admin_notes: value || null } : f))
      );
      setSavedId(item.id);
      setTimeout(() => setSavedId(null), 2000);
    } finally {
      setSavingId(null);
    }
  };

  const copy = COPY[locale];

  if (loading && !instructor) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: '#6b7280' }}>{copy.loading}</p>
      </div>
    );
  }

  if (error && !instructor) {
    return (
      <div style={{ padding: '2rem' }}>
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '0.5rem',
            color: 'rgba(252, 165, 165, 0.95)',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '0.375rem',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'rgba(226, 232, 240, 0.95)',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          {copy.retry}
        </button>
      </div>
    );
  }

  const inst = instructor!;

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/admin/instructor-approvals"
          style={{
            fontSize: '0.875rem',
            color: '#94a3b8',
            textDecoration: 'none',
            marginBottom: '0.5rem',
            display: 'inline-block',
          }}
        >
          ← {copy.back}
        </Link>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'rgba(226, 232, 240, 0.95)',
            margin: '0.25rem 0 0',
          }}
        >
          {copy.detail}
        </h1>
      </div>

      <div
        style={{
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '0.5rem',
          padding: '1rem 1.25rem',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.5rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, color: 'rgba(226, 232, 240, 0.95)' }}>
              {inst.display_name ?? inst.full_name ?? '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>
              {truncateId(inst.id, 16)}
            </div>
          </div>
          {statusBadge(inst.approval_status, APPROVAL_COLORS)}
          {statusBadge(inst.profile_status, { active: { bg: '#d1fae5', fg: '#065f46' }, draft: { bg: '#e0e7ff', fg: '#3730a3' } })}
          {statusBadge(inst.account_health, HEALTH_COLORS)}
          <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
            Bookings: {inst.total_bookings} · Conversations: {inst.total_conversations}
          </span>
        </div>
      </div>

      <h2
        style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: 'rgba(226, 232, 240, 0.95)',
          marginBottom: '0.75rem',
        }}
      >
        {copy.inboxTitle}
      </h2>

      {feedback.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{copy.noFeedback}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {feedback.map((item) => (
            <li
              key={item.id}
              style={{
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  {copy.date}: {formatDate(item.created_at)}
                </span>
                <span>
                  {item.read_at ? (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        background: '#d1fae5',
                        color: '#065f46',
                      }}
                    >
                      {copy.read}
                    </span>
                  ) : (
                        <button
                          type="button"
                          disabled={savingId === item.id}
                          onClick={() => handleMarkRead(item)}
                          style={{
                            padding: '2px 8px',
                            borderRadius: 999,
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            border: 'none',
                            background: '#fef3c7',
                            color: '#92400e',
                            cursor: savingId === item.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {copy.markRead}
                        </button>
                      )}
                </span>
              </div>
              <div style={{ fontSize: '0.9375rem', color: 'rgba(226, 232, 240, 0.9)', whiteSpace: 'pre-wrap', marginBottom: '0.75rem' }}>
                {item.body}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', color: '#6b7280', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                  {copy.adminNotes}
                </label>
                <textarea
                  value={noteDrafts[item.id] ?? item.admin_notes ?? ''}
                  onChange={(e) =>
                    setNoteDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '0.375rem',
                    fontSize: '0.8125rem',
                    color: 'rgba(226, 232, 240, 0.9)',
                    background: 'rgba(15, 23, 42, 0.5)',
                    resize: 'vertical',
                  }}
                />
                <button
                  type="button"
                  disabled={savingId === item.id}
                  onClick={() => handleSaveNotes(item)}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: 'rgba(226, 232, 240, 0.95)',
                    fontSize: '0.8125rem',
                    cursor: savingId === item.id ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingId === item.id ? copy.saving : savedId === item.id ? copy.saved : copy.saveNotes}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: '1rem' }}>
        <button
          type="button"
          onClick={() => setLocale((l) => (l === 'en' ? 'it' : 'en'))}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.6875rem',
            color: '#6b7280',
            background: 'none',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0.25rem',
            cursor: 'pointer',
          }}
        >
          {locale === 'en' ? 'Italiano' : 'English'}
        </button>
      </div>
    </div>
  );
}
