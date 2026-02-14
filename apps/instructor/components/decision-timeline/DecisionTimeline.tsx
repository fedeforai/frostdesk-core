'use client';

/**
 * Loop 7: Decision Timeline UI for a conversation (read-only).
 * Renders events from GET /instructor/conversations/:id/timeline with grouping and labels.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchConversationTimeline,
  type ConversationTimelineEvent,
  type ConversationTimelineResponse,
} from '@/lib/instructorApi';
import { getEventUiConfig } from './eventUiMap';
import {
  groupConversationTimelineEvents,
  type TimelineDisplayItem,
} from './groupTimelineEvents';

interface DecisionTimelineProps {
  conversationId: string;
  /** Optional: hide the section header */
  showHeader?: boolean;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toISOString().slice(0, 16).replace('T', ' ');
  } catch {
    return '—';
  }
}

function TimelineSkeleton() {
  return (
    <div aria-hidden style={{ padding: '0.5rem 0' }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: '0.75rem',
            marginBottom: '0.75rem',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              backgroundColor: '#e5e7eb',
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                height: 14,
                width: '60%',
                backgroundColor: '#e5e7eb',
                borderRadius: 4,
                marginBottom: 6,
              }}
            />
            <div
              style={{
                height: 12,
                width: '40%',
                backgroundColor: '#f3f4f6',
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        padding: '1.5rem 1rem',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '0.875rem',
        lineHeight: 1.5,
      }}
    >
      <p style={{ margin: 0, fontWeight: 500, color: '#374151' }}>
        No decisions yet.
      </p>
      <p style={{ margin: '0.25rem 0 0 0' }}>
        This timeline will show verified actions as they happen.
      </p>
    </div>
  );
}

function ErrorState({
  status,
  onRetry,
}: {
  status: number;
  onRetry: () => void;
}) {
  const message =
    status === 403
      ? "You don't have access to this timeline."
      : status === 404
        ? 'This item no longer exists.'
        : 'Unable to load timeline.';
  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 8,
        color: '#991b1b',
        fontSize: '0.875rem',
      }}
    >
      <p style={{ margin: 0 }}>{message}</p>
      {status !== 403 && status !== 404 && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: '0.5rem',
            padding: '0.25rem 0.75rem',
            fontSize: '0.8125rem',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

function SingleItem({ event }: { event: ConversationTimelineEvent }) {
  const ui = getEventUiConfig(event.type, event.payload);
  return (
    <div
      style={{
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
        marginBottom: '0.5rem',
      }}
    >
      <span style={{ fontSize: '1rem' }}>{ui.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
          {ui.label}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
          {formatTimestamp(event.timestamp)}
        </div>
      </div>
    </div>
  );
}

function HandoffGroup({
  events,
  timestamp,
}: {
  events: [ConversationTimelineEvent, ConversationTimelineEvent];
  timestamp: string;
}) {
  const first = events[0];
  const payload = first.payload as { from_instructor_id?: string; to_instructor_id?: string; reason?: string | null };
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '0.75rem 1rem',
        marginBottom: '0.5rem',
        backgroundColor: '#fafafa',
      }}
    >
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: 4 }}>
        <span>🔁</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
          Conversation handed off
        </span>
      </div>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 4 }}>
        {payload?.from_instructor_id && payload?.to_instructor_id
          ? `Instructor → Instructor`
          : 'Handoff recorded'}
      </div>
      <div style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>
        Audit record created · {formatTimestamp(timestamp)}
      </div>
    </div>
  );
}

function BookingGroup({
  events,
  timestamp,
}: {
  events: ConversationTimelineEvent[];
  timestamp: string;
}) {
  const labels = events.map((e) => {
    const to = (e.payload?.to as string) ?? (e.payload?.new_state as string) ?? '?';
    const from = (e.payload?.from as string) ?? (e.payload?.previous_state as string) ?? '?';
    return `${from} → ${to}`;
  });
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '0.75rem 1rem',
        marginBottom: '0.5rem',
        backgroundColor: '#f8fafc',
      }}
    >
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: 6 }}>
        <span>📘</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
          Booking updated
        </span>
      </div>
      <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', color: '#374151' }}>
        {labels.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      <div style={{ fontSize: '0.6875rem', color: '#9ca3af', marginTop: 4 }}>
        {formatTimestamp(timestamp)}
      </div>
    </div>
  );
}

function TimelineList({ items }: { items: TimelineDisplayItem[] }) {
  return (
    <div style={{ padding: '0.25rem 0' }}>
      {items.map((item, index) => {
        if (item.kind === 'single') {
          return <SingleItem key={`single-${index}-${item.event.timestamp}`} event={item.event} />;
        }
        if (item.kind === 'handoff_group') {
          return (
            <HandoffGroup
              key={`handoff-${index}-${item.timestamp}`}
              events={item.events}
              timestamp={item.timestamp}
            />
          );
        }
        return (
          <BookingGroup
            key={`booking-${index}-${item.timestamp}`}
            events={item.events}
            timestamp={item.timestamp}
          />
        );
      })}
    </div>
  );
}

export default function DecisionTimeline({
  conversationId,
  showHeader = true,
}: DecisionTimelineProps) {
  const [data, setData] = useState<ConversationTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const res = await fetchConversationTimeline(conversationId);
      setData(res);
    } catch (err: any) {
      setErrorStatus(err?.status ?? 500);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <section style={{ marginTop: '1.5rem' }}>
        {showHeader && (
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
            Decision timeline
          </h2>
        )}
        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
          Read-only · Verified actions
        </p>
        <TimelineSkeleton />
      </section>
    );
  }

  if (errorStatus != null) {
    return (
      <section style={{ marginTop: '1.5rem' }}>
        {showHeader && (
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
            Decision timeline
          </h2>
        )}
        <ErrorState status={errorStatus} onRetry={load} />
      </section>
    );
  }

  const timeline = data?.timeline ?? [];
  const grouped = groupConversationTimelineEvents(timeline);

  return (
    <section style={{ marginTop: '1.5rem' }}>
      {showHeader && (
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem', color: '#111827' }}>
          Decision timeline
        </h2>
      )}
      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>
        Read-only · Verified actions
      </p>
      {grouped.length === 0 ? (
        <EmptyState />
      ) : (
        <TimelineList items={grouped} />
      )}
    </section>
  );
}
