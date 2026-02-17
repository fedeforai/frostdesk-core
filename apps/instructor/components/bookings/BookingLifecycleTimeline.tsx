'use client';

import type { BookingTimelineEventApi } from '@/lib/instructorApi';

const statusColors: Record<string, { bg: string; color: string; border: string }> = {
  draft:     { bg: 'rgba(148, 163, 184, 0.12)', color: 'rgba(203, 213, 225, 0.9)', border: 'rgba(148, 163, 184, 0.25)' },
  pending:   { bg: 'rgba(250, 204, 21, 0.12)',  color: 'rgba(253, 224, 71, 0.9)',   border: 'rgba(250, 204, 21, 0.25)' },
  confirmed: { bg: 'rgba(34, 197, 94, 0.12)',   color: 'rgba(134, 239, 172, 0.9)',  border: 'rgba(34, 197, 94, 0.25)' },
  modified:  { bg: 'rgba(59, 130, 246, 0.12)',   color: 'rgba(147, 197, 253, 0.9)',  border: 'rgba(59, 130, 246, 0.25)' },
  cancelled: { bg: 'rgba(239, 68, 68, 0.12)',    color: 'rgba(252, 165, 165, 0.9)',  border: 'rgba(239, 68, 68, 0.25)' },
  declined:  { bg: 'rgba(239, 68, 68, 0.12)',    color: 'rgba(252, 165, 165, 0.9)',  border: 'rgba(239, 68, 68, 0.25)' },
  completed: { bg: 'rgba(34, 197, 94, 0.2)',     color: 'rgba(134, 239, 172, 0.95)', border: 'rgba(34, 197, 94, 0.35)' },
};

const fallbackColor = { bg: 'rgba(148, 163, 184, 0.1)', color: 'rgba(203, 213, 225, 0.8)', border: 'rgba(148, 163, 184, 0.2)' };

function StatusBadge({ status }: { status: string }) {
  const c = statusColors[status] ?? fallbackColor;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 5,
      fontSize: '0.75rem',
      fontWeight: 700,
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      textTransform: 'capitalize',
    }}>
      {status || '—'}
    </span>
  );
}

function formatTimestamp(ts: string): string {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
}

interface BookingLifecycleTimelineProps {
  timeline: BookingTimelineEventApi[];
}

export function BookingLifecycleTimeline({ timeline }: BookingLifecycleTimelineProps) {
  if (timeline.length === 0) {
    return (
      <p style={{ color: 'rgba(148, 163, 184, 0.75)', fontSize: '0.875rem', padding: '1rem 0' }}>
        Nessun evento di stato registrato per questo booking.
      </p>
    );
  }

  return (
    <section>
      <h3 style={{
        fontSize: '0.9375rem',
        fontWeight: 700,
        color: 'rgba(226, 232, 240, 0.95)',
        marginBottom: '0.75rem',
      }}>
        Cronologia stati
      </h3>

      <div style={{ position: 'relative', paddingLeft: 24 }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute',
          left: 7,
          top: 4,
          bottom: 4,
          width: 2,
          background: 'rgba(148, 163, 184, 0.2)',
          borderRadius: 1,
        }} />

        {timeline.map((event, i) => (
          <div key={i} style={{
            position: 'relative',
            marginBottom: i < timeline.length - 1 ? 16 : 0,
            paddingBottom: i < timeline.length - 1 ? 16 : 0,
            borderBottom: i < timeline.length - 1 ? '1px solid rgba(148, 163, 184, 0.08)' : 'none',
          }}>
            {/* Dot */}
            <div style={{
              position: 'absolute',
              left: -20,
              top: 5,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: (statusColors[event.to] ?? fallbackColor).color,
              border: '2px solid rgba(15, 23, 42, 0.8)',
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge status={event.from} />
              <span style={{ color: 'rgba(148, 163, 184, 0.6)', fontSize: '0.8125rem' }}>→</span>
              <StatusBadge status={event.to} />
              <span style={{
                marginLeft: 'auto',
                fontSize: '0.75rem',
                color: 'rgba(148, 163, 184, 0.6)',
                fontFamily: 'monospace',
              }}>
                {formatTimestamp(event.timestamp)}
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 4,
              fontSize: '0.75rem',
              color: 'rgba(148, 163, 184, 0.55)',
            }}>
              <span>
                {event.actor_type === 'human' ? '👤 Manuale' : '⚙️ Sistema'}
              </span>
              {event.reason && (
                <span style={{ fontStyle: 'italic' }}>
                  · {event.reason}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
