import { fetchInstructorBookingServer } from '@/lib/instructorApiServer';
import { BookingDetail } from '@/components/bookings/BookingDetail';
import { PaymentLinkButton } from '@/components/bookings/PaymentLinkButton';
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
      loadFailed = true;
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
        <p style={{ color: 'rgba(148, 163, 184, 0.9)' }}>Booking not found.</p>
        <Link href="/instructor/bookings" style={{ color: 'rgba(129, 140, 248, 0.95)', textDecoration: 'underline' }}>
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
          Couldn&apos;t load booking. <Link href={`/instructor/bookings/${params.bookingId}`} style={{ color: 'rgba(129, 140, 248, 0.95)', textDecoration: 'underline' }}>Refresh the page</Link> to retry.
        </p>
      )}
      {booking && <BookingDetail booking={booking} />}
      {booking && <PaymentLinkButton bookingId={booking.id} />}
      <BookingDecisionTimeline
        key={`${params.bookingId}-${(booking as { updated_at?: string })?.updated_at ?? ''}`}
        bookingId={params.bookingId}
      />
    </section>
  );
}
