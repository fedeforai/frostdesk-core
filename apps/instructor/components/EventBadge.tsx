'use client';

import { type CSSProperties } from 'react';

export type EventBadgeVariant = 
  | 'booking-confirmed'
  | 'booking-pending'
  | 'google-event'
  | 'blocked'
  | 'available';

interface EventBadgeProps {
  variant: EventBadgeVariant;
  label: string;
  time?: string;
  compact?: boolean;
  onClick?: () => void;
}

const variantStyles: Record<EventBadgeVariant, { bg: string; border: string; text: string; dot: string }> = {
  'booking-confirmed': {
    bg: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.3)',
    text: '#4ade80',
    dot: '#22c55e',
  },
  'booking-pending': {
    bg: 'rgba(234, 179, 8, 0.15)',
    border: 'rgba(234, 179, 8, 0.3)',
    text: '#facc15',
    dot: '#eab308',
  },
  'google-event': {
    bg: 'rgba(107, 114, 128, 0.15)',
    border: 'rgba(107, 114, 128, 0.3)',
    text: 'rgba(156, 163, 175, 0.9)',
    dot: '#6b7280',
  },
  'blocked': {
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.3)',
    text: '#f87171',
    dot: '#ef4444',
  },
  'available': {
    bg: 'rgba(59, 130, 246, 0.1)',
    border: 'rgba(59, 130, 246, 0.2)',
    text: 'rgba(147, 197, 253, 0.9)',
    dot: '#3b82f6',
  },
};

export default function EventBadge({ variant, label, time, compact = false, onClick }: EventBadgeProps) {
  const colors = variantStyles[variant];

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: compact ? '0.25rem' : '0.5rem',
    padding: compact ? '0.125rem 0.375rem' : '0.25rem 0.5rem',
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: '0.25rem',
    fontSize: compact ? '0.625rem' : '0.75rem',
    color: colors.text,
    cursor: onClick ? 'pointer' : 'default',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  };

  const dotStyle: CSSProperties = {
    width: compact ? '0.375rem' : '0.5rem',
    height: compact ? '0.375rem' : '0.5rem',
    borderRadius: '50%',
    backgroundColor: colors.dot,
    flexShrink: 0,
  };

  const labelStyle: CSSProperties = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: 500,
  };

  const timeStyle: CSSProperties = {
    color: 'rgba(148, 163, 184, 0.7)',
    fontSize: compact ? '0.5625rem' : '0.6875rem',
    flexShrink: 0,
  };

  return (
    <div style={containerStyle} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <span style={dotStyle} />
      <span style={labelStyle}>{label}</span>
      {time && !compact && <span style={timeStyle}>{time}</span>}
    </div>
  );
}

export function EventBadgeDot({ variant }: { variant: EventBadgeVariant }) {
  const colors = variantStyles[variant];
  
  return (
    <span
      style={{
        display: 'inline-block',
        width: '0.5rem',
        height: '0.5rem',
        borderRadius: '50%',
        backgroundColor: colors.dot,
      }}
    />
  );
}
