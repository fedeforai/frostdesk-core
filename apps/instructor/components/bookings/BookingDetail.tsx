type BookingDetailProps = {
  booking: {
    id: string
    customer_name: string | null
    start_time: string
    end_time: string
    status: string
    notes: string | null
  }
}

export function BookingDetail({ booking }: BookingDetailProps) {
  return (
    <section>
      <h2>Booking details</h2>

      <p>
        <strong>Customer:</strong>{" "}
        {booking.customer_name ?? "-"}
      </p>

      <p>
        <strong>Start:</strong>{" "}
        {booking.start_time}
      </p>

      <p>
        <strong>End:</strong>{" "}
        {booking.end_time}
      </p>

      <p>
        <strong>Status:</strong>{" "}
        {booking.status}
      </p>

      <p>
        <strong>Notes:</strong>{" "}
        {booking.notes ?? "-"}
      </p>
    </section>
  )
}
