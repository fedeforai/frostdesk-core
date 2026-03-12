'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  fetchAllInstructorFeedback,
  type InstructorFeedbackListItem,
} from '@/lib/adminApi';

const MESSAGE_PREVIEW_LEN = 120;
const ADMIN_NOTES_PREVIEW_LEN = 80;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function preview(text: string | null, maxLen: number): string {
  if (!text || typeof text !== 'string') return '—';
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen) + '…';
}

export default function FeedbackPage() {
  const [items, setItems] = useState<InstructorFeedbackListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchAllInstructorFeedback({ limit: 50, offset: 0 });
      setItems(res.items ?? []);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'Failed to load feedback');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const th: React.CSSProperties = {
    padding: '0.625rem 0.75rem',
    textAlign: 'left',
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
    whiteSpace: 'nowrap',
  };

  const td: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    fontSize: '0.8125rem',
    color: 'rgba(148, 163, 184, 0.9)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'rgba(226, 232, 240, 0.95)', margin: 0 }}>
          Feedback
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>
          Tutti i messaggi inviati dai maestri. Clicca su un istruttore per vedere il dettaglio e le note.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', color: '#6b7280', fontSize: '0.875rem' }}>Loading…</div>
      ) : error ? (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          {error}
          <br />
          <button
            type="button"
            onClick={load}
            style={{
              marginTop: '0.5rem',
              padding: '0.375rem 0.75rem',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '0.375rem',
              background: 'rgba(255, 255, 255, 0.05)',
              cursor: 'pointer',
              fontSize: '0.8125rem',
            }}
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '0.875rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0.5rem',
          }}
        >
          Nessun feedback ancora.
        </div>
      ) : (
        <div
          style={{
            overflowX: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0.5rem',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                <th style={th}>Instructor</th>
                <th style={th}>Date</th>
                <th style={th}>Message</th>
                <th style={th}>Read</th>
                <th style={th}>Admin notes</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ transition: 'background 0.1s' }}>
                  <td style={td}>
                    <Link
                      href={`/admin/instructors/${item.instructor_id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <span style={{ fontWeight: 500, color: 'rgba(226, 232, 240, 0.95)' }}>
                        {item.instructor_name ?? '—'}
                      </span>
                    </Link>
                  </td>
                  <td style={{ ...td, fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {formatDate(item.created_at)}
                  </td>
                  <td style={{ ...td, maxWidth: 280 }} title={item.body}>
                    {preview(item.body, MESSAGE_PREVIEW_LEN)}
                  </td>
                  <td style={td}>{item.read_at ? 'Sì' : 'No'}</td>
                  <td style={{ ...td, maxWidth: 160 }} title={item.admin_notes ?? undefined}>
                    {preview(item.admin_notes, ADMIN_NOTES_PREVIEW_LEN)}
                  </td>
                  <td style={td}>
                    <Link
                      href={`/admin/instructors/${item.instructor_id}`}
                      style={{
                        fontSize: '0.8125rem',
                        color: '#2563eb',
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
