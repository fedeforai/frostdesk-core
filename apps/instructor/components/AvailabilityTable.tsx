'use client';

import type { InstructorAvailability, InstructorMeetingPoint } from '@/lib/instructorApi';

const DAY_LABELS: Record<number, string> = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
};

interface AvailabilityTableProps {
  availability: InstructorAvailability[];
  meetingPoints?: InstructorMeetingPoint[];
  onEdit: (availability: InstructorAvailability) => void;
  onDeactivate: (availability: InstructorAvailability) => void;
  onAdd: () => void;
}

export default function AvailabilityTable({ availability, meetingPoints = [], onEdit, onDeactivate, onAdd }: AvailabilityTableProps) {
  const getLocationLabel = (meetingPointId: string | null | undefined) => {
    if (meetingPointId == null) return 'All';
    const mp = meetingPoints.find((m) => m.id === meetingPointId);
    return mp?.name ?? meetingPointId.slice(0, 8);
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
          Availability
        </h2>
        <button
          type="button"
          onClick={onAdd}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #3b82f6';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          aria-label="Add availability"
        >
          Add availability
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table
          role="table"
          aria-label="Availability list"
          style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid rgba(255, 255, 255, 0.08)' }}
        >
          <thead>
            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
                Day of week
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
                Start time
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
                End time
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
                Location
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }} title="If off, this window is hidden from booking but not deleted">
                Active
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {availability.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'rgba(148, 163, 184, 0.9)' }}>
                  No availability windows yet. Click &quot;Add availability&quot; to create one (e.g. Mon–Fri 09:00–17:00).
                </td>
              </tr>
            ) : (
              availability.map((item) => (
                <tr
                  key={item.id}
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
                    {DAY_LABELS[item.day_of_week] ?? item.day_of_week}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.08)', fontFamily: 'monospace', color: 'rgba(226, 232, 240, 0.95)' }}>
                    {item.start_time}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.08)', fontFamily: 'monospace', color: 'rgba(226, 232, 240, 0.95)' }}>
                    {item.end_time}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.06)', color: 'rgba(148, 163, 184, 0.95)' }}>
                    {getLocationLabel(item.meeting_point_id)}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.06)', color: 'rgba(226, 232, 240, 0.95)' }}>
                    {item.is_active ? 'YES' : 'NO'}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          color: 'rgba(226, 232, 240, 0.95)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          outline: 'none',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.outline = '2px solid #3b82f6';
                          e.currentTarget.style.outlineOffset = '2px';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.outline = 'none';
                        }}
                        aria-label="Edit availability"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeactivate(item)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          color: 'rgba(226, 232, 240, 0.95)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          outline: 'none',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.outline = '2px solid #3b82f6';
                          e.currentTarget.style.outlineOffset = '2px';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.outline = 'none';
                        }}
                        aria-label="Deactivate availability"
                      >
                        Deactivate
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.7)' }}>
        Active: when off, the window is not offered for new bookings but is kept so you can turn it back on.
      </p>
    </div>
  );
}
