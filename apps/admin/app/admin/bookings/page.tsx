'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { fetchAdminBookings, type AdminBookingSummary } from '@/lib/adminApi';
import BookingsTable from '@/components/admin/BookingsTable';

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;
  const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0;
  const status = searchParams.get('status') || undefined;
  const instructorId = searchParams.get('instructorId') || undefined;
  const dateFrom = searchParams.get('dateFrom') || undefined;
  const dateTo = searchParams.get('dateTo') || undefined;

  const [items, setItems] = useState<AdminBookingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await fetchAdminBookings({ limit, offset, status, instructorId, dateFrom, dateTo });
      setItems(result?.items ?? []);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMessage(e?.message ?? 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [limit, offset, status, instructorId, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const hasNext = items.length >= limit;
  const hasPrev = offset > 0;

  function buildHref(params: Record<string, string | number | undefined>) {
    const qp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') qp.set(k, String(v));
    }
    const qs = qp.toString();
    return `/admin/bookings${qs ? `?${qs}` : ''}`;
  }

  const handleFilter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    router.push(buildHref({
      status: fd.get('status') as string || undefined,
      dateFrom: fd.get('dateFrom') as string || undefined,
      dateTo: fd.get('dateTo') as string || undefined,
      limit,
    }));
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1rem' }}>
        Bookings
      </h1>

      {/* Filters */}
      <form onSubmit={handleFilter} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Status</label>
          <select
            name="status"
            defaultValue={status ?? ''}
            style={{ padding: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '0.375rem', fontSize: '0.875rem' }}
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
            <option value="modified">Modified</option>
            <option value="declined">Declined</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>From</label>
          <input type="date" name="dateFrom" defaultValue={dateFrom ?? ''} style={{ padding: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>To</label>
          <input type="date" name="dateTo" defaultValue={dateTo ?? ''} style={{ padding: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
        </div>
        <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer' }}>
          Filter
        </button>
        {(status || dateFrom || dateTo) && (
          <Link href="/admin/bookings" style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'underline', alignSelf: 'center' }}>
            Clear
          </Link>
        )}
      </form>

      {loading ? (
        <div style={{ padding: '2rem', color: '#6b7280', fontSize: '0.875rem' }}>Loading bookings...</div>
      ) : errorMessage ? (
        <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', color: '#991b1b', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {errorMessage}
          <br />
          <button type="button" onClick={load} style={{ marginTop: '0.5rem', padding: '0.375rem 0.75rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '0.375rem', background: 'rgba(255, 255, 255, 0.05)', cursor: 'pointer', fontSize: '0.8125rem' }}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '0.75rem' }}>
            Showing {items.length} booking{items.length !== 1 ? 's' : ''}
            {offset > 0 ? ` (offset ${offset})` : ''}
          </div>
          <BookingsTable bookings={items} />

          {/* Pagination */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
            {hasPrev && (
              <Link href={buildHref({ offset: Math.max(0, offset - limit), limit, status, dateFrom, dateTo })} style={{ fontSize: '0.875rem', color: '#2563eb', textDecoration: 'none' }}>
                ← Previous
              </Link>
            )}
            {hasNext && (
              <Link href={buildHref({ offset: offset + limit, limit, status, dateFrom, dateTo })} style={{ fontSize: '0.875rem', color: '#2563eb', textDecoration: 'none' }}>
                Next →
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
