type Booking = {
  id: string;
  start_time: string;
  end_time: string;
  customer_name: string | null;
  status: string;
};

export function DashboardUpcomingBookings({ bookings }: { bookings: Booking[] }) {
  return (
    <section>
      <h3>Upcoming bookings</h3>
      {bookings.length === 0 && <p>No upcoming bookings.</p>}
      <ul>
        {bookings.map(b => (
          <li key={b.id}>
            {b.customer_name || '(no name)'} — {b.start_time} → {b.end_time} ({b.status})
          </li>
        ))}
      </ul>
    </section>
  );
}
