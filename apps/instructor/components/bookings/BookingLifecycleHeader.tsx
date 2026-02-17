export function BookingLifecycleHeader({ booking }: { booking: any | null }) {
  if (booking === null) {
    return <p style={{ color: 'rgba(148, 163, 184, 0.92)' }}>Booking not found</p>;
  }

  const labelStyle: React.CSSProperties = { fontWeight: 600, color: 'rgba(226, 232, 240, 0.95)', marginRight: '0.5rem' };
  const valueStyle: React.CSSProperties = { color: 'rgba(203, 213, 225, 0.92)' };
  const rowStyle: React.CSSProperties = { marginBottom: '0.35rem', fontSize: '0.875rem' };

  return (
    <section style={{
      border: '1px solid rgba(71, 85, 105, 0.5)',
      borderRadius: 8,
      backgroundColor: 'rgba(30, 41, 59, 0.4)',
      padding: '1.25rem 1.5rem',
      marginBottom: '1.5rem',
    }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.75rem' }}>
        Booking detail
      </h2>
      <p style={rowStyle}>
        <span style={labelStyle}>Booking ID:</span>
        <code style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#7dd3fc', background: 'rgba(15, 23, 42, 0.5)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>
          {booking.id}
        </code>
      </p>
      <p style={rowStyle}>
        <span style={labelStyle}>Status:</span>
        <span style={{
          display: 'inline-block',
          padding: '0.15rem 0.5rem',
          borderRadius: 4,
          fontSize: '0.8125rem',
          fontWeight: 600,
          ...(booking.status === 'confirmed'
            ? { background: 'rgba(34, 197, 94, 0.2)', color: '#86efac' }
            : booking.status === 'cancelled' || booking.status === 'declined'
              ? { background: 'rgba(185, 28, 28, 0.2)', color: '#fca5a5' }
              : { background: 'rgba(148, 163, 184, 0.15)', color: 'rgba(203, 213, 225, 0.92)' }),
        }}>
          {booking.status}
        </span>
      </p>
      <p style={rowStyle}>
        <span style={labelStyle}>Inizio:</span>
        <span style={valueStyle}>{booking.start_time}</span>
      </p>
      <p style={rowStyle}>
        <span style={labelStyle}>Fine:</span>
        <span style={valueStyle}>{booking.end_time}</span>
      </p>
    </section>
  );
}
