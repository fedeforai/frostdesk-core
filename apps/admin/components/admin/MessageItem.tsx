'use client';

import Badge from '@/components/ui/badge';

interface MessageItemProps {
  message: {
    message_id: string;
    direction: 'inbound' | 'outbound';
    message_text: string | null;
    sender_identity: 'customer' | 'human' | 'ai' | null;
    created_at: string;
    intent?: string | null;
    confidence?: number | null;
    model?: string | null;
  };
  formatTimestamp: (timestamp: string) => string;
  isAIDraft?: boolean; // True if this is an AI draft that hasn't been sent
}

/**
 * MessageItem Component
 * 
 * Displays a single message with appropriate badge indicating:
 * - AI Draft: AI-generated draft not yet sent
 * - Sent: Message actually sent to customer
 * - Human: Manually written message
 */
export default function MessageItem({ message, formatTimestamp, isAIDraft = false }: MessageItemProps) {
  // Determine message type badge
  const getMessageBadge = () => {
    if (message.direction === 'inbound') {
      // Inbound messages (from customer) don't need a badge
      return null;
    }

    // Outbound messages
    if (isAIDraft) {
      // AI draft that hasn't been sent
      return <Badge variant="outline">AI Draft</Badge>;
    }

    if (message.sender_identity === 'human') {
      // Human-written message (sent)
      return <Badge variant="secondary">Human</Badge>;
    }

    if (message.sender_identity === 'ai') {
      // AI message that was sent
      return <Badge variant="secondary">Sent</Badge>;
    }

    // Default: sent message without clear sender identity
    return <Badge variant="secondary">Sent</Badge>;
  };

  const messageBadge = getMessageBadge();

  return (
    <div
      key={message.message_id}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '0.375rem',
        padding: '1rem',
        backgroundColor: message.direction === 'inbound' ? '#f0f9ff' : '#f9fafb',
        borderLeft: message.direction === 'inbound' ? '4px solid #3b82f6' : '4px solid #6b7280',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-block',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            backgroundColor: message.direction === 'inbound' ? '#dbeafe' : '#e5e7eb',
            color: message.direction === 'inbound' ? '#1e40af' : '#374151',
            fontSize: '0.75rem',
            fontWeight: '500',
            textTransform: 'uppercase',
          }}>
            {message.direction}
          </span>
          {messageBadge}
        </div>
        <span style={{ color: '#6b7280', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
          {formatTimestamp(message.created_at)}
        </span>
      </div>
      <div style={{ color: '#111827', fontSize: '0.875rem', lineHeight: '1.5' }}>
        {message.message_text || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No text content</span>}
      </div>
      {message.sender_identity && (
        <div style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.75rem' }}>
          From: {message.sender_identity}
        </div>
      )}
      {message.direction === 'inbound' && (
        <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
          <strong style={{ color: '#6b7280' }}>Intent: </strong>
          <span style={{ color: '#111827' }}>
            {message.intent || 'Not classified'}
          </span>
          {message.intent && (
            <>
              <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                (Confidence: {message.confidence !== null ? `${(message.confidence * 100).toFixed(0)}%` : 'N/A'})
              </span>
              {message.model && (
                <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                  Model: {message.model}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
