import { fetchInstructorBookingServer } from '@/lib/instructorApiServer';
import { BookingDetail } from '@/components/bookings/BookingDetail';
import BookingDecisionTimeline from '@/components/decision-timeline/BookingDecisionTimeline';
import Link from 'next/link';

type PageProps = {
  params: { bookingId: string };
};

export default async function BookingDetailPage({ params }: PageProps) {
  let booking: Awaited<ReturnType<typeof fetchInstructorBookingServer>> | null = null;
  let loadFailed = false;
  let notFound = false;

  try {
    booking = await fetchInstructorBookingServer(params.bookingId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'UNAUTHORIZED') {
      return <meta httpEquiv="refresh" content="0;url=/instructor/login" />;
    }
    if (message === 'NOT_FOUND') {
      notFound = true;
    } else {
      loadFailed = true;
    }
  }

  if (notFound) {
    return (
      <section>
        <h1>Booking</h1>
        <p style={{ color: '#6b7280' }}>Booking not found.</p>
        <Link href="/instructor/bookings" style={{ color: '#2563eb', textDecoration: 'underline' }}>
          Go to Bookings
        </Link>
      </section>
    );
  }

  return (
    <section>
      <h1>Booking</h1>
      {loadFailed && (
        <p style={{ marginBottom: '1rem', color: '#b91c1c', fontSize: '0.875rem' }}>
          Couldn&apos;t load booking. <Link href={`/instructor/bookings/${params.bookingId}`} style={{ color: '#2563eb', textDecoration: 'underline' }}>Refresh the page</Link> to retry.
        </p>
      )}
      {booking && <BookingDetail booking={booking} />}
      <BookingDecisionTimeline
        key={`${params.bookingId}-${(booking as { updated_at?: string })?.updated_at ?? ''}`}
        bookingId={params.bookingId}
      />
    </section>
  );
}
