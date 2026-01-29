'use client';

import { useState } from 'react';
import { sendOutboundMessage } from '@/lib/adminApi';

/**
 * ConversationSendBox Component (Manual Send Only)
 * 
 * WHAT IT DOES:
 * - Provides textarea and Send button for manual outbound messages
 * - Sends message via POST /admin/messages/outbound
 * - Resets textarea on success
 * - Shows error messages on failure
 * 
 * WHAT IT DOES NOT DO:
 * - No WhatsApp delivery
 * - No AI calls
 * - No booking creation
 * - No automation
 * - No AI markers or emojis
 * - No automatic state changes
 */

interface ConversationSendBoxProps {
  conversationId: string;
  onMessageSent?: () => void;
}

export default function ConversationSendBox({
  conversationId,
  onMessageSent,
}: ConversationSendBoxProps) {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!text.trim() || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await sendOutboundMessage({
        conversationId,
        text: text.trim(),
      });

      // Success: reset textarea and notify parent
      setText('');
      if (onMessageSent) {
        onMessageSent();
      }
    } catch (err) {
      // Error: show error message
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Shift+Enter for new line, Enter alone sends message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1rem',
        backgroundColor: '#ffffff',
      }}
    >
      <div style={{ marginBottom: '0.75rem' }}>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null); // Clear error when user types
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
          disabled={isLoading}
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#3b82f6';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
        />
      </div>

      {error && (
        <div
          style={{
            marginBottom: '0.75rem',
            padding: '0.5rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSend}
          disabled={!text.trim() || isLoading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: text.trim() && !isLoading ? '#3b82f6' : '#9ca3af',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: text.trim() && !isLoading ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (text.trim() && !isLoading) {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }
          }}
          onMouseLeave={(e) => {
            if (text.trim() && !isLoading) {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }
          }}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
