'use client';

import type { InstructorService } from '@/lib/instructorApi';

const LESSON_TYPE_LABELS: Record<string, string> = {
  private: 'Private',
  semi_private: 'Semi-private',
  group: 'Group',
};

interface ServicesTableProps {
  services: InstructorService[];
  onEdit: (service: InstructorService) => void;
  onAdd: () => void;
}

const thStyle = { padding: '0.75rem', textAlign: 'left' as const, border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: 600, fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' };
const tdStyle = { padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.06)', color: 'rgba(226, 232, 240, 0.95)' };

export default function ServicesTable({ services, onEdit, onAdd }: ServicesTableProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.95)' }}>
          Services
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
            fontWeight: 500,
            outline: 'none',
          }}
          onFocus={(e) => { e.currentTarget.style.outline = '2px solid #3b82f6'; e.currentTarget.style.outlineOffset = '2px'; }}
          onBlur={(e) => { e.currentTarget.style.outline = 'none'; }}
          aria-label="Add service"
        >
          Add service
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table role="table" aria-label="Services list" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Duration</th>
              <th style={thStyle}>Participants</th>
              <th style={thStyle}>Price</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'rgba(148, 163, 184, 0.9)' }}>
                  No services yet. Click &quot;Add service&quot; to create one.
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr
                  key={service.id}
                  role="row"
                  style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <td style={tdStyle}>
                    {service.name && service.name.trim() ? service.name : service.discipline}
                  </td>
                  <td style={tdStyle}>
                    {service.lesson_type ? LESSON_TYPE_LABELS[service.lesson_type] ?? service.lesson_type : '—'}
                  </td>
                  <td style={tdStyle}>
                    {service.location && service.location.trim() ? service.location : '—'}
                  </td>
                  <td style={tdStyle}>
                    {service.duration_minutes >= 60 ? `${service.duration_minutes / 60} h` : `${service.duration_minutes} min`}
                  </td>
                  <td style={tdStyle}>
                    {service.min_participants != null && service.max_participants != null
                      ? service.min_participants === service.max_participants
                        ? String(service.min_participants)
                        : `${service.min_participants}–${service.max_participants}`
                      : '—'}
                  </td>
                  <td style={tdStyle}>
                    {service.price_amount} {service.currency}
                  </td>
                  <td style={tdStyle}>
                    {service.is_active ? 'Active' : 'Hidden'}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <button
                      type="button"
                      onClick={() => onEdit(service)}
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
                      onFocus={(e) => { e.currentTarget.style.outline = '2px solid #3b82f6'; e.currentTarget.style.outlineOffset = '2px'; }}
                      onBlur={(e) => { e.currentTarget.style.outline = 'none'; }}
                      aria-label={`Edit ${service.name || service.discipline}`}
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
