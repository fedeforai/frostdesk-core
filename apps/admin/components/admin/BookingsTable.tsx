'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AdminBookingSummary } from '@/lib/adminApi';
import { getBookingSemanticStatus } from '@/lib/semanticStatus';
import StatusBadge from '@/components/admin/StatusBadge';

interface BookingsTableProps {
  bookings: AdminBookingSummary[];
}

export default function BookingsTable({ bookings }: BookingsTableProps) {
  const router = useRouter();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const handleRowClick = (bookingId: string) => {
    router.push(`/admin/bookings/${bookingId}/lifecycle`);
  };

  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
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
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Booking Date
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Start Time
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              End Time
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Customer Name
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Instructor ID
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Status
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Created At
            </th>
          </tr>
        </thead>
        <tbody>
          {bookings.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                No bookings found
              </td>
            </tr>
          ) : (
            bookings.map((booking) => {
              const customerName = booking.customer_name || 'N/A';
              const isTruncated = customerName.length > 30;
              return (
                <tr
                  key={booking.id}
                  role="row"
                  tabIndex={0}
                  onClick={() => handleRowClick(booking.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRowClick(booking.id);
                    }
                  }}
                  onMouseEnter={() => setHoveredRow(booking.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    cursor: 'pointer',
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: hoveredRow === booking.id ? '#f9fafb' : 'transparent',
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
                  aria-label={`View booking ${booking.id}`}
                >
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {new Date(booking.booking_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {new Date(booking.start_time).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {new Date(booking.end_time).toLocaleString()}
                  </td>
                  <td 
                    style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}
                    title={isTruncated ? customerName : undefined}
                  >
                    {isTruncated ? truncateText(customerName) : customerName}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {booking.instructor_id}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    <StatusBadge 
                      status={getBookingSemanticStatus({ id: booking.id, status: booking.status })} 
                    />
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {new Date(booking.created_at).toLocaleString()}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
