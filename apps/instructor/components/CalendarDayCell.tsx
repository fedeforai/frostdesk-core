'use client';

import { useState, type CSSProperties } from 'react';
import { EventBadgeDot } from './EventBadge';
import type { EventBadgeVariant } from './EventBadge';

export interface CalendarDayItem {
  id: string;
  type: EventBadgeVariant;
  title: string;
  time?: string;
  customerName?: string | null;
}

export interface CalendarDayData {
  date: Date | null;
  items: CalendarDayItem[];
  isToday: boolean;
  isCurrentMonth: boolean;
}

interface CalendarDayCellProps {
  data: CalendarDayData;
  onClick: () => void;
}

const MAX_VISIBLE_ITEMS = 3;

export default function CalendarDayCell({ data, onClick }: CalendarDayCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { date, items, isToday, isCurrentMonth } = data;

  if (!date) {
    return (
      <div
        style={{
          minHeight: '100px',
          backgroundColor: 'rgba(15, 23, 42, 0.3)',
          padding: '0.5rem',
        }}
      />
    );
  }

  const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
  const remainingCount = items.length - MAX_VISIBLE_ITEMS;

  const cellStyle: CSSProperties = {
    minHeight: '100px',
    backgroundColor: isToday
      ? 'rgba(59, 130, 246, 0.1)'
      : isHovered
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(255, 255, 255, 0.02)',
    padding: '0.5rem',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    transition: 'background-color 0.15s ease',
  };

  const dayNumberStyle: CSSProperties = {
    fontSize: '0.875rem',
    fontWeight: isToday ? 700 : 500,
    color: isToday
      ? '#3b82f6'
      : isCurrentMonth
      ? 'rgba(226, 232, 240, 0.95)'
      : 'rgba(148, 163, 184, 0.5)',
    marginBottom: '0.25rem',
  };

  const itemContainerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem',
    flex: 1,
    overflow: 'hidden',
  };

  const itemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.625rem',
    color: 'rgba(226, 232, 240, 0.8)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const moreStyle: CSSProperties = {
    fontSize: '0.625rem',
    color: 'rgba(148, 163, 184, 0.7)',
    fontWeight: 500,
  };

  return (
    <div
      style={cellStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`${date.getDate()} ${date.toLocaleString('default', { month: 'long' })}, ${items.length} events`}
    >
      <div style={dayNumberStyle}>{date.getDate()}</div>
      <div style={itemContainerStyle}>
        {visibleItems.map(item => (
          <div key={item.id} style={itemStyle}>
            <EventBadgeDot variant={item.type} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.time && <span style={{ marginRight: '0.25rem', color: 'rgba(148, 163, 184, 0.7)' }}>{item.time}</span>}
              {item.title}
            </span>
          </div>
        ))}
        {remainingCount > 0 && (
          <div style={moreStyle}>+{remainingCount} more</div>
        )}
      </div>
    </div>
  );
}
