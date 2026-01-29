'use client';

import type { InstructorService } from '@/lib/instructorApi';

interface ServicesTableProps {
  services: InstructorService[];
  onEdit: (service: InstructorService) => void;
  onAdd: () => void;
}

export default function ServicesTable({ services, onEdit, onAdd }: ServicesTableProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>
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
          aria-label="Add service"
        >
          Add service
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table
          role="table"
          aria-label="Services list"
          style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                Discipline
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                Duration
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                Price
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                Currency
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
            {services.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No services yet. Click "Add service" to create one.
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr
                  key={service.id}
                  role="row"
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {service.discipline}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {service.duration_minutes} min
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {service.price_amount}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {service.currency}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {service.is_active ? 'Yes' : 'No'}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    <button
                      type="button"
                      onClick={() => onEdit(service)}
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
                      aria-label={`Edit service ${service.discipline}`}
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
