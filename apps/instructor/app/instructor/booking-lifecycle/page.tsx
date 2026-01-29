import { fetchBookingLifecycleById } from "@/lib/instructorApi"
import { BookingLifecycleHeader } from "@/components/bookings/BookingLifecycleHeader"
import { BookingLifecycleTimeline } from "@/components/bookings/BookingLifecycleTimeline"

/**
 * FORBIDDEN BEHAVIOR VERIFICATION CHECKLIST
 * 
 * ✅ NO POST / PUT / DELETE - Only GET via fetchBookingLifecycleById
 * ✅ NO createBooking - Not imported or called
 * ✅ NO updateBooking - Not imported or called
 * ✅ NO confirmBooking - Not imported or called
 * ✅ NO mutations of any kind - Read-only data flow
 * ✅ NO AI calls - No AI-related imports or calls
 * ✅ NO availability logic - No availability imports or logic
 * ✅ NO phase inference - No state derivation or phase detection
 * ✅ NO status labeling - Raw status display only
 * ✅ NO buttons or click handlers - Pure presentation components
 * ✅ NO side effects - Server component, no client-side effects
 * ✅ NO logging - No console.log or logging calls
 * 
 * VERIFIED: 2026-01-23
 * This page is READ-ONLY observability only.
 */

type PageProps = {
  searchParams: { bookingId?: string }
}

export default async function BookingLifecyclePage({ searchParams }: PageProps) {
  const bookingId = searchParams.bookingId

  if (!bookingId) {
    return <p>Booking ID is required.</p>
  }

  try {
    const data = await fetchBookingLifecycleById(bookingId)

    return (
      <section>
        <h1>Booking Lifecycle</h1>
        <BookingLifecycleHeader booking={data.booking} />
        <BookingLifecycleTimeline auditLog={data.auditLog} />
      </section>
    )
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return <meta httpEquiv="refresh" content="0;url=/login" />
    }

    if (err.message === "BOOKING_NOT_FOUND") {
      return <p>Booking not found.</p>
    }

    return <p>Unable to load booking lifecycle.</p>
  }
}
