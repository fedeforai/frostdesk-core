import type { WhatsappInboundRaw } from '@/lib/adminApi';

interface WhatsappInboundTableProps {
  items: WhatsappInboundRaw[];
}

export default function WhatsappInboundTable({ items }: WhatsappInboundTableProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
              Received At
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
              Sender ID
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
              Message ID
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
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
              <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(226, 232, 240, 0.95)' }}>
                  {item.received_at}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(226, 232, 240, 0.95)' }}>
                  {item.sender_id ?? '-'}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(226, 232, 240, 0.95)' }}>
                  {item.message_id ?? '-'}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(226, 232, 240, 0.95)' }}>
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
