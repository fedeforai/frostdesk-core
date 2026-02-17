import type { InboundMessage } from '@/lib/adminApi';

interface InboundMessagesTableProps {
  messages: InboundMessage[];
}

/**
 * READ-ONLY table for inbound messages.
 * 
 * WHAT IT DOES:
 * - Displays channel, conversation_id, external_message_id, sender_identity, message_type, message_text, received_at, created_at
 * - Pure presentation component
 * - Shows messages in chronological order
 * 
 * WHAT IT DOES NOT DO:
 * - No create
 * - No edit
 * - No delete
 * - No resend
 * - No reply
 * - No routing
 * - No AI
 * - No automation
 * - No side effects
 * - No buttons
 * - No inline actions
 * - No mutations
 */
export default function InboundMessagesTable({ messages }: InboundMessagesTableProps) {
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
        <strong>READ-ONLY / OBSERVABILITY</strong> — This table is READ-ONLY. No mutations allowed.
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
              Channel
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
              Conversation ID
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
              External Message ID
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
              Sender Identity
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
              Message Type
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
              Message Text
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
              Received At
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
              Created At
            </th>
          </tr>
        </thead>
        <tbody>
          {messages.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                No inbound messages found.
              </td>
            </tr>
          ) : (
            messages.map((message) => (
              <tr key={message.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(226, 232, 240, 0.95)' }}>
                  {message.channel}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(226, 232, 240, 0.95)', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                  {message.conversation_id}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(226, 232, 240, 0.95)', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                  {message.external_message_id}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(226, 232, 240, 0.95)', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                  {message.sender_identity}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(226, 232, 240, 0.95)' }}>
                  {message.message_type}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(226, 232, 240, 0.95)', maxWidth: '300px', wordBreak: 'break-word' }}>
                  {message.message_text ?? '-'}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(226, 232, 240, 0.95)' }}>
                  {message.received_at}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(226, 232, 240, 0.95)' }}>
                  {message.created_at}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
