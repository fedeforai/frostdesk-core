'use client';

import { useState } from 'react';
import { resumeHumanConversation } from '@/lib/humanApi';

interface HumanResumeButtonProps {
  conversationId: string;
}

export default function HumanResumeButton({ conversationId }: HumanResumeButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setShowModal(true);
    setError(null);
  };

  const handleConfirm = async () => {
    setShowModal(false);
    setLoading(true);
    setError(null);

    try {
      await resumeHumanConversation(conversationId);
      window.location.reload();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to resume automation';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setError(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: loading ? '#d1d5db' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '1rem',
          fontWeight: '500',
          outline: 'none',
        }}
        onFocus={(e) => {
          if (!loading) {
            e.currentTarget.style.outline = '2px solid #10b981';
            e.currentTarget.style.outlineOffset = '2px';
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
        aria-label="Resume AI automation"
      >
        {loading ? 'Resuming...' : 'Resume AI'}
      </button>

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
              Resume AI Automation
            </h3>
            <p id="modal-description" style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
              Resuming AI will allow automation to continue for this conversation.
            </p>
            {error && (
              <div 
                role="alert"
                aria-live="polite"
                style={{ 
                  marginBottom: '1rem', 
                  padding: '0.75rem', 
                  backgroundColor: '#fee2e2', 
                  color: '#991b1b',
                  borderRadius: '0.375rem',
                  border: '1px solid #fca5a5',
                }}
              >
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                aria-label="Cancel resume"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
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
                aria-label="Confirm resume automation"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: loading ? '#d1d5db' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  if (!loading) {
                    e.currentTarget.style.outline = '2px solid #10b981';
                    e.currentTarget.style.outlineOffset = '2px';
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                {loading ? 'Resuming...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
