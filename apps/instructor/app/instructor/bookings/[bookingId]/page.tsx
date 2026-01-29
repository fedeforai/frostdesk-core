import { fetchInstructorBooking } from "@/lib/instructorApi"
import { BookingDetail } from "@/components/bookings/BookingDetail"

type PageProps = {
  params: { bookingId: string }
}

export default async function BookingDetailPage({ params }: PageProps) {
  try {
    const booking = await fetchInstructorBooking(params.bookingId)

    return (
      <section>
        <h1>Booking</h1>
        <BookingDetail booking={booking} />
      </section>
    )
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return <meta httpEquiv="refresh" content="0; url=/login" />
    }

    if (err.message === "NOT_FOUND") {
      return <p>Booking not found.</p>
    }

    return <p>Unable to load booking.</p>
  }
}
