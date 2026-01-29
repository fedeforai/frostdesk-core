type Slot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

export function DashboardAvailability({ availability }: { availability: Slot[] }) {
  return (
    <section>
      <h3>Availability</h3>
      {availability.length === 0 && <p>No availability defined.</p>}
      <ul>
        {availability.map(a => (
          <li key={a.id}>
            Day {a.day_of_week} — {a.start_time} to {a.end_time} ({a.is_active ? "active" : "inactive"})
          </li>
        ))}
      </ul>
    </section>
  );
}
