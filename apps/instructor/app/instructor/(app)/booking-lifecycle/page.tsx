import { fetchBookingLifecycleByIdServer } from '@/lib/instructorApiServer';
import { BookingLifecycleHeader } from '@/components/bookings/BookingLifecycleHeader';
import { BookingLifecycleTimeline } from '@/components/bookings/BookingLifecycleTimeline';
import Link from 'next/link';

/**
 * FORBIDDEN BEHAVIOR VERIFICATION CHECKLIST
 * 
 * ✅ NO POST / PUT / DELETE - Only GET via fetchBookingLifecycleById
 * ✅ NO createBooking - Not imported or called
 * ✅ NO updateBooking - Not imported or called
 * ✅ NO confirmBooking - Not imported or called
 * ✅ NO mutations of any kind - Read-only data flow
 * ✅ NO AI calls - No AI-related imports or calls
 * ✅ NO availability logic - No availability imports or logic
 * ✅ NO phase inference - No state derivation or phase detection
 * ✅ NO status labeling - Raw status display only
 * ✅ NO buttons or click handlers - Pure presentation components
 * ✅ NO side effects - Server component, no client-side effects
 * ✅ NO logging - No console.log or logging calls
 * 
 * VERIFIED: 2026-01-23
 * This page is READ-ONLY observability only.
 */

type PageProps = {
  searchParams: { bookingId?: string };
};

const EMPTY_LIFECYCLE = {
  booking: null as unknown as { id: string; status: string; [key: string]: unknown },
  auditLog: [] as Array<{ id: string; [key: string]: unknown }>,
};

export default async function BookingLifecyclePage({ searchParams }: PageProps) {
  const bookingId = searchParams.bookingId;

  if (!bookingId) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.25rem' }}>
          Ciclo di vita prenotazione
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.92)', marginBottom: '1.5rem' }}>
          Visualizza lo stato e lo storico di una prenotazione.
        </p>
        <p style={{ color: 'rgba(203, 213, 225, 0.92)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          È necessario indicare l&apos;ID di una prenotazione (es. tramite link dalla lista prenotazioni).
        </p>
        <Link
          href="/instructor/bookings"
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            borderRadius: 6,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            color: '#7dd3fc',
            fontWeight: 600,
            textDecoration: 'none',
            border: '1px solid rgba(59, 130, 246, 0.4)',
          }}
        >
          Vai alle prenotazioni
        </Link>
      </div>
    );
  }

  let data = EMPTY_LIFECYCLE;
  let loadFailed = false;
  let notFound = false;

  try {
    data = await fetchBookingLifecycleByIdServer(bookingId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'UNAUTHORIZED') {
      return <meta httpEquiv="refresh" content="0;url=/instructor/login" />;
    }
    if (message === 'BOOKING_NOT_FOUND') {
      notFound = true;
    } else {
      loadFailed = true;
    }
  }

  if (notFound) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.25rem' }}>
          Ciclo di vita prenotazione
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.92)', marginBottom: '1.5rem' }}>
          Prenotazione non trovata.
        </p>
        <Link
          href="/instructor/bookings"
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            borderRadius: 6,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            color: '#7dd3fc',
            fontWeight: 600,
            textDecoration: 'none',
            border: '1px solid rgba(59, 130, 246, 0.4)',
          }}
        >
          Vai alle prenotazioni
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.25rem' }}>
        Ciclo di vita prenotazione
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.92)', marginBottom: '1.5rem' }}>
        Stato e storico per la prenotazione selezionata.
      </p>
      {loadFailed && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          backgroundColor: 'rgba(185, 28, 28, 0.2)',
          border: '1px solid rgba(248, 113, 113, 0.5)',
          borderRadius: 8,
          fontSize: '0.875rem',
          color: '#fca5a5',
        }}>
          Impossibile caricare il ciclo di vita.{' '}
          <Link
            href={`/instructor/booking-lifecycle?bookingId=${bookingId}`}
            style={{ color: '#7dd3fc', textDecoration: 'underline', fontWeight: 600 }}
          >
            Riprova
          </Link>
        </div>
      )}
      {data.booking && <BookingLifecycleHeader booking={data.booking} />}
      <BookingLifecycleTimeline auditLog={data.auditLog ?? []} />
    </div>
  );
}
