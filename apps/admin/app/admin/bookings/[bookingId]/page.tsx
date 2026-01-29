import { fetchAdminBookingDetail, fetchBookingLifecycle } from '@/lib/adminApi';
import { getUserRole } from '@/lib/getUserRole';
import BookingDetail from '@/components/admin/BookingDetail';
import BookingAuditTrail from '@/components/admin/BookingAuditTrail';
import BookingStatusOverride from '@/components/admin/BookingStatusOverride';
import BookingLifecycleTimeline from '@/components/admin/BookingLifecycleTimeline';
import ErrorState from '@/components/admin/ErrorState';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import Badge from '@/components/ui/badge';
import Link from 'next/link';

interface BookingDetailPageProps {
  params: {
    bookingId: string;
  };
}

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const bookingId = params.bookingId;

  // UI-ONLY / DEMO-SAFE MODE: Graceful fallback when API unavailable
  let bookingData = null;
  let lifecycleEvents = null;

  try {
    bookingData = await fetchAdminBookingDetail(bookingId);
  } catch (error) {
    console.warn('[ADMIN BOOKING DETAIL] API unavailable, using fallback');
  }

  try {
    lifecycleEvents = await fetchBookingLifecycle(bookingId);
  } catch (error) {
    console.warn('[ADMIN BOOKING LIFECYCLE] API unavailable, lifecycle timeline will be empty');
  }

  const userRole = await getUserRole();

  // Fallback data (read-only, realistic for demo)
  const fallbackBooking = bookingData?.booking ?? {
    id: bookingId,
    instructor_id: 1,
    customer_name: 'Demo Customer',
    phone: '+39 123 456 7890',
    status: 'confirmed',
    booking_date: new Date().toISOString().split('T')[0],
    start_time: '10:00:00',
    end_time: '12:00:00',
    calendar_event_id: null,
    payment_intent_id: null,
    conversation_id: null,
    created_at: new Date().toISOString(),
  };

  const fallbackAuditTrail = bookingData?.auditTrail ?? [];

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumbs items={[
        { label: 'Admin', href: '/admin' },
        { label: 'Bookings', href: '/admin/bookings' },
        { label: bookingId },
      ]} />
      <div style={{ marginBottom: '2rem' }}>
        <Link
          href="/admin/bookings"
          style={{
            color: '#3b82f6',
            textDecoration: 'none',
            fontSize: '0.875rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            marginBottom: '1rem',
            transition: 'color 0.15s ease',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#2563eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#3b82f6';
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #3b82f6';
            e.currentTarget.style.outlineOffset = '2px';
            e.currentTarget.style.borderRadius = '0.25rem';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          aria-label="Back to bookings list"
        >
          ← Back to Bookings
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', margin: 0 }}>
            Booking: {bookingId}
          </h1>
          <Badge variant="outline">Read-only</Badge>
        </div>
      </div>
      
      <div style={{ marginBottom: '2rem' }}>
        <BookingDetail booking={fallbackBooking} />
      </div>
      
      <div style={{ marginBottom: '2rem' }}>
        <BookingLifecycleTimeline events={lifecycleEvents ?? []} />
      </div>
      
      <div style={{ marginBottom: '2rem' }}>
        <BookingAuditTrail auditTrail={fallbackAuditTrail} />
      </div>
      
      <BookingStatusOverride bookingId={bookingId} currentStatus={fallbackBooking.status} userRole={userRole} />
    </div>
  );
}
