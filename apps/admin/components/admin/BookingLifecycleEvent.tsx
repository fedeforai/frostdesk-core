'use client';

import type { BookingLifecycleEvent } from '@/lib/adminApi';

interface BookingLifecycleEventProps {
  event: BookingLifecycleEvent;
}

/**
 * Booking Lifecycle Event
 * 
 * Renders a single event in the lifecycle timeline.
 * READ-ONLY, no interactivity.
 */
export default function BookingLifecycleEventComponent({ event }: BookingLifecycleEventProps) {
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

  // Badge colors based on event type
  const getTypeBadgeStyle = (type: BookingLifecycleEvent['type']) => {
    switch (type) {
      case 'booking_created':
        return {
          backgroundColor: '#f3f4f6',
          color: '#374151',
          border: '1px solid #d1d5db',
        };
      case 'status_transition':
        return {
          backgroundColor: '#dbeafe',
          color: '#1e40af',
          border: '1px solid #93c5fd',
        };
      case 'manual_override':
        return {
          backgroundColor: '#fef3c7',
          color: '#92400e',
          border: '1px solid #fde68a',
        };
      default:
        return {
          backgroundColor: '#f3f4f6',
          color: '#374151',
          border: '1px solid #d1d5db',
        };
    }
  };

  const getTypeLabel = (type: BookingLifecycleEvent['type']) => {
    switch (type) {
      case 'booking_created':
        return 'Created';
      case 'status_transition':
        return 'Status Transition';
      case 'manual_override':
        return 'Manual Override';
      default:
        return type;
    }
  };

  const badgeStyle = getTypeBadgeStyle(event.type);
  const typeLabel = getTypeLabel(event.type);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-start',
      }}
    >
      {/* Timeline dot */}
      <div style={{
        position: 'absolute',
        left: '-1.75rem',
        top: '0.25rem',
        width: '0.75rem',
        height: '0.75rem',
        borderRadius: '50%',
        backgroundColor: '#6b7280',
        border: '2px solid #ffffff',
        boxShadow: '0 0 0 2px #d1d5db',
        flexShrink: 0,
      }} />
      
      {/* Event content */}
      <div style={{
        flex: 1,
        border: '1px solid #e5e7eb',
        borderRadius: '0.375rem',
        padding: '1rem',
        backgroundColor: '#f9fafb',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Header: Time and Type */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ 
              color: '#6b7280', 
              fontSize: '0.875rem',
              fontFamily: 'monospace',
            }}>
              {formatTimestamp(event.timestamp)}
            </span>
            <span style={{
              display: 'inline-block',
              padding: '0.25rem 0.625rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: '500',
              ...badgeStyle,
            }}>
              {typeLabel}
            </span>
          </div>

          {/* Actor */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <strong style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '500', minWidth: '60px' }}>
              Actor:
            </strong>
            <span style={{ color: '#111827', fontSize: '0.875rem' }}>{event.actor}</span>
          </div>

          {/* State change (if present) */}
          {(event.from !== null || event.to !== null) && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <strong style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '500', minWidth: '60px' }}>
                State:
              </strong>
              <span style={{ color: '#111827', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                {event.from ?? 'null'} → {event.to ?? 'null'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
