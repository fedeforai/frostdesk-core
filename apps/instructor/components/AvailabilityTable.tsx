'use client';

import type { InstructorAvailability } from '@/lib/instructorApi';

interface AvailabilityTableProps {
  availability: InstructorAvailability[];
  onEdit: (availability: InstructorAvailability) => void;
  onDeactivate: (availability: InstructorAvailability) => void;
  onAdd: () => void;
}

export default function AvailabilityTable({ availability, onEdit, onDeactivate, onAdd }: AvailabilityTableProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>
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
          style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                Day of week
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                Start time
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                End time
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                Active
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {availability.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No availability windows yet. Click "Add availability" to create one.
                </td>
              </tr>
            ) : (
              availability.map((item) => (
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
                    {item.day_of_week}
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
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          border: '1px solid #d1d5db',
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
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          border: '1px solid #d1d5db',
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
    </div>
  );
}
