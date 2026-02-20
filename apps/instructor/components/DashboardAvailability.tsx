import type { InstructorAvailability } from '@/lib/instructorApi';

interface DashboardAvailabilityProps {
  availability: InstructorAvailability[];
}

const dayLabels: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export default function DashboardAvailability({ availability }: DashboardAvailabilityProps) {
  return (
    <div style={{
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1rem' }}>
        Availability
      </h2>
      {availability.length === 0 ? (
        <p style={{ color: 'rgba(148, 163, 184, 0.9)' }}>No availability configured.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            role="table"
            aria-label="Availability list"
            style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid rgba(255, 255, 255, 0.1)' }}
          >
            <thead>
              <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.95)' }}>
                  Giorno
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.95)' }}>
                  Start
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.95)' }}>
                  End
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.95)' }}>
                  is_active
                </th>
              </tr>
            </thead>
            <tbody>
              {availability.map((item) => (
                <tr
                  key={item.id}
                  role="row"
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {dayLabels[item.day_of_week] || `Day ${item.day_of_week}`}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)', fontFamily: 'monospace' }}>
                    {item.start_time}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)', fontFamily: 'monospace' }}>
                    {item.end_time}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {item.is_active ? 'YES' : 'NO'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
