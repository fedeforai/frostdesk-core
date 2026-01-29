'use client';

import TimelineEvent from './TimelineEvent';

export default function ConversationTimeline({
  events,
}: {
  events: any[];
}) {
  if (!events || events.length === 0) {
    return <div style={{ color: '#6b7280' }}>No events yet.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {events.map((event, idx) => (
        <TimelineEvent key={idx} event={event} />
      ))}
    </div>
  );
}
