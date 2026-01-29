import type { ChannelIdentityMapping } from '@/lib/adminApi';

interface ChannelIdentityMappingTableProps {
  mappings: ChannelIdentityMapping[];
}

/**
 * READ-ONLY table for channel identity mappings.
 * 
 * WHAT IT DOES:
 * - Displays channel, external_identity, conversation_id, first_seen_at, last_seen_at
 * - Pure presentation component
 * 
 * WHAT IT DOES NOT DO:
 * - No create
 * - No edit
 * - No delete
 * - No buttons
 * - No inline actions
 * - No mutations
 */
export default function ChannelIdentityMappingTable({ mappings }: ChannelIdentityMappingTableProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ 
        padding: '1rem', 
        backgroundColor: '#fef3c7', 
        border: '1px solid #fbbf24', 
        borderRadius: '0.5rem', 
        marginBottom: '1rem',
        color: '#92400e',
        fontSize: '0.875rem'
      }}>
        <strong>OBSERVABILITY ONLY</strong> — This table is READ-ONLY. No mutations allowed.
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Channel
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              External Identity
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Conversation ID
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              First Seen At
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Last Seen At
            </th>
          </tr>
        </thead>
        <tbody>
          {mappings.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                No channel identity mappings found.
              </td>
            </tr>
          ) : (
            mappings.map((mapping) => (
              <tr key={mapping.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', color: '#111827' }}>
                  {mapping.channel}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', color: '#111827', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                  {mapping.external_identity}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', color: '#111827', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                  {mapping.conversation_id}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', color: '#111827' }}>
                  {mapping.first_seen_at}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', color: '#111827' }}>
                  {mapping.last_seen_at}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
