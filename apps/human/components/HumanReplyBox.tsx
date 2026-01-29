'use client';

import { useState } from 'react';
import { sendHumanReply } from '@/lib/humanApi';

interface HumanReplyBoxProps {
  conversationId: string;
}

export default function HumanReplyBox({ conversationId }: HumanReplyBoxProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await sendHumanReply({
        conversationId,
        content: content.trim(),
      });

      // On success: reload page
      window.location.reload();
    } catch (err: any) {
      // On error: show backend error message
      const errorMessage = err.message || 'Failed to send reply';
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      border: '1px solid #e5e7eb', 
      borderRadius: '0.5rem', 
      padding: '1.5rem',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      marginTop: '2rem',
    }}>
      <h2 style={{ 
        marginBottom: '1rem', 
        fontSize: '1.25rem', 
        fontWeight: '600',
        color: '#111827',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '0.75rem',
      }}>
        Send Reply
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            rows={4}
            placeholder="Type your reply..."
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '1rem',
              fontFamily: 'inherit',
              resize: 'vertical',
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
            aria-label="Reply message content"
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
              borderRadius: '0.375rem',
              border: '1px solid #fca5a5',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !content.trim()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: loading || !content.trim() ? '#d1d5db' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: loading || !content.trim() ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
            outline: 'none',
          }}
          onFocus={(e) => {
            if (!loading && content.trim()) {
              e.currentTarget.style.outline = '2px solid #3b82f6';
              e.currentTarget.style.outlineOffset = '2px';
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          aria-label="Send reply as human"
        >
          {loading ? 'Sending...' : 'Send as human'}
        </button>
      </form>
    </div>
  );
}
