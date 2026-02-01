'use client';

import type { HumanInboxDetail, AIDecision } from '@/lib/adminApi';
import { getConversationSemanticStatus } from '@/lib/semanticStatus';
import StatusBadge from '@/components/admin/StatusBadge';
import ConversationMessages from '@/components/admin/ConversationMessages';
import Badge from '@/components/ui/badge';
import AIDebugPanel from '@/components/admin/AIDebugPanel';

/** Props for AIDebugPanel built from existing data (read adapter). Aligned with AISnapshotForMessage / API schema. */
interface AISnapshotPropsForPanel {
  relevant: boolean;
  relevance_confidence: number;
  relevance_reason?: string | null;
  intent: string | null;
  intent_confidence: number | null;
  model?: string | null;
}

interface HumanInboxDetailViewProps {
  detail: HumanInboxDetail;
  hasAIDraft?: boolean;
  ai_decision?: AIDecision | null;
  /** Optional: full AI snapshot per message_id (when backend provides it). */
  ai_snapshots_by_message_id?: Record<string, AISnapshotPropsForPanel> | null;
  /** Optional: message_id to bind the panel to. If not set, uses last inbound message. */
  selectedMessageId?: string | null;
}

/**
 * Returns snapshot props for the active message only.
 * Multi-message safety: panel must reflect the active message_id only.
 * - When ai_snapshots_by_message_id is provided: use only the snapshot for active message_id; if none, do not render.
 * - Do not fallback to another message's snapshot or conversation-level snapshot.
 * - If mismatch (snapshots exist but not for this message_id), return null.
 */
function buildSnapshotPropsForActiveMessage(
  detail: HumanInboxDetail,
  hasAIDraft: boolean,
  ai_decision: AIDecision | null | undefined,
  ai_snapshots_by_message_id: Record<string, AISnapshotPropsForPanel> | null | undefined,
  selectedMessageId: string | null | undefined
): AISnapshotPropsForPanel | null {
  const inboundMessages = detail.messages.filter((m) => m.direction === 'inbound');
  if (inboundMessages.length === 0) return null;

  const activeMessage =
    selectedMessageId != null
      ? detail.messages.find((m) => m.message_id === selectedMessageId && m.direction === 'inbound')
      : inboundMessages[inboundMessages.length - 1];
  if (activeMessage == null) return null;

  const messageId = activeMessage.message_id;

  if (ai_snapshots_by_message_id != null) {
    const snapshotForMessage = ai_snapshots_by_message_id[messageId];
    if (snapshotForMessage == null) return null;
    return snapshotForMessage;
  }

  return {
    relevant: activeMessage.intent != null,
    relevance_confidence: activeMessage.confidence ?? 0,
    relevance_reason: null,
    intent: activeMessage.intent ?? null,
    intent_confidence: activeMessage.confidence ?? null,
    model: activeMessage.model ?? null,
  };
}

export default function HumanInboxDetailView({
  detail,
  hasAIDraft = false,
  ai_decision = null,
  ai_snapshots_by_message_id = null,
  selectedMessageId = null,
}: HumanInboxDetailViewProps) {
  // F2.5.6.1 Snapshot Read Adapter: available inputs
  // - detail.messages: array used for ConversationMessages; each has message_id, direction, intent, confidence, model (from message_metadata intent_classification, not ai_snapshots)
  // - ai_decision: conversation-level { eligible, blockers } from buildAIDecisionSnapshot
  // - hasAIDraft: boolean from fetchAIDraft
  // - ai_snapshots_by_message_id: optional Record<message_id, snapshot> — currently not passed by page, so always null
  // No raw aiSnapshots array or ai_snapshots rows in memory; full snapshot fields (decision, reason, allow_draft, etc.) only if backend exposes them via ai_snapshots_by_message_id

  const snapshotProps = buildSnapshotPropsForActiveMessage(
    detail,
    hasAIDraft,
    ai_decision,
    ai_snapshots_by_message_id,
    selectedMessageId
  );
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Conversation Header */}
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
            Conversation
          </h2>
          {hasAIDraft ? (
            <Badge variant="outline">Drafts present</Badge>
          ) : detail.messages.some(msg => msg.direction === 'outbound') ? (
            <Badge variant="secondary">Live conversation</Badge>
          ) : null}
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>Conversation ID</strong>
            <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#111827' }}>{detail.conversation_id}</span>
          </div>
          <div>
            <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>Channel</strong>
            <span style={{ color: '#111827' }}>{detail.channel}</span>
          </div>
          <div>
            <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>Status</strong>
            <StatusBadge 
              status={getConversationSemanticStatus(
                { id: detail.conversation_id, status: detail.status },
                detail.messages.map(msg => ({
                  id: msg.message_id,
                  conversation_id: detail.conversation_id,
                  direction: msg.direction,
                  sender_identity: msg.sender_identity as 'customer' | 'human' | 'ai' | null,
                  created_at: msg.created_at,
                })),
                hasAIDraft
              )} 
            />
          </div>
          <div>
            <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>Created At</strong>
            <span style={{ color: '#111827' }}>{formatTimestamp(detail.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Booking Section */}
      {detail.booking ? (
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
            Booking
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>Booking ID</strong>
              <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#111827' }}>{detail.booking.booking_id}</span>
            </div>
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>Status</strong>
              <span style={{
                display: 'inline-block',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: '500',
                border: '1px solid #e5e7eb',
              }}>
                {formatStatus(detail.booking.status)}
              </span>
            </div>
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>Instructor ID</strong>
              <span style={{ color: '#111827' }}>{detail.booking.instructor_id}</span>
            </div>
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>Created At</strong>
              <span style={{ color: '#111827' }}>{formatTimestamp(detail.booking.created_at)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ 
          border: '1px solid #e5e7eb', 
          borderRadius: '0.5rem', 
          padding: '1.5rem',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        }}>
          <p style={{ color: '#6b7280', padding: '1rem' }}>No booking linked</p>
        </div>
      )}

      {/* AI Debug Panel — only when snapshot exists; placed above messages */}
      {snapshotProps != null && (
        <AIDebugPanel
          relevant={snapshotProps.relevant}
          relevance_confidence={snapshotProps.relevance_confidence}
          relevance_reason={snapshotProps.relevance_reason ?? null}
          intent={snapshotProps.intent}
          intent_confidence={snapshotProps.intent_confidence}
          model={snapshotProps.model ?? null}
        />
      )}

      {/* Messages Timeline */}
      <ConversationMessages messages={detail.messages} hasAIDraft={hasAIDraft} />
    </div>
  );
}
