'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  fetchInstructorCustomer,
  createInstructorCustomerNote,
  type InstructorCustomerDetailResponse,
} from '@/lib/instructorApi';
import { getValueScoreAndWhy } from '@/lib/valueScore';

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function displayLabel(c: { display_name?: string | null; phone_number?: string | null; id: string }): string {
  if (c.display_name?.trim()) return c.display_name.trim();
  const phone = c.phone_number?.trim();
  if (phone) {
    if (phone.length <= 6) return `Customer •••${phone.slice(-4)}`;
    return `Customer ${phone.slice(0, 4)}•••${phone.slice(-4)}`;
  }
  return `Customer ${c.id.slice(0, 8)}`;
}

function valueBadge(score: number): string {
  if (score >= 90) return 'Platinum';
  if (score >= 70) return 'Gold';
  if (score >= 40) return 'Silver';
  return 'Bronze';
}

export default function InstructorCustomerDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [data, setData] = useState<InstructorCustomerDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetchInstructorCustomer(id);
      setData(res);
    } catch (e: unknown) {
      if ((e as any)?.status === 404) {
        setData(null);
        setError('Cliente non trovato');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load customer');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = noteContent.trim();
    if (!content) return;
    setSubmittingNote(true);
    setError(null);
    try {
      await createInstructorCustomerNote(id, { content });
      setNoteContent('');
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add note');
    } finally {
      setSubmittingNote(false);
    }
  };

  const darkBase = { background: '#0f172a', color: 'rgba(226, 232, 240, 0.92)', padding: '1.5rem', borderRadius: 12 };
  const darkLink = { color: '#7dd3fc', textDecoration: 'none' as const };

  if (!id) {
    return (
      <section style={darkBase}>
        <p>ID mancante.</p>
        <Link href="/instructor/customers" style={darkLink}>← Customers</Link>
      </section>
    );
  }

  if (loading) {
    return (
      <section style={darkBase}>
        <p style={{ color: 'rgba(148, 163, 184, 0.9)' }}>Caricamento…</p>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section style={darkBase}>
        <p style={{ color: '#fca5a5' }}>{error}</p>
        <Link href="/instructor/customers" style={darkLink}>← Customers</Link>
      </section>
    );
  }

  if (!data) {
    return (
      <section style={darkBase}>
        <p>Cliente non trovato.</p>
        <Link href="/instructor/customers" style={darkLink}>← Customers</Link>
      </section>
    );
  }

  const { customer, notes, stats } = data;

  const dark = {
    section: { background: '#0f172a', color: 'rgba(226, 232, 240, 0.92)', padding: '1.5rem', borderRadius: 12, border: '1px solid rgba(148, 163, 184, 0.2)' },
    muted: { color: 'rgba(148, 163, 184, 0.9)' },
    link: { color: '#7dd3fc', textDecoration: 'none', fontSize: '0.875rem' },
    error: { marginBottom: '1rem', padding: '0.75rem', background: 'rgba(185, 28, 28, 0.2)', color: '#fca5a5', borderRadius: 8 },
    card: { marginBottom: '1.5rem', padding: '1rem', background: 'rgba(30, 41, 59, 0.6)', borderRadius: 8, border: '1px solid rgba(148, 163, 184, 0.2)' },
    textarea: { width: '100%', maxWidth: 400, padding: '0.5rem', borderRadius: 8, border: '1px solid rgba(148, 163, 184, 0.3)', background: 'rgba(15, 23, 42, 0.8)', color: 'rgba(226, 232, 240, 0.92)', marginBottom: '0.5rem', boxSizing: 'border-box' as const },
    btn: { padding: '0.5rem 1rem', borderRadius: 8, background: '#0b7bd6', color: '#fff', border: 0, cursor: 'pointer' },
    btnDisabled: { padding: '0.5rem 1rem', borderRadius: 8, background: 'rgba(148, 163, 184, 0.3)', color: 'rgba(226, 232, 240, 0.5)', border: 0, cursor: 'not-allowed' },
    noteItem: { padding: '0.75rem', borderBottom: '1px solid rgba(148, 163, 184, 0.2)', background: 'rgba(30, 41, 59, 0.4)' },
  };

  return (
    <section style={dark.section}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/instructor/customers" style={dark.link}>
          ← Customers
        </Link>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{displayLabel(customer)}</h1>
        <div style={{ fontSize: '0.875rem', ...dark.muted }}>
          {customer.phone_number && <span>Phone: {customer.phone_number}</span>}
          {customer.phone_number && ' · '}
          Source: {customer.source}
        </div>
      </div>

      {error && (
        <div style={dark.error}>
          {error}
        </div>
      )}

      <div style={dark.card}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Stats</h2>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>
          First seen: {formatDateTime(customer.first_seen_at)} · Last seen: {formatDateTime(customer.last_seen_at)}
        </p>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
          Notes: <strong>{stats.notes_count}</strong> · Bookings: <strong>{stats.bookings_count}</strong>
          {' · '}
          <span
            title={getValueScoreAndWhy({
              lastSeenAt: customer.last_seen_at ?? null,
              notesCount: stats.notes_count,
              firstSeenAt: customer.first_seen_at ?? null,
              bookingsCount: stats.bookings_count,
            }).why}
            style={{ cursor: 'help' }}
          >
            Value: <strong>{valueBadge(stats.value_score)}</strong> ({stats.value_score}) ⓘ
          </span>
        </p>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Add note</h2>
        <form onSubmit={handleAddNote}>
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Preferences, follow-up..."
            rows={2}
            style={dark.textarea}
          />
          <button type="submit" disabled={submittingNote || !noteContent.trim()} style={submittingNote || !noteContent.trim() ? dark.btnDisabled : dark.btn}>
            {submittingNote ? '…' : 'Add note'}
          </button>
        </form>
      </div>

      <div>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Note</h2>
        {notes.length === 0 ? (
          <p style={{ ...dark.muted, fontSize: '0.875rem' }}>Nessuna nota. Aggiungine una sopra.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {notes.map((n) => (
              <li key={n.id} style={dark.noteItem}>
                <div style={{ fontSize: '0.875rem' }}>{n.content}</div>
                <div style={{ fontSize: '0.75rem', ...dark.muted, marginTop: '0.25rem' }}>
                  {formatDateTime(n.created_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
