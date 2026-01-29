'use client';

type Props = {
  event: {
    type: string;
    actor: string;
    timestamp: string;
    payload: any;
  };
};

export default function TimelineEvent({ event }: Props) {
  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <div style={{ width: '90px', fontSize: '0.75rem', color: '#6b7280' }}>
        {new Date(event.timestamp).toLocaleTimeString()}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
          {event.type.toUpperCase()}
        </div>

        <pre
          style={{
            marginTop: '0.25rem',
            fontSize: '0.75rem',
            background: '#f9fafb',
            padding: '0.5rem',
            borderRadius: '4px',
            overflowX: 'auto',
          }}
        >
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      </div>
    </div>
  );
}
