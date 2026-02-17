'use client';

import Link from 'next/link';

export type TimelineActor = 'customer' | 'ai' | 'human' | 'system';

export type TimelineEventType =
  | 'message_received'
  | 'ai_draft_created'
  | 'human_approved'
  | 'booking_created'
  | 'booking_state_changed'
  | 'booking_confirmed'
  | 'booking_cancelled';

export interface TimelineEvent {
  type: TimelineEventType;
  label: string;
  actor: TimelineActor;
  timestamp: string;
  href?: string;
}

interface SemanticTimelineProps {
  events: TimelineEvent[];
}

/**
 * Semantic Timeline Component (READ-ONLY)
 * 
 * Displays conversation timeline events in chronological order.
 * Pure presentation component.
 */
export default function SemanticTimeline({ events }: SemanticTimelineProps) {
  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return timestamp;
    }
  };

  const getActorColor = (actor: string) => {
    switch (actor) {
      case 'customer':
        return { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' };
      case 'ai':
        return { bg: '#ecfeff', text: '#0e7490', border: '#67e8f9' };
      case 'human':
        return { bg: '#f0fdf4', text: '#166534', border: '#86efac' };
      case 'system':
        return { bg: 'rgba(255, 255, 255, 0.06)', text: '#374151', border: 'rgba(255, 255, 255, 0.12)' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.06)', text: '#6b7280', border: 'rgba(255, 255, 255, 0.1)' };
    }
  };

  if (events.length === 0) {
    return (
      <div style={{
        padding: '3rem',
        textAlign: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '0.5rem',
        color: '#6b7280',
      }}>
        No timeline events found.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {events.map((event, index) => {
        const actorColor = getActorColor(event.actor);
        const content = event.href ? (
          <Link
            href={event.href}
            style={{
              color: '#2563eb',
              textDecoration: 'none',
              fontWeight: '500',
            }}
          >
            {event.label}
          </Link>
        ) : (
          <span>{event.label}</span>
        );

        return (
          <div
            key={index}
            style={{
              display: 'flex',
              gap: '1rem',
              padding: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            }}
          >
            <div style={{
              width: '0.5rem',
              backgroundColor: actorColor.border,
              borderRadius: '0.25rem',
              flexShrink: 0,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '0.5rem',
              }}>
                <div style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  backgroundColor: actorColor.bg,
                  color: actorColor.text,
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  border: `1px solid ${actorColor.border}`,
                }}>
                  {event.actor}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                }}>
                  {formatTimestamp(event.timestamp)}
                </div>
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: 'rgba(226, 232, 240, 0.95)',
                fontWeight: '500',
              }}>
                {content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
