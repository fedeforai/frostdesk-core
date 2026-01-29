'use client';

// apps/admin/components/admin/StatusBadge.tsx

type StatusType =
  | 'new'
  | 'waiting_human'
  | 'ai_draft_ready'
  | 'closed'
  | 'pending'
  | 'approved'
  | 'sent'
  | 'proposed'
  | 'confirmed'
  | 'cancelled'
  | 'expired';

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md';
}

/**
 * StatusBadge
 *
 * Pure presentational component.
 * No logic, no side effects.
 */
export default function StatusBadge({
  status,
  size = 'md',
}: StatusBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding:
          size === 'sm'
            ? '0.125rem 0.5rem'
            : '0.25rem 0.625rem',
        fontSize: size === 'sm' ? '0.75rem' : '0.8125rem',
        fontWeight: 500,
        borderRadius: '999px',
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Internal mapping (UI-only)                                          */
/* ------------------------------------------------------------------ */

function getStatusConfig(status: StatusType) {
  switch (status) {
    case 'new':
      return {
        label: 'New',
        bg: '#eff6ff',
        text: '#1d4ed8',
        border: '#bfdbfe',
      };

    case 'waiting_human':
      return {
        label: 'Waiting human',
        bg: '#fefce8',
        text: '#92400e',
        border: '#fde68a',
      };

    case 'ai_draft_ready':
      return {
        label: 'AI draft ready',
        bg: '#ecfeff',
        text: '#0e7490',
        border: '#67e8f9',
      };

    case 'closed':
      return {
        label: 'Closed',
        bg: '#f3f4f6',
        text: '#4b5563',
        border: '#d1d5db',
      };

    case 'pending':
      return {
        label: 'Pending',
        bg: '#fff7ed',
        text: '#9a3412',
        border: '#fed7aa',
      };

    case 'approved':
      return {
        label: 'Approved',
        bg: '#ecfdf5',
        text: '#047857',
        border: '#6ee7b7',
      };

    case 'sent':
      return {
        label: 'Sent',
        bg: '#eef2ff',
        text: '#3730a3',
        border: '#c7d2fe',
      };

    case 'confirmed':
      return {
        label: 'Confirmed',
        bg: '#ecfdf5',
        text: '#065f46',
        border: '#6ee7b7',
      };

    case 'cancelled':
      return {
        label: 'Cancelled',
        bg: '#fef2f2',
        text: '#991b1b',
        border: '#fecaca',
      };

    case 'expired':
      return {
        label: 'Expired',
        bg: '#f3f4f6',
        text: '#6b7280',
        border: '#d1d5db',
      };

    case 'proposed':
    default:
      return {
        label: 'Proposed',
        bg: '#f0fdf4',
        text: '#166534',
        border: '#86efac',
      };
  }
}
