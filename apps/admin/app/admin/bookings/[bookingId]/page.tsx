'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  fetchAdminBookingDetail,
  fetchBookingLifecycle,
  type AdminBookingDetail,
  type BookingAuditEntry,
  type BookingLifecycleEvent,
} from '@/lib/adminApi';
import BookingDetail from '@/components/admin/BookingDetail';
import BookingAuditTrail from '@/components/admin/BookingAuditTrail';
import BookingStatusOverride from '@/components/admin/BookingStatusOverride';
import BookingLifecycleTimeline from '@/components/admin/BookingLifecycleTimeline';

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<AdminBookingDetail | null>(null);
  const [auditTrail, setAuditTrail] = useState<BookingAuditEntry[]>([]);
  const [lifecycleEvents, setLifecycleEvents] = useState<BookingLifecycleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, lifecycle] = await Promise.allSettled([
        fetchAdminBookingDetail(bookingId),
        fetchBookingLifecycle(bookingId),
      ]);

      if (detail.status === 'fulfilled' && detail.value) {
        setBooking(detail.value.booking);
        setAuditTrail(detail.value.auditTrail ?? []);
      } else {
        setError('Failed to load booking detail');
      }

      if (lifecycle.status === 'fulfilled') {
        setLifecycleEvents(lifecycle.value ?? []);
      }
    } catch {
      setError('Failed to load booking data');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/admin/bookings" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1rem' }}>
          ← Back to Bookings
        </Link>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', margin: 0 }}>
          Booking: {bookingId}
        </h1>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', color: '#6b7280', fontSize: '0.875rem' }}>Loading booking details...</div>
      ) : error ? (
        <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', color: '#991b1b', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {error}
          <br />
          <button type="button" onClick={load} style={{ marginTop: '0.5rem', padding: '0.375rem 0.75rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '0.375rem', background: 'rgba(255, 255, 255, 0.05)', cursor: 'pointer', fontSize: '0.8125rem' }}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '2rem' }}>
            <BookingDetail booking={booking} />
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <BookingLifecycleTimeline events={lifecycleEvents} />
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <BookingAuditTrail auditTrail={auditTrail} />
          </div>
          <BookingStatusOverride bookingId={bookingId} currentStatus={booking?.status ?? 'unknown'} userRole={null} />
        </>
      )}
    </div>
  );
}
