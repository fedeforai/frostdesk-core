'use client';

import { useState } from 'react';
import type { ReplyStatus } from './MessageBubble';

export interface ReplyInputProps {
  conversationId: string;
  replyStatus: ReplyStatus;
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
}

export default function ReplyInput({
  conversationId,
  replyStatus,
  onSend,
  disabled = false,
}: ReplyInputProps) {
  const [text, setText] = useState('');
  const isSending = replyStatus === 'sending';
  const isDisabled = disabled || isSending;
  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && !isSending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    const toSend = trimmed;
    setText('');
    await onSend(toSend);
  };

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        padding: '1rem',
        backgroundColor: '#ffffff',
        marginTop: '1rem',
      }}
    >
      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isDisabled}
          placeholder="Type your reply..."
          rows={3}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          aria-label="Reply message"
        />
        <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={!canSend}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: canSend ? '#3b82f6' : '#9ca3af',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: canSend ? 'pointer' : 'not-allowed',
            }}
          >
            {isSending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
