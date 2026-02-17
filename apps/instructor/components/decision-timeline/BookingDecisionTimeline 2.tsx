'use client';

/**
 * Loop 7: Decision Timeline UI for a booking (read-only).
 * Renders events from GET /instructor/bookings/:id/timeline.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchBookingTimeline,
  type BookingTimelineEventApi,
  type BookingTimelineResponse,
} from '@/lib/instructorApi';
import { getEventUiConfig } from './eventUiMap';

interface BookingDecisionTimelineProps {
  bookingId: string;
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
      {[1, 2].map((i) => (
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
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                height: 14,
                width: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                marginBottom: 6,
              }}
            />
            <div
              style={{
                height: 12,
                width: '35%',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
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
color: 'rgba(148, 163, 184, 0.9)',
        fontSize: '0.875rem',
        lineHeight: 1.5,
      }}
    >
      <p style={{ margin: 0, fontWeight: 500, color: 'rgba(226, 232, 240, 0.95)' }}>
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
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: 8,
        color: 'rgba(252, 165, 165, 0.95)',
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

function TimelineItem({ event }: { event: BookingTimelineEventApi }) {
  const payload = { to: event.to, from: event.from };
  const ui = getEventUiConfig(event.type, payload);
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
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(226, 232, 240, 0.95)' }}>
          {ui.label}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)', marginTop: 2 }}>
          {event.from && event.to ? `${event.from} → ${event.to}` : null} · {formatTimestamp(event.timestamp)}
        </div>
      </div>
    </div>
  );
}

export default function BookingDecisionTimeline({
  bookingId,
  showHeader = true,
}: BookingDecisionTimelineProps) {
  const [data, setData] = useState<BookingTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const res = await fetchBookingTimeline(bookingId);
      setData(res);
    } catch (err: any) {
      setErrorStatus(err?.status ?? 500);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <section style={{ marginTop: '1rem' }}>
        {showHeader && (
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'rgba(226, 232, 240, 0.95)' }}>
            Decision timeline
          </h2>
        )}
        <p style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '0.5rem' }}>
          Read-only · Verified actions
        </p>
        <TimelineSkeleton />
      </section>
    );
  }

  if (errorStatus != null) {
    return (
      <section style={{ marginTop: '1rem' }}>
        {showHeader && (
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'rgba(226, 232, 240, 0.95)' }}>
            Decision timeline
          </h2>
        )}
        <ErrorState status={errorStatus} onRetry={load} />
      </section>
    );
  }

  const timeline = data?.timeline ?? [];

  return (
    <section style={{ marginTop: '1rem' }}>
      {showHeader && (
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem', color: 'rgba(226, 232, 240, 0.95)' }}>
          Decision timeline
        </h2>
      )}
      <p style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '0.75rem' }}>
        Read-only · Verified actions
      </p>
      {timeline.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ padding: '0.25rem 0' }}>
          {timeline.map((event, index) => (
            <TimelineItem key={`${event.timestamp}-${index}`} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
