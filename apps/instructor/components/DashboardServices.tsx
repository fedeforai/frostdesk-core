import type { InstructorService } from '@/lib/instructorApi';

interface DashboardServicesProps {
  services: InstructorService[];
}

export default function DashboardServices({ services }: DashboardServicesProps) {
  return (
    <div style={{
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1rem' }}>
        Services
      </h2>
      {services.length === 0 ? (
        <p style={{ color: 'rgba(148, 163, 184, 0.9)' }}>No services configured.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            role="table"
            aria-label="Services list"
            style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid rgba(255, 255, 255, 0.1)' }}
          >
            <thead>
              <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.95)' }}>
                  Discipline
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.95)' }}>
                  Durata
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.95)' }}>
                  Prezzo
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.95)' }}>
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
                    {service.discipline}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {service.duration_minutes} min
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {service.price_amount} {service.currency}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
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
