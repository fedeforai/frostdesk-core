'use client';

/**
 * FEATURE 2.9 — Reply status v1 (UI only).
 * Renders a single message. Status badge only for latest outbound when status !== 'idle'.
 */

export type ReplyStatus = 'idle' | 'sending' | 'sent' | 'delivered';

export interface MessageBubbleProps {
  text: string;
  direction: 'inbound' | 'outbound';
  created_at: string;
  isOutbound?: boolean;
  isLatestOutbound?: boolean;
  status?: ReplyStatus;
}

function StatusBadge({ status }: { status: ReplyStatus }) {
  if (status === 'idle') return null;
  if (status === 'sending') {
    return (
      <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        ⏳ Sending…
      </span>
    );
  }
  if (status === 'sent') {
    return (
      <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        ✓ Sent
      </span>
    );
  }
  if (status === 'delivered') {
    return (
      <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        ✓✓ Delivered
      </span>
    );
  }
  return null;
}

export default function MessageBubble({
  text,
  direction,
  created_at,
  isOutbound = false,
  isLatestOutbound = false,
  status = 'idle',
}: MessageBubbleProps) {
  const showStatus = isOutbound && isLatestOutbound && status !== 'idle';
  const isOut = direction === 'outbound';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOut ? 'flex-end' : 'flex-start',
        marginBottom: '0.75rem',
      }}
    >
      <div
        style={{
          maxWidth: '80%',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          backgroundColor: isOut ? '#dbeafe' : '#f3f4f6',
          color: '#111827',
          fontSize: '0.875rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {text}
        <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.25rem' }}>
          {new Date(created_at).toLocaleString()}
        </div>
      </div>
      {showStatus && <StatusBadge status={status} />}
    </div>
  );
}
