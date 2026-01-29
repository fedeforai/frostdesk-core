import type { InstructorService } from '@/lib/instructorApi';

interface DashboardServicesProps {
  services: InstructorService[];
}

export default function DashboardServices({ services }: DashboardServicesProps) {
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
        Services
      </h2>
      {services.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No services configured.</p>
      ) : (
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
                  Durata
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                  Prezzo
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                  Stato
                </th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr
                  key={service.id}
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
                    {service.discipline}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {service.duration_minutes} min
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {service.price_amount} {service.currency}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {service.is_active ? 'Attivo' : 'Non attivo'}
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
