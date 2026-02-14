'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import MessageBubble, { type ReplyStatus } from './MessageBubble';
import ReplyInput from './ReplyInput';
import TypingIndicator from './TypingIndicator';
import DecisionTransparencyNote from './DecisionTransparencyNote';
import { sendInstructorReply, patchConversationAiState } from '@/lib/instructorApi';
import type { InstructorInboxItem } from '@/lib/instructorApi';
import type { ConversationAiState } from '@/lib/instructorApi';

type BookingStatusForNote = 'draft' | 'pending' | 'confirmed' | null;

interface InstructorConversationViewProps {
  conversationId: string;
  inboxItem: InstructorInboxItem | null;
  onToast?: (message: string) => void;
  /** STEP 6.0 — When true, show "Why you're seeing this" (only when SuggestedReplyBox is present). */
  showTransparencyNote?: boolean;
  /** STEP 6.0 — Booking status for transparency copy. If not provided, derived from inboxItem.status. */
  bookingStatus?: BookingStatusForNote;
}

type DisplayMessage = {
  id: string;
  direction: 'inbound' | 'outbound';
  text: string;
  created_at: string;
};

function getInitialMessages(inboxItem: InstructorInboxItem | null): DisplayMessage[] {
  if (!inboxItem?.last_message) return [];
  const lm = inboxItem.last_message;
  return [
    {
      id: 'last',
      direction: lm.direction,
      text: lm.text,
      created_at: lm.created_at,
    },
  ];
}

const DELIVERED_DELAY_MS_MIN = 1500;
const DELIVERED_DELAY_MS_MAX = 2500;

function randomDelay(): number {
  return DELIVERED_DELAY_MS_MIN + Math.random() * (DELIVERED_DELAY_MS_MAX - DELIVERED_DELAY_MS_MIN);
}

function deriveBookingStatus(status: string | undefined): BookingStatusForNote {
  if (status === 'draft' || status === 'pending' || status === 'confirmed') return status;
  return null;
}

export default function InstructorConversationView({
  conversationId,
  inboxItem,
  onToast,
  showTransparencyNote = false,
  bookingStatus: bookingStatusProp,
}: InstructorConversationViewProps) {
  const bookingStatus: BookingStatusForNote =
    bookingStatusProp ?? deriveBookingStatus(inboxItem?.status);
  const [messages, setMessages] = useState<DisplayMessage[]>(() => getInitialMessages(inboxItem));
  const [replyStatus, setReplyStatus] = useState<ReplyStatus>('idle');
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [typingState, setTypingState] = useState<'idle' | 'typing'>('idle');
  const [aiState, setAiState] = useState<ConversationAiState | null>(null);
  const [aiStateLoading, setAiStateLoading] = useState(false);
  const [aiStateError, setAiStateError] = useState<string | null>(null);
  const deliveredTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string) => {
    setErrorToast(message);
    setTimeout(() => setErrorToast(null), 5000);
  }, []);

  const clearDeliveredTimeout = useCallback(() => {
    if (deliveredTimeoutRef.current) {
      clearTimeout(deliveredTimeoutRef.current);
      deliveredTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    setMessages(getInitialMessages(inboxItem));
    setReplyStatus('idle');
    setTypingState('idle');
    clearDeliveredTimeout();
  }, [conversationId, inboxItem?.conversation_id, clearDeliveredTimeout]);

  useEffect(() => {
    return () => {
      clearDeliveredTimeout();
    };
  }, [clearDeliveredTimeout]);

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      clearDeliveredTimeout();
      setTypingState('idle');
      const optimisticId = `opt-${Date.now()}`;
      const now = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        { id: optimisticId, direction: 'outbound', text: trimmed, created_at: now },
      ]);
      setReplyStatus('sending');

      try {
        await sendInstructorReply(conversationId, { text: trimmed });
        setReplyStatus('sent');

        deliveredTimeoutRef.current = setTimeout(() => {
          deliveredTimeoutRef.current = null;
          setReplyStatus('delivered');
        }, randomDelay());
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setReplyStatus('idle');
        (onToast ?? showToast)('Message not sent. Try again.');
      }
    },
    [conversationId, onToast, showToast, clearDeliveredTimeout]
  );

  const handleTypingStart = useCallback(() => {
    setTypingState('typing');
  }, []);

  const handleTypingStop = useCallback(() => {
    setTypingState('idle');
  }, []);

  const handleTakeOver = useCallback(async () => {
    setAiStateError(null);
    setAiStateLoading(true);
    try {
      await patchConversationAiState(conversationId, { ai_state: 'ai_paused_by_human' });
      setAiState('ai_paused_by_human');
    } catch (e: unknown) {
      const err = e as { message?: string };
      setAiStateError(err?.message ?? 'Failed to pause AI');
    } finally {
      setAiStateLoading(false);
    }
  }, [conversationId]);

  const handleResumeAi = useCallback(async () => {
    setAiStateError(null);
    setAiStateLoading(true);
    try {
      await patchConversationAiState(conversationId, { ai_state: 'ai_on' });
      setAiState('ai_on');
    } catch (e: unknown) {
      const err = e as { message?: string };
      setAiStateError(err?.message ?? 'Failed to resume AI');
    } finally {
      setAiStateLoading(false);
    }
  }, [conversationId]);

  const outboundMessages = messages.filter((m) => m.direction === 'outbound');
  const latestOutboundId = outboundMessages.length > 0
    ? outboundMessages[outboundMessages.length - 1].id
    : null;

  const formatChannel = (channel: string): string => {
    if (channel.toLowerCase() === 'whatsapp') return 'WhatsApp';
    return channel.charAt(0).toUpperCase() + channel.slice(1);
  };

  const channelLabel = inboxItem ? formatChannel(inboxItem.channel) : 'Unknown';

  return (
    <div style={{ padding: '1.5rem', maxWidth: '720px', margin: '0 auto' }}>
      <Link
        href="/instructor/inbox"
        style={{
          display: 'inline-block',
          marginBottom: '1rem',
          color: '#3b82f6',
          fontSize: '0.875rem',
          textDecoration: 'none',
        }}
      >
        ← Back to Inbox
      </Link>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
        Conversation
      </h1>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
        Reply to the latest message. Status is local (simulated).
      </p>

      <div
        style={{
          fontSize: '0.75rem',
          color: '#6b7280',
          marginBottom: '0.75rem',
          padding: '0.5rem 0',
        }}
      >
        {channelLabel} • Guest message
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
        <span style={{ fontSize: 12, color: '#6b7280' }}>
          {aiState === 'ai_paused_by_human' ? 'AI paused' : aiState === 'ai_on' ? 'AI on' : 'AI: —'}
        </span>
        <button
          type="button"
          style={{
            padding: '4px 10px',
            fontSize: 12,
            border: '1px solid #d1d5db',
            borderRadius: 4,
            background: '#fff',
            cursor: aiStateLoading ? 'not-allowed' : 'pointer',
          }}
          disabled={aiStateLoading}
          onClick={() => void handleTakeOver()}
        >
          {aiStateLoading ? '…' : 'Take over'}
        </button>
        <button
          type="button"
          style={{
            padding: '4px 10px',
            fontSize: 12,
            border: '1px solid #d1d5db',
            borderRadius: 4,
            background: '#fff',
            cursor: aiStateLoading ? 'not-allowed' : 'pointer',
          }}
          disabled={aiStateLoading}
          onClick={() => void handleResumeAi()}
        >
          Resume AI
        </button>
        {aiStateError && (
          <span style={{ fontSize: 12, color: '#b91c1c' }}>{aiStateError}</span>
        )}
      </div>

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '1rem',
          backgroundColor: '#fafafa',
          marginBottom: '1rem',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              padding: '2rem 1rem',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500, margin: '0 0 0.5rem 0' }}>
              This conversation hasn't started yet.
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
              You'll be able to reply
              <br />
              as soon as the guest sends a message.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              text={msg.text}
              direction={msg.direction}
              created_at={msg.created_at}
              isOutbound={msg.direction === 'outbound'}
              isLatestOutbound={msg.id === latestOutboundId}
              status={msg.id === latestOutboundId ? replyStatus : 'idle'}
            />
          ))
        )}
        <TypingIndicator visible={typingState === 'typing'} />
      </div>

      {errorToast && (
        <div
          role="alert"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.375rem',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          {errorToast}
        </div>
      )}

      <DecisionTransparencyNote
        bookingStatus={bookingStatus}
        showNote={showTransparencyNote}
      />

      {bookingStatus != null && (
        <div style={{ marginBottom: '1rem', fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 }}>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Payment & confirmation</div>
          <div>
            You confirm the lesson; payment is handled separately and finalizes the booking. You can share the payment link when you're ready.
          </div>
          <div style={{ marginTop: '0.25rem' }}>
            Until then, this booking should be considered a reservation.
          </div>
        </div>
      )}
      <div style={{ fontSize: '0.6875rem', color: '#9ca3af', lineHeight: 1.4, marginBottom: '1rem' }}>
        Some features shown here may require an active subscription.
      </div>

      <ReplyInput
        conversationId={conversationId}
        replyStatus={replyStatus}
        onSend={handleSend}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        disabled={messages.length === 0}
        isEmpty={messages.length === 0}
      />
    </div>
  );
}
