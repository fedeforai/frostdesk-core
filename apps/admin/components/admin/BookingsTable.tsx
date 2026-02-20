'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AdminBookingSummary } from '@/lib/adminApi';
import { getBookingSemanticStatus } from '@/lib/semanticStatus';
import StatusBadge from '@/components/admin/StatusBadge';

interface BookingsTableProps {
  bookings: AdminBookingSummary[];
}

function safeDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('it-IT');
}

function safeDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('it-IT');
}

function shortId(uuid: string): string {
  return uuid.length > 8 ? uuid.slice(0, 8) + '…' : uuid;
}

export default function BookingsTable({ bookings }: BookingsTableProps) {
  const router = useRouter();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const handleRowClick = (bookingId: string) => {
    router.push(`/admin/bookings/${bookingId}/lifecycle`);
  };

  const thStyle: React.CSSProperties = {
    padding: '0.75rem',
    textAlign: 'left',
    border: '1px solid #e5e7eb',
    fontWeight: 600,
    fontSize: '0.875rem',
    color: '#374151',
  };
  const tdStyle: React.CSSProperties = {
    padding: '0.75rem',
    border: '1px solid #e5e7eb',
    fontSize: '0.875rem',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        role="table"
        aria-label="Bookings list"
        style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}
      >
        <thead>
          <tr style={{ backgroundColor: '#f9fafb' }}>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Start</th>
            <th style={thStyle}>End</th>
            <th style={thStyle}>Customer</th>
            <th style={thStyle}>Phone</th>
            <th style={thStyle}>Instructor</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Created</th>
          </tr>
        </thead>
        <tbody>
          {bookings.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                No bookings found
              </td>
            </tr>
          ) : (
            bookings.map((b) => (
              <tr
                key={b.id}
                role="row"
                tabIndex={0}
                onClick={() => handleRowClick(b.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowClick(b.id);
                  }
                }}
                onMouseEnter={() => setHoveredRow(b.id)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{
                  cursor: 'pointer',
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: hoveredRow === b.id ? '#f9fafb' : 'transparent',
                  transition: 'background-color 0.15s ease',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.outline = '2px solid #3b82f6';
                  e.currentTarget.style.outlineOffset = '-2px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.outline = 'none';
                }}
                aria-label={`View booking ${shortId(b.id)}`}
              >
                <td style={tdStyle} suppressHydrationWarning>{safeDate(b.booking_date)}</td>
                <td style={tdStyle} suppressHydrationWarning>{safeDateTime(b.start_time)}</td>
                <td style={tdStyle} suppressHydrationWarning>{safeDateTime(b.end_time)}</td>
                <td style={tdStyle}>{b.customer_name || '—'}</td>
                <td style={tdStyle}>{b.phone || '—'}</td>
                <td style={tdStyle} title={b.instructor_id}>{shortId(b.instructor_id)}</td>
                <td style={tdStyle}>
                  <StatusBadge status={getBookingSemanticStatus({ id: b.id, status: b.status })} />
                </td>
                <td style={tdStyle} suppressHydrationWarning>{safeDateTime(b.created_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
