import { fetchAdminBookings } from '@/lib/adminApi';
import BookingsTable from '@/components/admin/BookingsTable';
import Breadcrumbs from '@/components/admin/Breadcrumbs';

interface BookingsPageProps {
  searchParams: {
    limit?: string;
    offset?: string;
    status?: string;
    instructorId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  const limit = searchParams.limit ? Number(searchParams.limit) : 50;
  const offset = searchParams.offset ? Number(searchParams.offset) : 0;
  const status = searchParams.status;
  const instructorId = searchParams.instructorId;
  const dateFrom = searchParams.dateFrom;
  const dateTo = searchParams.dateTo;

  // UI-ONLY / DEMO-SAFE MODE: Graceful fallback when API unavailable
  let bookingsData = null;

  try {
    bookingsData = await fetchAdminBookings({
      limit,
      offset,
      status,
      instructorId,
      dateFrom,
      dateTo,
    });
  } catch (error) {
    console.warn('[ADMIN BOOKINGS] API unavailable, using fallback data');
  }

  // Fallback data (read-only, realistic for demo)
  // Using valid UUIDs for conversation_id (generated once for consistency)
  const fallbackBookings = [
    {
      booking_id: 'booking-001',
      conversation_id: '550e8400-e29b-41d4-a716-446655440001',
      instructor_id: 'instructor-001',
      instructor_name: 'Marco Rossi',
      status: 'confirmed',
      service_name: 'Ski Lesson - Beginner',
      student_name: 'John Doe',
      scheduled_at: new Date(Date.now() + 86400000).toISOString(),
      created_at: new Date(Date.now() - 172800000).toISOString(),
      total_amount: 12000,
      currency: 'EUR',
    },
    {
      booking_id: 'booking-002',
      conversation_id: '550e8400-e29b-41d4-a716-446655440002',
      instructor_id: 'instructor-002',
      instructor_name: 'Laura Bianchi',
      status: 'proposed',
      service_name: 'Snowboard Lesson - Intermediate',
      student_name: 'Jane Smith',
      scheduled_at: new Date(Date.now() + 259200000).toISOString(),
      created_at: new Date(Date.now() - 86400000).toISOString(),
      total_amount: 15000,
      currency: 'EUR',
    },
    {
      booking_id: 'booking-003',
      conversation_id: '550e8400-e29b-41d4-a716-446655440003',
      instructor_id: 'instructor-001',
      instructor_name: 'Marco Rossi',
      status: 'cancelled',
      service_name: 'Ski Lesson - Advanced',
      student_name: 'Bob Johnson',
      scheduled_at: new Date(Date.now() - 86400000).toISOString(),
      created_at: new Date(Date.now() - 259200000).toISOString(),
      total_amount: 18000,
      currency: 'EUR',
    },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumbs items={[
        { label: 'Admin', href: '/admin' },
        { label: 'Bookings' },
      ]} />
      <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
        Bookings
      </h1>
      <BookingsTable bookings={bookingsData?.items ?? fallbackBookings} />
    </div>
  );
}
