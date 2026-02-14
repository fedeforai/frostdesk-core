import type { BookingAuditLogRow } from '@/lib/instructorApi';

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.875rem',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontWeight: 600,
  color: 'rgba(226, 232, 240, 0.95)',
  backgroundColor: 'rgba(51, 65, 85, 0.5)',
  borderBottom: '1px solid rgba(71, 85, 105, 0.6)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  color: 'rgba(203, 213, 225, 0.92)',
  borderBottom: '1px solid rgba(71, 85, 105, 0.4)',
};

export function BookingAuditLogsTable({ items }: { items: BookingAuditLogRow[] }) {
  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={thStyle}>Data</th>
          <th style={thStyle}>Azione</th>
          <th style={thStyle}>ID prenotazione</th>
          <th style={thStyle}>ID richiesta</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr>
            <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: 'rgba(148, 163, 184, 0.92)', padding: '2rem' }}>
              Nessun log di audit.
            </td>
          </tr>
        ) : (
          items.map((item) => (
            <tr key={item.id}>
              <td style={tdStyle}>{formatDate(item.created_at)}</td>
              <td style={tdStyle}>{item.action}</td>
              <td style={tdStyle}>{item.booking_id ?? '—'}</td>
              <td style={tdStyle}>{item.request_id}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
