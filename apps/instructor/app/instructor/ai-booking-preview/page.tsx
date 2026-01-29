import { fetchAIBookingSuggestionContext } from "@/lib/instructorApi";
import { AIBookingAvailabilityPreview } from "@/components/ai-booking-preview/AIBookingAvailabilityPreview";
import { AIBookingBusySlotsPreview } from "@/components/ai-booking-preview/AIBookingBusySlotsPreview";
import { AIBookingRecentBookingsPreview } from "@/components/ai-booking-preview/AIBookingRecentBookingsPreview";

export default async function AIBookingPreviewPage() {
  try {
    const data = await fetchAIBookingSuggestionContext();

    return (
      <section>
        <h1>AI Booking Context Preview</h1>

        <section>
          <h2>Availability (AI Context)</h2>
          <AIBookingAvailabilityPreview availability={data.availability} />
        </section>

        <section>
          <h2>Busy Slots (Calendar Cache)</h2>
          <AIBookingBusySlotsPreview busySlots={data.busySlots} />
        </section>

        <section>
          <h2>Recent Bookings (Context)</h2>
          <AIBookingRecentBookingsPreview recentBookings={data.recentBookings} />
        </section>
      </section>
    );
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return <meta httpEquiv="refresh" content="0; url=/login" />;
    }

    return <p>Unable to load AI booking context.</p>;
  }
}
