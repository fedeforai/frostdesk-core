'use client';

import type { InstructorAvailability, AvailabilityOverrideItem } from '@/lib/instructorApi';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FIRST_HOUR = 6;
const LAST_HOUR = 22;

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function isHourInWindow(hour: number, startTime: string, endTime: string): boolean {
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);
  const hourStart = hour * 60;
  const hourEnd = (hour + 1) * 60;
  return startMin < hourEnd && endMin > hourStart;
}

/** Returns true if [slotStart, slotEnd) overlaps [overrideStart, overrideEnd). */
function overrideOverlapsSlot(
  slotStartUtc: string,
  slotEndUtc: string,
  overrideStart: string,
  overrideEnd: string
): boolean {
  const s = new Date(slotStartUtc).getTime();
  const e = new Date(slotEndUtc).getTime();
  const oS = new Date(overrideStart).getTime();
  const oE = new Date(overrideEnd).getTime();
  return s < oE && e > oS;
}

/** weekStart = YYYY-MM-DD (Sunday). Build slot UTC range for dayIndex 0..6 and hour. */
function slotUtcRange(weekStart: string, dayIndex: number, hour: number): { start: string; end: string } {
  const d = new Date(weekStart + 'T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + dayIndex);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return {
    start: `${y}-${m}-${day}T${String(hour).padStart(2, '0')}:00:00.000Z`,
    end: `${y}-${m}-${day}T${String(hour + 1).padStart(2, '0')}:00:00.000Z`,
  };
}

interface AvailabilityCalendarViewProps {
  availability: InstructorAvailability[];
  /** Overrides for the displayed week (optional). */
  overrides?: AvailabilityOverrideItem[];
  /** Sunday of the week to show (YYYY-MM-DD). Default: current week. */
  weekStart?: string;
}

export default function AvailabilityCalendarView({
  availability,
  overrides = [],
  weekStart: weekStartProp,
}: AvailabilityCalendarViewProps) {
  const active = availability.filter((a) => a.is_active);
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  const weekStart = weekStartProp ?? sunday.toISOString().slice(0, 10);

  return (
    <div>
      <p style={{ marginBottom: '0.75rem', fontSize: '0.8125rem', color: 'rgba(148, 163, 184, 0.9)' }}>
        Week view: green = available (recurring), blue = extra (exception), red = blocked. To add or edit, use Table or Exceptions below.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table
          role="table"
          aria-label="Availability week calendar"
          style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse', border: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '0.8125rem' }}
        >
          <thead>
            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
              <th style={{ width: 40, padding: '0.5rem', textAlign: 'right', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(148, 163, 184, 0.9)', fontWeight: 600 }}>
               
              </th>
              {DAY_LABELS.map((label, i) => (
                <th key={i} style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(148, 163, 184, 0.9)', fontWeight: 600 }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i).map((hour) => (
              <tr key={hour}>
                <td style={{ padding: '0.25rem 0.5rem', textAlign: 'right', border: '1px solid rgba(255, 255, 255, 0.06)', color: 'rgba(148, 163, 184, 0.75)' }}>
                  {hour}:00
                </td>
                {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
                  const recurring = active.some(
                    (a) =>
                      a.day_of_week === dayOfWeek &&
                      isHourInWindow(hour, a.start_time, a.end_time)
                  );
                  const { start: slotStart, end: slotEnd } = slotUtcRange(weekStart, dayOfWeek, hour);
                  const blocked = overrides.some(
                    (o) => !o.is_available && overrideOverlapsSlot(slotStart, slotEnd, o.start_utc, o.end_utc)
                  );
                  const added = overrides.some(
                    (o) => o.is_available && overrideOverlapsSlot(slotStart, slotEnd, o.start_utc, o.end_utc)
                  );
                  let bg = 'transparent';
                  let title = '';
                  if (blocked) {
                    bg = 'rgba(239, 68, 68, 0.4)';
                    title = `Blocked · ${DAY_LABELS[dayOfWeek]} ${hour}:00`;
                  } else if (added && !recurring) {
                    bg = 'rgba(59, 130, 246, 0.4)';
                    title = `Extra · ${DAY_LABELS[dayOfWeek]} ${hour}:00`;
                  } else if (recurring) {
                    bg = 'rgba(34, 197, 94, 0.35)';
                    title = `${DAY_LABELS[dayOfWeek]} ${hour}:00–${hour + 1}:00`;
                  }
                  return (
                    <td
                      key={dayOfWeek}
                      style={{
                        padding: 2,
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        backgroundColor: bg,
                        minWidth: 44,
                      }}
                      title={title || undefined}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
