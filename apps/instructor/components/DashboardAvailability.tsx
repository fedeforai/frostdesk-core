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
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
        Availability
      </h2>
      {availability.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No availability configured.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            role="table"
            aria-label="Availability list"
            style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                  Giorno
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                  Start
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                  End
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
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
                    borderBottom: '1px solid #e5e7eb',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {dayLabels[item.day_of_week] || `Day ${item.day_of_week}`}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontFamily: 'monospace' }}>
                    {item.start_time}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontFamily: 'monospace' }}>
                    {item.end_time}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
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
