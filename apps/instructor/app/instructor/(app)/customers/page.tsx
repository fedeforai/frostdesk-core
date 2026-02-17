'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  fetchInstructorCustomers,
  createInstructorCustomer,
  type InstructorCustomerListItem,
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

function displayLabel(c: InstructorCustomerListItem): string {
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

export default function InstructorCustomersPage() {
  const [items, setItems] = useState<InstructorCustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addName, setAddName] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchInstructorCustomers({ limit: 100 });
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : 'Unable to load customers';
      const msg =
        /UNAUTHORIZED|No session|session not found/i.test(raw)
          ? 'UNAUTHORIZED'
          : /Failed to fetch|Load failed|NetworkError|failed.*customer|customer.*failed/i.test(raw)
            ? 'Connection failed. Verify that the API is running (e.g. port 3001) and retry.'
            : raw;
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const searchLower = search.trim().toLowerCase();
  const filteredItems =
    !searchLower
      ? items
      : items.filter(
          (c) =>
            (c.display_name ?? '').toLowerCase().includes(searchLower) ||
            (c.phone_number ?? '').toLowerCase().includes(searchLower)
        );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = addPhone.trim();
    if (!phone) return;
    setAdding(true);
    setError(null);
    try {
      await createInstructorCustomer({
        phoneNumber: phone,
        displayName: addName.trim() || undefined,
      });
      setAddPhone('');
      setAddName('');
      load();
    } catch (e: unknown) {
      if ((e as any)?.code === 'BILLING_BLOCKED') {
        setError('Subscription required. Contact support to activate billing.');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to add customer');
      }
    } finally {
      setAdding(false);
    }
  };

  const dark = {
    section: { background: '#0f172a', color: 'rgba(226, 232, 240, 0.92)', padding: '1.5rem', borderRadius: 12, border: '1px solid rgba(148, 163, 184, 0.2)' },
    muted: { color: 'rgba(148, 163, 184, 0.9)' },
    input: { padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(148, 163, 184, 0.3)', background: 'rgba(15, 23, 42, 0.8)', color: 'rgba(226, 232, 240, 0.92)', minWidth: 200 },
    error: { marginBottom: '1rem', padding: '0.75rem', background: 'rgba(185, 28, 28, 0.2)', color: '#fca5a5', borderRadius: 8 },
    tableWrap: { overflowX: 'auto' as const, border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: 8 },
    th: { padding: '0.75rem', borderBottom: '1px solid rgba(148, 163, 184, 0.2)', background: 'rgba(30, 41, 59, 0.6)', textAlign: 'left' as const },
    td: { padding: '0.75rem', borderBottom: '1px solid rgba(148, 163, 184, 0.15)' },
    link: { color: '#7dd3fc', textDecoration: 'none' },
    badge: { background: 'rgba(30, 41, 59, 0.8)', padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.75rem' },
    btn: { padding: '0.5rem 1rem', borderRadius: 8, background: '#0b7bd6', color: '#fff', border: 0, cursor: 'pointer' },
    btnDisabled: { padding: '0.5rem 1rem', borderRadius: 8, background: 'rgba(148, 163, 184, 0.3)', color: 'rgba(226, 232, 240, 0.5)', border: 0, cursor: 'not-allowed' },
  };

  return (
    <section style={dark.section}>
      <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem' }}>Customers</h1>
      <p style={{ ...dark.muted, fontSize: '0.875rem', marginBottom: '1rem' }}>
        Customers and notes. Add a number to create a profile; you can add notes from the detail card.
      </p>

      {error && (
        <div style={dark.error}>
          {error === 'UNAUTHORIZED' ? (
            <>
              Session expired or not authenticated.{' '}
              <Link href="/instructor/login" style={dark.link}>Login</Link>
            </>
          ) : (
            <>
              {error}
              {' '}
              <button
                type="button"
                onClick={() => load()}
                style={{ ...dark.btn, marginLeft: '0.5rem', padding: '0.35rem 0.75rem', fontSize: '0.875rem' }}
              >
                Retry
              </button>
            </>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search phone or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...dark.input, minWidth: 200 }}
        />
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="+39..."
            value={addPhone}
            onChange={(e) => setAddPhone(e.target.value)}
            style={{ ...dark.input, width: 120 }}
          />
          <input
            type="text"
            placeholder="Nome (opzionale)"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            style={{ ...dark.input, width: 140 }}
          />
          <button type="submit" disabled={adding || !addPhone.trim()} style={adding || !addPhone.trim() ? dark.btnDisabled : dark.btn}>
            {adding ? '…' : 'Add'}
          </button>
        </form>
      </div>

      {loading ? (
        <p style={dark.muted}>Loading…</p>
      ) : items.length === 0 ? (
        <p style={dark.muted}>No customers. Add a number to get started.</p>
      ) : (
        <div style={dark.tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <th style={dark.th}>Customer</th>
                <th style={dark.th}>Ultimo visto</th>
                <th style={dark.th}>Note</th>
                <th style={dark.th}>Valore</th>
                <th style={dark.th}></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((c) => (
                <tr key={c.id}>
                  <td style={dark.td}>{displayLabel(c)}</td>
                  <td style={{ ...dark.td, ...dark.muted }}>
                    {c.last_seen_at ? formatDateTime(c.last_seen_at) : '—'}
                  </td>
                  <td style={dark.td}>{c.notes_count ?? 0}</td>
                  <td style={dark.td}>
                    {(() => {
                      const { score, why } = getValueScoreAndWhy({
                        lastSeenAt: c.last_seen_at ?? null,
                        notesCount: c.notes_count ?? 0,
                        firstSeenAt: c.first_seen_at ?? null,
                        bookingsCount: c.bookings_count ?? 0,
                      });
                      return (
                        <span style={dark.badge} title={why}>
                          {valueBadge(score)} ({score})
                          <span style={{ marginLeft: 4, cursor: 'help', opacity: 0.8 }} aria-label={why}>ⓘ</span>
                        </span>
                      );
                    })()}
                  </td>
                  <td style={dark.td}>
                    <Link href={`/instructor/customers/${c.id}`} style={dark.link}>
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
