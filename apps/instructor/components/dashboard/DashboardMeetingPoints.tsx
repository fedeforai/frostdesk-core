type MeetingPoint = {
  id: string;
  name: string;
  address: string | null;
  is_default: boolean;
};

export function DashboardMeetingPoints({ points }: { points: MeetingPoint[] }) {
  return (
    <section>
      <h3>Meeting Points</h3>
      {points.length === 0 && <p>No meeting points.</p>}
      <ul>
        {points.map(p => (
          <li key={p.id}>
            {p.name} — {p.address || '(no address)'} {p.is_default && "(default)"}
          </li>
        ))}
      </ul>
    </section>
  );
}
