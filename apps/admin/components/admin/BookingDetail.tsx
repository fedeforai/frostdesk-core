'use client';

import type { AdminBookingDetail } from '@/lib/adminApi';
import { getBookingSemanticStatus } from '@/lib/semanticStatus';
import StatusBadge from '@/components/admin/StatusBadge';
import Badge from '@/components/ui/badge';

interface BookingDetailProps {
  booking: AdminBookingDetail | null; // null if error loading
  error?: boolean; // True if booking details could not be loaded
}

export default function BookingDetail({ booking, error = false }: BookingDetailProps) {
  // Show error state if error is true or booking is null
  if (error || !booking) {
    return (
      <div style={{ 
        border: '1px solid #e5e7eb', 
        borderRadius: '0.5rem', 
        padding: '1.5rem',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ 
          marginBottom: '1.5rem', 
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600',
            color: '#111827',
            margin: 0,
          }}>
            Booking Details
          </h2>
          <Badge variant="secondary">Read-only</Badge>
        </div>
        <div style={{ 
          padding: '1.5rem', 
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb',
        }}>
          <p style={{ color: '#374151', fontSize: '0.875rem', fontWeight: '500', margin: '0 0 0.5rem 0' }}>
            Booking details could not be loaded
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: 0 }}>
            The system is temporarily unavailable
          </p>
        </div>
      </div>
    );
  }

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

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  return (
    <div style={{ 
      border: '1px solid #e5e7eb', 
      borderRadius: '0.5rem', 
      padding: '1.5rem',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}>
      <div style={{ 
        marginBottom: '1.5rem', 
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '600',
          color: '#111827',
          margin: 0,
        }}>
          Booking Details
        </h2>
        <Badge variant="secondary">Read-only</Badge>
      </div>
      <div style={{ display: 'grid', gap: '1.25rem' }}>
        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6' }}>
          <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>ID</strong>
          <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#111827' }}>{booking.id}</span>
        </div>
        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6' }}>
          <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>Instructor ID</strong>
          <span style={{ color: '#111827' }}>{booking.instructor_id}</span>
        </div>
        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6' }}>
          <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>Customer Name</strong>
          <span style={{ color: '#111827' }}>{booking.customer_name}</span>
        </div>
        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6' }}>
          <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>Phone</strong>
          <span style={{ color: '#111827' }}>{booking.phone}</span>
        </div>
        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6' }}>
          <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>Status</strong>
          <StatusBadge 
            status={getBookingSemanticStatus({ id: booking.id, status: booking.status })} 
          />
        </div>
        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6' }}>
          <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>Booking Date</strong>
          <span style={{ color: '#111827' }}>{formatTimestamp(booking.booking_date)}</span>
        </div>
        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6' }}>
          <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>Start Time</strong>
          <span style={{ color: '#111827' }}>{formatTimestamp(booking.start_time)}</span>
        </div>
        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6' }}>
          <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>End Time</strong>
          <span style={{ color: '#111827' }}>{formatTimestamp(booking.end_time)}</span>
        </div>
        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6' }}>
          <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>Calendar Event ID</strong>
          <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: booking.calendar_event_id ? '#111827' : '#9ca3af' }}>
            {booking.calendar_event_id || 'N/A'}
          </span>
        </div>
        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6' }}>
          <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>Payment Intent ID</strong>
          <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: booking.payment_intent_id ? '#111827' : '#9ca3af' }}>
            {booking.payment_intent_id || 'N/A'}
          </span>
        </div>
        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6' }}>
          <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>Conversation ID</strong>
          <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: booking.conversation_id ? '#111827' : '#9ca3af' }}>
            {booking.conversation_id || '—'}
          </span>
        </div>
        <div>
          <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>Created At</strong>
          <span style={{ color: '#111827' }}>{formatTimestamp(booking.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
