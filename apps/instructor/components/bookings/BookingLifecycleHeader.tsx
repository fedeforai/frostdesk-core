export function BookingLifecycleHeader({ booking }: { booking: any | null }) {
  if (booking === null) {
    return <p>Booking not found</p>;
  }

  return (
    <section>
      <h2>Booking Lifecycle</h2>
      <p>
        <strong>Booking ID:</strong> {booking.id}
      </p>
      <p>
        <strong>Instructor ID:</strong> {booking.instructor_id}
      </p>
      <p>
        <strong>Start Time:</strong> {booking.start_time}
      </p>
      <p>
        <strong>End Time:</strong> {booking.end_time}
      </p>
    </section>
  );
}
