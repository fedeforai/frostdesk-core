import { fetchInstructorDashboard } from "@/lib/instructorApi";

import { DashboardInstructorProfile } from "@/components/dashboard/DashboardInstructorProfile";
import { DashboardServices } from "@/components/dashboard/DashboardServices";
import { DashboardMeetingPoints } from "@/components/dashboard/DashboardMeetingPoints";
import { DashboardPolicies } from "@/components/dashboard/DashboardPolicies";
import { DashboardAvailability } from "@/components/dashboard/DashboardAvailability";
import { DashboardCalendarStatus } from "@/components/dashboard/DashboardCalendarStatus";
import { DashboardUpcomingBookings } from "@/components/dashboard/DashboardUpcomingBookings";

export default async function InstructorDashboardPage() {
  try {
    const data = await fetchInstructorDashboard();

    return (
      <main>
        <h1>Instructor Dashboard</h1>

        <DashboardInstructorProfile instructor={data.instructor} />

        <DashboardServices services={data.services} />

        <DashboardMeetingPoints points={data.meetingPoints} />

        <DashboardPolicies policies={data.policies} />

        <DashboardAvailability availability={data.availability} />

        <DashboardCalendarStatus calendar={data.calendar || { connected: false, calendarId: null, lastSyncAt: null }} />

        <DashboardUpcomingBookings bookings={data.upcomingBookings} />
      </main>
    );
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return (
        <meta httpEquiv="refresh" content="0; url=/login" />
      );
    }

    if (error?.message === "FAILED_TO_LOAD_DASHBOARD") {
      return <p>Unable to load dashboard.</p>;
    }

    return <p>Unexpected error.</p>;
  }
}
