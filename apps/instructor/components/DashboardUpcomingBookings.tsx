import type { DashboardBooking } from '@/lib/instructorApi';

interface DashboardUpcomingBookingsProps {
  bookings: DashboardBooking[];
}

const thStyle: React.CSSProperties = {
  padding: '0.75rem',
  textAlign: 'left',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  fontWeight: 600,
  fontSize: '0.875rem',
  color: 'rgba(148, 163, 184, 0.9)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  color: 'rgba(226, 232, 240, 0.95)',
};

export default function DashboardUpcomingBookings({ bookings }: DashboardUpcomingBookingsProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  return (
    <div style={{
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '24px',
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
    }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1rem' }}>
        Upcoming Bookings
      </h2>
      {bookings.length === 0 ? (
        <p style={{ color: 'rgba(148, 163, 184, 0.9)' }}>No upcoming bookings.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            role="table"
            aria-label="Upcoming bookings list"
            style={{ width: '100%', borderCollapse: 'collapse' }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Service</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr
                  key={booking.id}
                  role="row"
                  style={{ transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={tdStyle}>{formatDate(booking.date)}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{formatTime(booking.time)}</td>
                  <td style={tdStyle}>{booking.conversation_id.substring(0, 8)}...</td>
                  <td style={tdStyle}>{booking.duration} min</td>
                  <td style={tdStyle}>{booking.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
