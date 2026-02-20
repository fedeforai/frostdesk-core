import { BookingsSection } from '@/components/bookings/BookingsSection';

const pageStyles = {
  wrap: {
    maxWidth: 1200,
    margin: '0 auto',
  } as const,
  title: {
    fontSize: '1.5rem',
    fontWeight: 800,
    margin: '0 0 0.25rem',
    color: 'rgba(226, 232, 240, 0.95)',
  } as const,
  subtitle: {
    fontSize: '0.875rem',
    color: 'rgba(148, 163, 184, 0.92)',
    marginBottom: '1.5rem',
  } as const,
};

export default function InstructorBookingsPage() {
  return (
    <div style={pageStyles.wrap}>
      <h1 style={pageStyles.title}>Bookings</h1>
      <p style={pageStyles.subtitle}>
        Create, edit and manage lessons. Change status or cancel from the table.
      </p>
      <BookingsSection />
    </div>
  );
}
