'use client';

import * as React from 'react';
import type { CalendarEvent } from '@/lib/instructorApi';

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function eachDayOfInterval(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}
function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function formatDay(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

interface EventConstellationCalendarProps {
  events: CalendarEvent[];
}

export default function EventConstellationCalendar({ events }: EventConstellationCalendarProps) {
  const [dateRef, setDateRef] = React.useState(() => new Date());
  const [popoverDay, setPopoverDay] = React.useState<Date | null>(null);

  const start = startOfMonth(dateRef);
  const end = endOfMonth(dateRef);
  const days = eachDayOfInterval(start, end);

  const eventsForDay = (d: Date) => {
    const ymd = toYMD(d);
    return events.filter((ev) => toYMD(new Date(ev.start_at)) === ymd);
  };

  const getStarPosition = (dayIndex: number) => {
    const angle = (dayIndex / days.length) * 2 * Math.PI;
    const radius = 100 + (dayIndex % 5) * 20;
    const centerX = 200;
    const centerY = 200;
    const padding = 20;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return {
      x: Math.min(400 - padding, Math.max(padding, x)),
      y: Math.min(400 - padding, Math.max(padding, y)),
    };
  };

  const containerStyle: React.CSSProperties = {
    padding: '1rem 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  };
  const navStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  };
  const buttonStyle: React.CSSProperties = {
    padding: '0.375rem 0.75rem',
    borderRadius: '0.375rem',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    background: 'rgba(30, 58, 138, 0.2)',
    color: 'rgba(226, 232, 240, 0.95)',
    cursor: 'pointer',
    fontWeight: 600,
  };
  const starfieldStyle: React.CSSProperties = {
    position: 'relative',
    width: 400,
    height: 400,
    background: 'rgba(15, 23, 42, 0.8)',
    borderRadius: '0.5rem',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    overflow: 'hidden',
  };
  const dayDotStyle = (hasEvents: boolean, x: number, y: number): React.CSSProperties => ({
    position: 'absolute',
    left: x,
    top: y,
    width: 24,
    height: 24,
    marginLeft: -12,
    marginTop: -12,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
    background: hasEvents ? 'rgba(250, 204, 21, 0.9)' : 'rgba(148, 163, 184, 0.4)',
    color: hasEvents ? '#111827' : 'rgba(226, 232, 240, 0.9)',
    border: 'none',
  });
  const popoverStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 100,
    background: 'rgba(15, 23, 42, 0.98)',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    borderRadius: '0.5rem',
    padding: '0.75rem 1rem',
    minWidth: 200,
    maxWidth: 320,
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
  };

  return (
    <div style={containerStyle}>
      <div style={navStyle}>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => setDateRef((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
        >
          Prev
        </button>
        <span style={{ fontWeight: 600, color: 'rgba(226, 232, 240, 0.95)' }}>
          {dateRef.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => setDateRef((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
        >
          Next
        </button>
      </div>

      <div style={starfieldStyle}>
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          aria-hidden
        >
          {days.map((day, idx) => {
            const dayEvents = eventsForDay(day);
            if (dayEvents.length === 0) return null;
            const nextDay = days[idx + 1];
            if (!nextDay) return null;
            const nextEvents = eventsForDay(nextDay);
            if (nextEvents.length === 0) return null;
            const { x: x1, y: y1 } = getStarPosition(idx);
            const { x: x2, y: y2 } = getStarPosition(idx + 1);
            return (
              <line
                key={`line-${idx}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(226, 232, 240, 0.35)"
                strokeWidth="1"
              />
            );
          })}
        </svg>

        {days.map((day, idx) => {
          const { x, y } = getStarPosition(idx);
          const dayEvents = eventsForDay(day);
          const hasEvents = dayEvents.length > 0;

          return (
            <button
              key={day.toISOString()}
              type="button"
              style={dayDotStyle(hasEvents, x, y)}
              onClick={() => setPopoverDay((prev) => (prev && toYMD(prev) === toYMD(day) ? null : day))}
              aria-label={`${formatDay(day)}${hasEvents ? `, ${dayEvents.length} events` : ''}`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      {popoverDay && (
        <div
          role="dialog"
          aria-label={`Events for ${formatDay(popoverDay)}`}
          style={{
            ...popoverStyle,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <strong style={{ color: 'rgba(226, 232, 240, 0.95)' }}>{formatDay(popoverDay)}</strong>
            <button
              type="button"
              onClick={() => setPopoverDay(null)}
              style={{ ...buttonStyle, padding: '0.25rem 0.5rem' }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          {eventsForDay(popoverDay).length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>No events</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.9)' }}>
              {eventsForDay(popoverDay).map((ev) => (
                <li key={ev.id} style={{ marginBottom: '0.25rem' }}>
                  {ev.title || '(No title)'}
                  {!ev.is_all_day && ` — ${formatTime(ev.start_at)}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {popoverDay && (
        <div
          role="presentation"
          style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setPopoverDay(null)}
          onKeyDown={(e) => e.key === 'Escape' && setPopoverDay(null)}
        />
      )}
    </div>
  );
}
