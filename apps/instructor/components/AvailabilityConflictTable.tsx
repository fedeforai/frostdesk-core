'use client';

import type { AvailabilityCalendarConflict } from '@/lib/instructorApi';

interface AvailabilityConflictTableProps {
  conflicts: AvailabilityCalendarConflict[];
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AvailabilityConflictTable({ conflicts }: AvailabilityConflictTableProps) {
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

  const formatTime = (timeString: string) => {
    // timeString is in format "HH:MM:SS" or "HH:MM"
    const parts = timeString.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1] || '00';
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes} ${period}`;
  };

  const getDayName = (dayOfWeek: number) => {
    return DAY_NAMES[dayOfWeek] || `Day ${dayOfWeek}`;
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1rem' }}>
        Availability Conflicts
      </h2>

      <div style={{ overflowX: 'auto' }}>
        <table
          role="table"
          aria-label="Availability conflicts list"
          style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid rgba(255, 255, 255, 0.08)' }}
        >
          <thead>
            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
                Availability day
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
                Availability start
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
                Availability end
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
                Calendar event start
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
                Calendar event end
              </th>
            </tr>
          </thead>
          <tbody>
            {conflicts.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'rgba(148, 163, 184, 0.9)' }}>
                  No conflicts found.
                </td>
              </tr>
            ) : (
              conflicts.map((conflict, index) => (
                <tr
                  key={`${conflict.availability_id}-${conflict.calendar_event_id}-${index}`}
                  role="row"
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.06)', color: 'rgba(226, 232, 240, 0.95)' }}>
                    {getDayName(conflict.availability_day_of_week)}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.06)', color: 'rgba(226, 232, 240, 0.95)' }}>
                    {formatTime(conflict.availability_start_time)}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.06)', color: 'rgba(226, 232, 240, 0.95)' }}>
                    {formatTime(conflict.availability_end_time)}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.06)', color: 'rgba(226, 232, 240, 0.95)' }}>
                    {conflict.calendar_event_is_all_day ? 'All day' : formatDateTime(conflict.calendar_event_start_at)}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.06)', color: 'rgba(226, 232, 240, 0.95)' }}>
                    {conflict.calendar_event_is_all_day ? 'All day' : formatDateTime(conflict.calendar_event_end_at)}
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
