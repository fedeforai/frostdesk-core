import { fetchInstructorBookingAuditLogs } from "@/lib/instructorApi"
import { BookingAuditLogsTable } from "@/components/bookings/BookingAuditLogsTable"

export default async function BookingAuditLogsPage() {
  try {
    const items = await fetchInstructorBookingAuditLogs()

    return (
      <section>
        <h1>Booking Audit Logs</h1>
        <BookingAuditLogsTable items={items} />
      </section>
    )
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return <meta httpEquiv="refresh" content="0;url=/login" />
    }

    return <p>Unable to load booking audit logs.</p>
  }
}
