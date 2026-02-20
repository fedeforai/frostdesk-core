import { BookingForm } from '@/components/bookings/BookingForm';

export default function NewBookingPage() {
  return (
    <div
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '2rem 1.5rem 4rem',
      }}
    >
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
          Create booking
        </h1>
        <p
          style={{
            fontSize: '0.95rem',
            color: 'rgba(148, 163, 184, 0.9)',
          }}
        >
          Create a draft booking. Generate a payment link after creation.
        </p>
      </header>

      <BookingForm />
    </div>
  );
}
