'use client';

import MessageItem from './MessageItem';
import Badge from '@/components/ui/badge';
import AIDraftEligibilityPanel from './AIDraftEligibilityPanel';

interface Message {
  message_id: string;
  direction: 'inbound' | 'outbound';
  message_text: string | null;
  sender_identity: 'customer' | 'human' | 'ai' | string | null;
  created_at: string;
  intent?: string | null;
  confidence?: number | null;
  model?: string | null;
}

interface ConversationMessagesProps {
  messages: Message[];
  hasAIDraft?: boolean; // True if there's an AI draft that hasn't been sent
  error?: boolean; // True if messages could not be loaded
  // AI eligibility props (from resolveDraftEligibility)
  showDraftSection?: boolean;
  showEscalationBanner?: boolean;
  explanationKey?: string;
  draftText?: string;
}

/**
 * ConversationMessages Component
 * 
 * Displays all messages in a conversation with:
 * - Individual message badges (AI Draft, Sent, Human)
 * - Conversation-level context badge (Drafts present / Live conversation)
 */
export default function ConversationMessages({
  messages,
  hasAIDraft = false,
  error = false,
  showDraftSection = false,
  showEscalationBanner = false,
  explanationKey = 'AI_DECISION_MISSING',
  draftText,
}: ConversationMessagesProps) {
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

  // Determine if there are any AI drafts (outbound AI messages that haven't been sent)
  // For now, we use hasAIDraft prop, but we could also check if there are outbound AI messages
  // that don't have a corresponding human approval
  const hasDrafts = hasAIDraft || messages.some(
    msg => msg.direction === 'outbound' && msg.sender_identity === 'ai'
  );

  // Check if all outbound messages are sent (have human approval or are human-written)
  const allMessagesSent = messages
    .filter(msg => msg.direction === 'outbound')
    .every(msg => msg.sender_identity === 'human' || (msg.sender_identity === 'ai' && !hasAIDraft));

  // Determine conversation-level badge
  const getConversationBadge = () => {
    if (hasDrafts) {
      return <Badge variant="outline">Drafts present</Badge>;
    }
    if (allMessagesSent && messages.some(msg => msg.direction === 'outbound')) {
      return <Badge variant="secondary">Live conversation</Badge>;
    }
    return null;
  };

  const conversationBadge = getConversationBadge();

  // Determine if a message is an AI draft
  // An AI draft is an outbound AI message that hasn't been sent (no human approval after it)
  const isAIDraft = (message: Message, index: number): boolean => {
    if (message.direction !== 'outbound' || message.sender_identity !== 'ai') {
      return false;
    }

    // If hasAIDraft prop is true and this is the latest AI outbound message, it's likely a draft
    if (hasAIDraft) {
      const aiOutboundMessages = messages
        .map((msg, idx) => ({ msg, idx }))
        .filter(({ msg }) => msg.direction === 'outbound' && msg.sender_identity === 'ai')
        .sort((a, b) => new Date(b.msg.created_at).getTime() - new Date(a.msg.created_at).getTime());
      
      if (aiOutboundMessages.length > 0 && aiOutboundMessages[0].idx === index) {
        // Check if there's a human message after this AI message
        const messagesAfter = messages.slice(index + 1);
        const hasHumanAfter = messagesAfter.some(msg => 
          msg.direction === 'outbound' && msg.sender_identity === 'human'
        );
        return !hasHumanAfter;
      }
    }

    return false;
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
          color: 'rgba(226, 232, 240, 0.95)',
          margin: 0,
        }}>
          Messages
        </h2>
        {conversationBadge}
      </div>
      {error ? (
        <div style={{ 
          padding: '1.5rem', 
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb',
        }}>
          <p style={{ color: '#374151', fontSize: '0.875rem', fontWeight: '500', margin: '0 0 0.5rem 0' }}>
            Messages could not be loaded
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: 0 }}>
            Please try again later
          </p>
        </div>
      ) : messages.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
            No messages yet
          </p>
        </div>
      ) : (
        <>
          {/* AI Draft Eligibility Panel (escalation banner + draft section) */}
          <AIDraftEligibilityPanel
            showDraftSection={showDraftSection}
            showEscalationBanner={showEscalationBanner}
            explanationKey={explanationKey}
            draftText={draftText}
          />

          {/* Check if there are any outbound messages */}
          {!messages.some(msg => msg.direction === 'outbound') && (
            <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                No replies have been sent yet
              </p>
              {hasAIDraft && (
                <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
                  AI drafts are available for review
                </p>
              )}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((message, index) => (
              <MessageItem
                key={message.message_id}
                message={message}
                formatTimestamp={formatTimestamp}
                isAIDraft={isAIDraft(message, index)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
