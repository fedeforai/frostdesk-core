'use client';

import type { BookingLifecycleEvent } from '@/lib/adminApi';
import BookingLifecycleEventComponent from './BookingLifecycleEvent';
import Badge from '@/components/ui/badge';

interface BookingLifecycleTimelineProps {
  events: BookingLifecycleEvent[];
  error?: boolean; // True if lifecycle data could not be loaded
}

/**
 * Booking Lifecycle Timeline
 * 
 * READ-ONLY visual timeline of booking lifecycle events.
 * No interactivity, no actions, no mutations.
 */
export default function BookingLifecycleTimeline({ events, error = false }: BookingLifecycleTimelineProps) {
  // Show error state if error is true
  if (error) {
    return (
      <div style={{ 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        borderRadius: '0.5rem', 
        padding: '1.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ 
          marginBottom: '1.5rem', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600',
            color: 'rgba(226, 232, 240, 0.95)',
            margin: 0,
          }}>
            Lifecycle
          </h2>
          <Badge variant="secondary">Read-only</Badge>
        </div>
        <div style={{ 
          padding: '1.5rem', 
          textAlign: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          borderRadius: '0.375rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <p style={{ color: '#374151', fontSize: '0.875rem', fontWeight: '500', margin: '0 0 0.5rem 0' }}>
            Lifecycle data unavailable
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: 0 }}>
            No lifecycle information could be retrieved
          </p>
        </div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div style={{ 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        borderRadius: '0.5rem', 
        padding: '1.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ 
          marginBottom: '1.5rem', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600',
            color: 'rgba(226, 232, 240, 0.95)',
            margin: 0,
          }}>
            Lifecycle
          </h2>
          <Badge variant="secondary">Read-only</Badge>
        </div>
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
            No lifecycle events recorded yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      border: '1px solid rgba(255, 255, 255, 0.1)', 
      borderRadius: '0.5rem', 
      padding: '1.5rem',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}>
      <div style={{ 
        marginBottom: '1.5rem', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '600',
          color: 'rgba(226, 232, 240, 0.95)',
          margin: 0,
        }}>
          Lifecycle
        </h2>
        <Badge variant="secondary">Read-only</Badge>
      </div>
      
      <div style={{ position: 'relative', paddingLeft: '2rem' }}>
        {/* Vertical timeline line */}
        <div style={{
          position: 'absolute',
          left: '0.5rem',
          top: '0.5rem',
          bottom: '0.5rem',
          width: '2px',
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
        }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {events.map((event, index) => (
            <BookingLifecycleEventComponent key={index} event={event} />
          ))}
        </div>
      </div>
    </div>
  );
}
