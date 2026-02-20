'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  fetchInstructorCustomer,
  createInstructorCustomerNote,
  fetchInstructorBookings,
  type InstructorCustomerDetailResponse,
} from '@/lib/instructorApi';
import { getValueScoreAndWhy } from '@/lib/valueScore';
import styles from './customerProfile.module.css';

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

function avatarInitial(c: { display_name?: string | null; phone_number?: string | null; id: string }): string {
  const label = displayLabel(c);
  const first = label.replace(/^Customer\s*/i, '').trim() || c.id;
  if (/^[a-zA-Z]/.test(first)) return first.slice(0, 2).toUpperCase();
  return (c.id.slice(0, 2) || '?').toUpperCase();
}

function valueBadge(score: number): 'Platinum' | 'Gold' | 'Silver' | 'Bronze' {
  if (score >= 90) return 'Platinum';
  if (score >= 70) return 'Gold';
  if (score >= 40) return 'Silver';
  return 'Bronze';
}

function valueBadgeClass(score: number): string {
  const tier = valueBadge(score);
  return (
    styles.valueBadge +
    ' ' +
    (tier === 'Platinum'
      ? styles.valuePlatinum
      : tier === 'Gold'
        ? styles.valueGold
        : tier === 'Silver'
          ? styles.valueSilver
          : styles.valueBronze)
  );
}

function formatRevenue(cents: number | undefined, currency: string | null | undefined): string {
  if (cents == null || cents === 0) return '—';
  const cur = (currency || 'EUR').toUpperCase();
  const sym = cur === 'EUR' ? '€' : cur === 'GBP' ? '£' : cur === 'CHF' ? 'CHF' : cur;
  return `${sym} ${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InstructorCustomerDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [data, setData] = useState<InstructorCustomerDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

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
        setError('Customer not found');
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

  useEffect(() => {
    if (!id || !data) return;
    let cancelled = false;
    setBookingsLoading(true);
    fetchInstructorBookings()
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.items) ? res.items : [];
        setBookings(list.filter((b: any) => b.customer_id === id));
      })
      .catch(() => {
        if (!cancelled) setBookings([]);
      })
      .finally(() => {
        if (!cancelled) setBookingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, data]);

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
      if ((e as any)?.code === 'BILLING_BLOCKED') {
        setError('Subscription required. Contact support to activate billing.');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to add note');
      }
    } finally {
      setSubmittingNote(false);
    }
  };

  if (!id) {
    return (
      <div className={styles.section}>
        <div className={styles.baseWrap}>
          <p>ID mancante.</p>
          <Link href="/instructor/customers" className={styles.backLink}>
            ← Customers
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.section}>
        <div className={styles.baseWrap}>
          <Link href="/instructor/customers" className={styles.backLink}>
            ← Customers
          </Link>
          <div className={styles.loadingWrap}>Loading…</div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className={styles.section}>
        <div className={styles.baseWrap}>
          <Link href="/instructor/customers" className={styles.backLink}>
            ← Customers
          </Link>
          <div className={styles.errorBanner}>{error}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.section}>
        <div className={styles.baseWrap}>
          <Link href="/instructor/customers" className={styles.backLink}>
            ← Customers
          </Link>
          <p>Customer not found.</p>
        </div>
      </div>
    );
  }

  const { customer, notes, stats } = data;
  const valueInfo = getValueScoreAndWhy({
    lastSeenAt: customer.last_seen_at ?? null,
    notesCount: stats.notes_count,
    firstSeenAt: customer.first_seen_at ?? null,
    bookingsCount: stats.bookings_count,
  });
  const tier = valueBadge(stats.value_score);

  return (
    <div className={styles.section}>
      <div className={styles.baseWrap}>
        <Link href="/instructor/customers" className={styles.backLink}>
          ← Customers
        </Link>

        <header className={styles.hero}>
          <div className={styles.avatar} aria-hidden>
            {avatarInitial(customer)}
          </div>
          <div className={styles.heroBody}>
            <div className={styles.heroTop}>
              <h1 className={styles.heroTitle}>{displayLabel(customer)}</h1>
              <span
                className={valueBadgeClass(stats.value_score)}
                title={valueInfo.why}
              >
                {tier}
              </span>
            </div>
            <div className={styles.heroMeta}>
              {customer.phone_number && <span>{customer.phone_number}</span>}
              {customer.source && (
                <span className={styles.sourceChip}>{customer.source}</span>
              )}
            </div>
            <div className={styles.actions}>
              <Link
                href={`/instructor/bookings/new?customer_id=${encodeURIComponent(id)}`}
                className={styles.primaryBtn}
              >
                New booking
              </Link>
            </div>
          </div>
        </header>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>First seen</div>
            <div className={styles.statValue}>{formatDateTime(customer.first_seen_at)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Last seen</div>
            <div className={styles.statValue}>{formatDateTime(customer.last_seen_at)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Notes</div>
            <div className={styles.statValue}>{stats.notes_count}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Bookings</div>
            <div className={styles.statValue}>{stats.bookings_count}</div>
          </div>
          <div className={styles.statCard} title={valueInfo.why}>
            <div className={styles.statLabel}>Value</div>
            <div className={styles.statValue}>
              {tier} ({stats.value_score})
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Revenue</div>
            <div className={styles.statValue}>
              {formatRevenue(stats.total_amount_cents, stats.currency)}
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Add note</h2>
          <form onSubmit={handleAddNote}>
            <textarea
              className={styles.textarea}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Preferences, follow-up…"
              rows={3}
            />
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submittingNote || !noteContent.trim()}
            >
              {submittingNote ? 'Saving…' : 'Add note'}
            </button>
          </form>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Notes</h2>
          {notes.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon} aria-hidden>📝</div>
              No notes yet. Add one above to keep track of preferences and follow-ups.
            </div>
          ) : (
            <ul className={styles.notesList}>
              {notes.map((n) => (
                <li key={n.id} className={styles.noteCard}>
                  <div className={styles.noteContent}>{n.content}</div>
                  <div className={styles.noteTime}>{formatDateTime(n.created_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Prenotazioni</h2>
          {bookingsLoading ? (
            <div className={styles.loadingWrap}>Caricamento…</div>
          ) : bookings.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon} aria-hidden>📅</div>
              Nessuna prenotazione.{' '}
              <Link href={`/instructor/bookings/new?customer_id=${encodeURIComponent(id)}`} className={styles.backLink}>
                Crea prenotazione
              </Link>
            </div>
          ) : (
            <div className={styles.bookingsWrap}>
              <table className={styles.bookingsTable}>
                <thead>
                  <tr>
                    <th className={styles.bookingsTh}>Data</th>
                    <th className={styles.bookingsTh}>Stato</th>
                    <th className={styles.bookingsTh}></th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className={styles.bookingsTr}>
                      <td className={styles.bookingsTd}>
                        {formatDateTime(b.start_time ?? b.created_at)}
                      </td>
                      <td className={styles.bookingsTd}>
                        <span className={styles.statusPill}>{b.status ?? '—'}</span>
                      </td>
                      <td className={styles.bookingsTd}>
                        <Link href={`/instructor/bookings/${b.id}`} className={styles.tableLink}>
                          Dettaglio
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
