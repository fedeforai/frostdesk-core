import { fetchBookingLifecycle } from '@/lib/adminApi';
import BookingLifecycleTimeline from '@/components/admin/BookingLifecycleTimeline';
import ErrorState from '@/components/admin/ErrorState';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import Link from 'next/link';

interface BookingLifecyclePageProps {
  params: {
    bookingId: string;
  };
}

export default async function BookingLifecyclePage({ params }: BookingLifecyclePageProps) {
  const bookingId = params.bookingId;

  try {
    const data = await fetchBookingLifecycle(bookingId);

    if (!data.lifecycle) {
      return (
        <div style={{ padding: '2rem' }}>
          <Breadcrumbs items={[
            { label: 'Admin', href: '/admin' },
            { label: 'Bookings', href: '/admin/bookings' },
            { label: bookingId, href: `/admin/bookings/${bookingId}` },
            { label: 'Lifecycle' },
          ]} />
          <div style={{ marginBottom: '1.5rem' }}>
            <Link
              href={`/admin/bookings/${bookingId}`}
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
              aria-label="Back to booking detail"
            >
              ← Back to Booking
            </Link>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827' }}>
              Booking Lifecycle: {bookingId}
            </h1>
          </div>
          <ErrorState status={404} />
        </div>
      );
    }

    return (
      <div style={{ padding: '2rem' }}>
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Bookings', href: '/admin/bookings' },
          { label: bookingId, href: `/admin/bookings/${bookingId}` },
          { label: 'Lifecycle' },
        ]} />
        <div style={{ marginBottom: '2rem' }}>
          <Link
            href={`/admin/bookings/${bookingId}`}
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
            aria-label="Back to booking detail"
          >
            ← Back to Booking
          </Link>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827' }}>
            Booking Lifecycle: {bookingId}
          </h1>
        </div>
        
        <BookingLifecycleTimeline lifecycle={data.lifecycle} />
      </div>
    );
  } catch (error: any) {
    return (
      <div style={{ padding: '2rem' }}>
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Bookings', href: '/admin/bookings' },
          { label: bookingId, href: `/admin/bookings/${bookingId}` },
          { label: 'Lifecycle' },
        ]} />
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            href={`/admin/bookings/${bookingId}`}
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
            aria-label="Back to booking detail"
          >
            ← Back to Booking
          </Link>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827' }}>
            Booking Lifecycle: {bookingId}
          </h1>
        </div>
        <ErrorState
          status={error.status || 500}
          message={error.message}
        />
      </div>
    );
  }
}
