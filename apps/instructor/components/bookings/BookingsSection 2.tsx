'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchInstructorBookings, type FetchInstructorBookingsFilters } from '@/lib/instructorApi';
import { BookingsTable, type Booking } from './BookingsTable';

export type ListFilter = 'all' | 'today' | 'unpaid';

function getFiltersForListFilter(filter: ListFilter): FetchInstructorBookingsFilters | undefined {
  if (filter === 'all') return undefined;
  if (filter === 'unpaid') return { payment_status: 'unpaid' };
  if (filter === 'today') {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const date = `${y}-${m}-${d}`;
    return { date_from: date, date_to: date };
  }
  return undefined;
}

export function BookingsSection() {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<ListFilter>('today');

  const load = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const filters = getFiltersForListFilter(listFilter);
      const res = await fetchInstructorBookings(filters);
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Couldn\'t load bookings';
      const msg =
        /UNAUTHORIZED|No session/i.test(raw)
          ? 'UNAUTHORIZED'
          : /FAILED_TO_LOAD_BOOKINGS|NOT_FOUND|ONBOARDING/i.test(raw)
            ? 'Unable to load bookings. Verify that the API is running and retry.'
            : raw;
      setLoadError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [listFilter]);

  useEffect(() => {
    load();
  }, [load]);

  if (loadError === 'UNAUTHORIZED') {
    return (
      <div style={styles.wrap}>
        <p style={{ color: '#fca5a5', marginBottom: '0.5rem' }}>
          Session expired or not authenticated.{' '}
          <Link href="/instructor/login" style={{ color: '#7dd3fc', textDecoration: 'underline' }}>
            Login
          </Link>
        </p>
      </div>
    );
  }

  /* Error state: show only error + Retry, no empty state */
  if (loadError && loadError !== 'UNAUTHORIZED') {
    return (
      <div style={styles.wrap}>
        <div style={styles.topBar}>
          <Link href="/instructor/bookings/new" style={styles.btnPrimary}>
            New booking
          </Link>
        </div>
        <div style={styles.errorBanner}>
          {loadError}
          {' '}
          <button type="button" onClick={load} style={styles.retryBtn}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* Loading: show only loading */
  if (loading) {
    return (
      <div style={styles.wrap}>
        <div style={styles.topBar}>
          <Link href="/instructor/bookings/new" style={styles.btnPrimary}>
            New booking
          </Link>
        </div>
        <p style={styles.muted}>Loading bookings…</p>
      </div>
    );
  }

  /* Success: empty or table */
  return (
    <div style={styles.wrap}>
      <div style={styles.topBar}>
        <Link href="/instructor/bookings/new" style={styles.btnPrimary}>
          New booking
        </Link>
        <span style={styles.filterGroup}>
          <span style={styles.filterLabel}>Mostra:</span>
          <select
            value={listFilter}
            onChange={(e) => setListFilter(e.target.value as ListFilter)}
            style={styles.filterSelect}
            aria-label="Filter bookings"
          >
            <option value="all">Tutti</option>
            <option value="today">Oggi</option>
            <option value="unpaid">Non pagate</option>
          </select>
        </span>
      </div>
      {items.length === 0 ? (
        <p style={styles.muted}>
          {listFilter === 'all' ? 'No bookings.' : listFilter === 'today' ? 'No bookings today.' : 'No unpaid bookings.'}
        </p>
      ) : (
        <BookingsTable items={items} onUpdated={load} />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    maxWidth: 1200,
    margin: '0 auto',
  },
  topBar: {
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  btnPrimary: {
    padding: '0.5rem 0.75rem',
    background: '#0f172a',
    color: 'rgba(226, 232, 240, 0.95)',
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 600,
    border: '1px solid rgba(148, 163, 184, 0.3)',
  },
  muted: {
    color: 'rgba(148, 163, 184, 0.92)',
    fontSize: '0.875rem',
  },
  errorBanner: {
    marginBottom: '1rem',
    padding: '0.75rem 1rem',
    background: 'rgba(185, 28, 28, 0.2)',
    border: '1px solid rgba(248, 113, 113, 0.5)',
    borderRadius: 8,
    color: '#fca5a5',
    fontSize: '0.875rem',
  },
  retryBtn: {
    marginLeft: '0.5rem',
    padding: '0.35rem 0.75rem',
    background: 'transparent',
    border: '1px solid rgba(248, 113, 113, 0.6)',
    borderRadius: 6,
    color: '#fca5a5',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  filterGroup: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  filterLabel: {
    fontSize: '0.875rem',
    color: 'rgba(148, 163, 184, 0.92)',
  },
  filterSelect: {
    padding: '0.35rem 0.5rem',
    borderRadius: 6,
    border: '1px solid rgba(148, 163, 184, 0.3)',
    background: 'rgba(15, 23, 42, 0.8)',
    color: 'rgba(226, 232, 240, 0.95)',
    fontSize: '0.875rem',
  },
};
