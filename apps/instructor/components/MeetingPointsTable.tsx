'use client';

import type { InstructorMeetingPoint } from '@/lib/instructorApi';

interface MeetingPointsTableProps {
  meetingPoints: InstructorMeetingPoint[];
  onEdit: (meetingPoint: InstructorMeetingPoint) => void;
  onAdd: () => void;
}

export default function MeetingPointsTable({ meetingPoints, onEdit, onAdd }: MeetingPointsTableProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
          Meeting Points
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
          aria-label="Add meeting point"
        >
          Add meeting point
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table
          role="table"
          aria-label="Meeting points list"
          style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid rgba(255, 255, 255, 0.08)' }}
        >
          <thead>
            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
                Name
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
                Description
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
                Default
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
                Active
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {meetingPoints.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'rgba(148, 163, 184, 0.9)' }}>
                  No meeting points yet. Click &quot;Add meeting point&quot; to create one.
                </td>
              </tr>
            ) : (
              meetingPoints.map((point) => (
                <tr
                  key={point.id}
                  role="row"
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.06)', color: 'rgba(226, 232, 240, 0.95)' }}>
                    {point.name}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.06)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(226, 232, 240, 0.95)' }}>
                    {point.description}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.06)', color: 'rgba(226, 232, 240, 0.95)' }}>
                    {point.is_default ? (
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        color: '#1e40af',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                      }}>
                        Default
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.06)', color: 'rgba(226, 232, 240, 0.95)' }}>
                    {point.is_active ? 'Yes' : 'No'}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <button
                      type="button"
                      onClick={() => onEdit(point)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        color: 'rgba(148, 163, 184, 0.9)',
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
                      aria-label={`Edit meeting point ${point.name}`}
                    >
                      Edit
                    </button>
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
