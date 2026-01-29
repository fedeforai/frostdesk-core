'use client';

import type { BookingAuditEntry } from '@/lib/adminApi';

interface BookingAuditTrailProps {
  auditTrail: BookingAuditEntry[];
}

export default function BookingAuditTrail({ auditTrail }: BookingAuditTrailProps) {
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

  return (
    <div style={{ 
      border: '1px solid #e5e7eb', 
      borderRadius: '0.5rem', 
      padding: '1.5rem',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}>
      <h2 style={{ 
        marginBottom: '1.5rem', 
        fontSize: '1.25rem', 
        fontWeight: '600',
        color: '#111827',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '0.75rem',
      }}>
        Audit Trail
      </h2>
      {auditTrail.length === 0 ? (
        <p style={{ color: '#6b7280', padding: '1rem' }}>No audit entries found</p>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '2rem' }}>
          {/* Vertical timeline line */}
          <div style={{
            position: 'absolute',
            left: '0.5rem',
            top: '0.5rem',
            bottom: '0.5rem',
            width: '2px',
            backgroundColor: '#d1d5db',
          }} />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {auditTrail.map((entry, index) => (
              <div
                key={entry.id}
                style={{
                  position: 'relative',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                }}
              >
                {/* Icon */}
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
                
                {/* Entry content */}
                <div style={{
                  flex: 1,
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                  padding: '1.25rem',
                  backgroundColor: '#f9fafb',
                }}>
                  <div style={{ display: 'grid', gap: '0.875rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <strong style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '500', minWidth: '130px' }}>Previous State:</strong>
                      <span style={{ color: '#111827', fontFamily: 'monospace', fontSize: '0.875rem' }}>{entry.previous_state}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <strong style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '500', minWidth: '130px' }}>New State:</strong>
                      <span style={{ color: '#111827', fontFamily: 'monospace', fontSize: '0.875rem' }}>{entry.new_state}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <strong style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '500', minWidth: '130px' }}>Actor:</strong>
                      <span style={{ color: '#111827' }}>{entry.actor}</span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '0.75rem',
                      paddingTop: '0.75rem',
                      marginTop: '0.25rem',
                      borderTop: '1px solid #e5e7eb',
                    }}>
                      <strong style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '500', minWidth: '130px' }}>Created At:</strong>
                      <span style={{ color: '#111827' }}>{formatTimestamp(entry.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
