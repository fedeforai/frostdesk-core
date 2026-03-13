'use client';

import { useEffect, useCallback, type CSSProperties } from 'react';
import EventBadge from './EventBadge';
import type { EventBadgeVariant } from './EventBadge';

interface DayDetailItem {
  id: string;
  type: EventBadgeVariant;
  title: string;
  startTime: string;
  endTime: string;
  customerName?: string | null;
}

interface DayDetailModalProps {
  date: Date;
  items: DayDetailItem[];
  onClose: () => void;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLong(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getTypeLabel(type: EventBadgeVariant): string {
  switch (type) {
    case 'booking-confirmed':
      return 'Confirmed Booking';
    case 'booking-pending':
      return 'Pending Booking';
    case 'google-event':
      return 'Google Calendar';
    case 'blocked':
      return 'Blocked';
    case 'available':
      return 'Available Slot';
    default:
      return 'Event';
  }
}

export default function DayDetailModal({ date, items, onClose }: DayDetailModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [handleEscape]);

  const sortedItems = [...items].sort((a, b) => {
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  };

  const modalStyle: CSSProperties = {
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '0.75rem',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
  };

  const titleStyle: CSSProperties = {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'rgba(226, 232, 240, 0.95)',
  };

  const closeButtonStyle: CSSProperties = {
    padding: '0.375rem',
    borderRadius: '0.375rem',
    border: 'none',
    background: 'transparent',
    color: 'rgba(148, 163, 184, 0.8)',
    cursor: 'pointer',
    fontSize: '1.25rem',
    lineHeight: 1,
  };

  const contentStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem 1.25rem',
  };

  const emptyStyle: CSSProperties = {
    textAlign: 'center',
    padding: '2rem',
    color: 'rgba(148, 163, 184, 0.6)',
    fontSize: '0.875rem',
  };

  const itemStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '0.75rem',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '0.5rem',
    border: '1px solid rgba(148, 163, 184, 0.1)',
  };

  const itemHeaderStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
  };

  const timeRangeStyle: CSSProperties = {
    fontSize: '0.8125rem',
    color: 'rgba(148, 163, 184, 0.8)',
  };

  const itemTitleStyle: CSSProperties = {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: 'rgba(226, 232, 240, 0.95)',
  };

  const customerStyle: CSSProperties = {
    fontSize: '0.8125rem',
    color: 'rgba(148, 163, 184, 0.7)',
  };

  const listStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  };

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true" aria-label={`Events for ${formatDateLong(date)}`}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <h3 style={titleStyle}>{formatDateLong(date)}</h3>
          <button type="button" style={closeButtonStyle} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div style={contentStyle}>
          {sortedItems.length === 0 ? (
            <div style={emptyStyle}>No events scheduled for this day</div>
          ) : (
            <div style={listStyle}>
              {sortedItems.map(item => (
                <div key={item.id} style={itemStyle}>
                  <div style={itemHeaderStyle}>
                    <EventBadge variant={item.type} label={getTypeLabel(item.type)} compact />
                    <span style={timeRangeStyle}>
                      {formatTime(item.startTime)} - {formatTime(item.endTime)}
                    </span>
                  </div>
                  <div style={itemTitleStyle}>{item.title}</div>
                  {item.customerName && (
                    <div style={customerStyle}>Customer: {item.customerName}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
