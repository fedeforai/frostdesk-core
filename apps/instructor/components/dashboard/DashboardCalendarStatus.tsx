type Calendar = {
  connected: boolean;
  calendarId: string | null;
  lastSyncAt: string | null;
};

export function DashboardCalendarStatus({ calendar }: { calendar: Calendar }) {
  return (
    <section>
      <h3>Calendar</h3>
      <p>Status: {calendar.connected ? "Connected" : "Not connected"}</p>
      {calendar.calendarId && <p>Calendar ID: {calendar.calendarId}</p>}
      {calendar.lastSyncAt && <p>Last sync: {calendar.lastSyncAt}</p>}
    </section>
  );
}
