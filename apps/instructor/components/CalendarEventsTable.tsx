'use client';

import type { CalendarEvent } from '@/lib/instructorApi';

interface CalendarEventsTableProps {
  events: CalendarEvent[];
}

export default function CalendarEventsTable({ events }: CalendarEventsTableProps) {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
        Calendar Events
      </h2>

      <div style={{ overflowX: 'auto' }}>
        <table
          role="table"
          aria-label="Calendar events list"
          style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                Start
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                End
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                Title
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                All day
              </th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No calendar events found.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr
                  key={event.id}
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
                    {event.is_all_day ? formatDate(event.start_at) : formatDateTime(event.start_at)}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {event.is_all_day ? formatDate(event.end_at) : formatDateTime(event.end_at)}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {event.title || '(No title)'}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {event.is_all_day ? 'Yes' : 'No'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
