import { fetchInstructorBookings } from "@/lib/instructorApi"
import { BookingsTable } from "@/components/bookings/BookingsTable"

export default async function InstructorBookingsPage() {
  try {
    const data = await fetchInstructorBookings()

    return (
      <section>
        <h1>Bookings</h1>
        <BookingsTable items={data.items} />
      </section>
    )
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return <meta httpEquiv="refresh" content="0;url=/login" />
    }

    return <p>Unable to load bookings.</p>
  }
}
