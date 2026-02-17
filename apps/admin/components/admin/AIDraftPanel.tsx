'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendAIDraftApproval } from '@/lib/adminApi';
import { getDraftSemanticStatus } from '@/lib/semanticStatus';
import StatusBadge from '@/components/admin/StatusBadge';

interface AIDraftPanelProps {
  text: string;
  model: string;
  created_at: string;
  conversationId: string;
  alreadySent?: boolean;
  sentAt?: string;
  userRole?: string | null;
  messages?: Array<{
    id: string;
    conversation_id: string;
    direction?: 'inbound' | 'outbound' | null;
    sender_identity?: 'customer' | 'human' | 'ai' | null;
    created_at?: string;
  }>;
}

export default function AIDraftPanel({ 
  text, 
  model, 
  created_at, 
  conversationId,
  alreadySent = false,
  sentAt,
  userRole = null,
  messages = [],
}: AIDraftPanelProps) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(alreadySent);
  const [error, setError] = useState<string | null>(null);

  const allowedRoles = ['system_admin', 'human_approver'];
  const isAuthorized = userRole && allowedRoles.includes(userRole);

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

  const handleSend = async () => {
    setIsSending(true);
    setError(null);
    try {
      await sendAIDraftApproval(conversationId);
      setIsSent(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to send draft');
      setIsSending(false);
    }
  };

  if (isSent) {
    return (
      <div style={{ 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        borderRadius: '0.5rem', 
        padding: '1.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '0.75rem',
      }}>
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '600',
          color: 'rgba(226, 232, 240, 0.95)',
        }}>
          AI Suggestion
        </h2>
        <StatusBadge 
          status={getDraftSemanticStatus(null, messages)} 
        />
      </div>

        <div style={{
          padding: '0.75rem',
          backgroundColor: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '0.375rem',
          color: '#166534',
          fontSize: '0.875rem',
          marginBottom: '1rem',
        }}>
          Sent by human {sentAt ? `at ${formatTimestamp(sentAt)}` : 'successfully'}
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
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '0.75rem',
      }}>
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '600',
          color: 'rgba(226, 232, 240, 0.95)',
        }}>
          AI Suggestion
        </h2>
        <StatusBadge 
          status={getDraftSemanticStatus(
            { id: '', conversation_id: conversationId, created_at },
            messages
          )} 
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ 
          padding: '1rem',
          backgroundColor: '#f0f9ff',
          borderRadius: '0.375rem',
          border: '1px solid #bae6fd',
          fontStyle: 'italic',
          color: 'rgba(226, 232, 240, 0.95)',
          fontSize: '0.875rem',
          lineHeight: '1.5',
        }}>
          {text}
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '1rem',
        fontSize: '0.75rem',
        color: '#6b7280',
        marginBottom: '1rem',
      }}>
        <div>
          <strong style={{ color: '#6b7280' }}>Model: </strong>
          <span style={{ fontFamily: 'monospace' }}>{model}</span>
        </div>
        <div>
          <strong style={{ color: '#6b7280' }}>Generated: </strong>
          <span>{formatTimestamp(created_at)}</span>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.375rem',
          color: '#dc2626',
          fontSize: '0.875rem',
          marginBottom: '1rem',
        }}>
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
        onClick={handleSend}
        disabled={isSending || !isAuthorized}
        style={{
          padding: '0.625rem 1.25rem',
          backgroundColor: isSending ? 'rgba(255, 255, 255, 0.12)' : '#3b82f6',
          color: '#ffffff',
          border: 'none',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          cursor: isSending ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.15s ease',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          if (!isSending) {
            e.currentTarget.style.backgroundColor = '#2563eb';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSending) {
            e.currentTarget.style.backgroundColor = '#3b82f6';
          }
        }}
        onFocus={(e) => {
          if (!isSending) {
            e.currentTarget.style.outline = '2px solid #3b82f6';
            e.currentTarget.style.outlineOffset = '2px';
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
      >
        {isSending ? 'Sending...' : 'Send this reply'}
      </button>
    </div>
  );
}
