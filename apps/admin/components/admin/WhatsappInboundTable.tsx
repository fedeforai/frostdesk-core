import type { WhatsappInboundRaw } from '@/lib/adminApi';

interface WhatsappInboundTableProps {
  items: WhatsappInboundRaw[];
}

export default function WhatsappInboundTable({ items }: WhatsappInboundTableProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Received At
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Sender ID
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Message ID
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Signature Valid
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                No WhatsApp inbound messages found.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', color: '#111827' }}>
                  {item.received_at}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', color: '#111827' }}>
                  {item.sender_id ?? '-'}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', color: '#111827' }}>
                  {item.message_id ?? '-'}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', color: '#111827' }}>
                  {item.signature_valid ? 'Yes' : 'No'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
