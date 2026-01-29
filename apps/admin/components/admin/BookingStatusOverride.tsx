'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { overrideAdminBookingStatus } from '@/lib/adminApi';

interface BookingStatusOverrideProps {
  bookingId: string;
  currentStatus: string;
  userRole: string | null;
}

export default function BookingStatusOverride({ bookingId, currentStatus, userRole }: BookingStatusOverrideProps) {
  const router = useRouter();
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedRoles = ['system_admin', 'human_approver'];
  const isAuthorized = userRole && allowedRoles.includes(userRole);

  // Allowed booking states (hardcoded from backend enum)
  const bookingStates: Array<'draft' | 'proposed' | 'confirmed' | 'cancelled' | 'expired'> = [
    'draft',
    'proposed',
    'confirmed',
    'cancelled',
    'expired',
  ];

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newStatus) {
      setError('Please select a new status');
      return;
    }

    setShowModal(true);
  };

  const handleConfirm = async () => {
    setShowModal(false);
    setLoading(true);
    setError(null);

    try {
      // POST override_booking_status
      await overrideAdminBookingStatus(bookingId, {
        newStatus,
        reason: reason || undefined,
      });
      // On success: reload page
      window.location.reload();
    } catch (err: any) {
      // On error: handle based on status code
      const status = err.status || 500;
      
      if (status === 403) {
        // 403 → redirect /admin/not-authorized
        router.push('/admin/not-authorized');
        return;
      }
      
      // Show error message for other status codes
      let errorMessage = 'Failed to override booking status';
      if (status === 404) {
        // 404 → mostra "Booking not found"
        errorMessage = 'Booking not found';
      } else if (status === 409) {
        // 409 → mostra messaggio backend (transition not allowed)
        errorMessage = `Invalid transition: ${currentStatus} → ${newStatus}`;
      } else if (status === 500) {
        // 500 → errore generico
        errorMessage = 'Server error';
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.25rem', padding: '1.5rem', marginTop: '2rem' }}>
      <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Override Booking Status</h2>
      
      <form onSubmit={(e) => e.preventDefault()}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Current Status: <strong>{currentStatus}</strong>
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="newStatus" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            New Status *
          </label>
          <select
            id="newStatus"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            disabled={loading}
            required
            aria-required="true"
            aria-label="Select new booking status"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              fontSize: '1rem',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <option value="">Select status</option>
            {bookingStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="reason" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Reason (optional)
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
            rows={3}
            aria-label="Optional reason for status override"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              fontSize: '1rem',
              fontFamily: 'inherit',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {error && (
          <div 
            role="alert"
            aria-live="polite"
            style={{ 
              marginBottom: '1rem', 
              padding: '0.75rem', 
              backgroundColor: '#fee2e2', 
              color: '#991b1b',
              borderRadius: '0.25rem',
              border: '1px solid #fca5a5',
            }}
          >
            {error}
          </div>
        )}

        {!isAuthorized && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.375rem',
            color: '#991b1b',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}>
            Not authorized
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmitClick}
          disabled={loading || !newStatus || !isAuthorized}
          aria-label="Override booking status"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: loading || !newStatus ? '#d1d5db' : '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: loading || !newStatus ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
            outline: 'none',
          }}
          onFocus={(e) => {
            if (!loading && newStatus) {
              e.currentTarget.style.outline = '2px solid #3b82f6';
              e.currentTarget.style.outlineOffset = '2px';
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          Override Status
        </button>
      </form>

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleCancel}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '0.5rem',
              maxWidth: '500px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="modal-title" style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>
              Confirm Status Override
            </h3>
            <p id="modal-description" style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
              This action will permanently override the booking status.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                aria-label="Cancel status override"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  if (!loading) {
                    e.currentTarget.style.outline = '2px solid #3b82f6';
                    e.currentTarget.style.outlineOffset = '2px';
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                aria-label="Confirm status override"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: loading ? '#d1d5db' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  if (!loading) {
                    e.currentTarget.style.outline = '2px solid #3b82f6';
                    e.currentTarget.style.outlineOffset = '2px';
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                {loading ? 'Overriding...' : 'Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
