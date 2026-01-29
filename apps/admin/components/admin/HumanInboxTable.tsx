'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { HumanInboxItem } from '@/lib/adminApi';
import StatusBadge from '@/components/admin/StatusBadge';

/**
 * Simplified semantic status helper for inbox list (UI-only).
 * Works with available data in HumanInboxItem.
 * Note: Full accuracy for ai_draft_ready requires message_metadata check,
 * which is not available in list view. This is an approximation.
 */
function getConversationSemanticStatusFromItem(item: HumanInboxItem): 'new' | 'waiting_human' | 'ai_draft_ready' | 'closed' {
  if (item.status === 'closed') {
    return 'closed';
  }

  // If last message is inbound, likely new (no response yet)
  if (item.last_message?.direction === 'inbound') {
    return 'new';
  }

  // Default to waiting_human
  // Note: ai_draft_ready status would require checking message_metadata for 'ai_draft' key,
  // which is not available in the list view. Full accuracy is available in detail view.
  return 'waiting_human';
}

interface HumanInboxTableProps {
  items: HumanInboxItem[];
}

/**
 * READ-ONLY table for human inbox.
 * 
 * WHAT IT DOES:
 * - Displays channel, status, last message, last activity
 * - Makes rows clickable to navigate to conversation detail
 * - Pure presentation component
 * 
 * WHAT IT DOES NOT DO:
 * - No create
 * - No edit
 * - No delete
 * - No reply
 * - No routing logic
 * - No AI
 * - No automation
 * - No side effects
 * - No buttons
 * - No inline actions
 * - No mutations
 */
export default function HumanInboxTable({ items }: HumanInboxTableProps) {
  const router = useRouter();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const handleRowClick = (conversationId: string) => {
    router.push(`/admin/conversations/${conversationId}`);
  };

  const truncateText = (text: string | null, maxLength: number = 50) => {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const formatDirection = (direction: 'inbound' | 'outbound' | null) => {
    if (!direction) return '-';
    return direction.charAt(0).toUpperCase() + direction.slice(1);
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table 
        role="table"
        aria-label="Human inbox list"
        style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}
      >
        <thead>
          <tr style={{ backgroundColor: '#f9fafb' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Channel
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Status
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Last Message
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Direction
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Last Activity
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                No conversations found
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr
                key={item.conversation_id}
                role="row"
                tabIndex={0}
                onClick={() => handleRowClick(item.conversation_id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowClick(item.conversation_id);
                  }
                }}
                onMouseEnter={() => setHoveredRow(item.conversation_id)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{
                  cursor: 'pointer',
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: hoveredRow === item.conversation_id ? '#f9fafb' : 'transparent',
                  transition: 'background-color 0.15s ease',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.outline = '2px solid #3b82f6';
                  e.currentTarget.style.outlineOffset = '-2px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.outline = 'none';
                }}
                aria-label={`View conversation ${item.conversation_id}`}
              >
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', color: '#111827' }}>
                  {item.channel}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', color: '#111827' }}>
                  <StatusBadge 
                    status={getConversationSemanticStatusFromItem(item)} 
                    size="sm"
                  />
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', color: '#111827', maxWidth: '300px', wordBreak: 'break-word' }}>
                  {truncateText(item.last_message.text)}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', color: '#111827' }}>
                  {formatDirection(item.last_message.direction)}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', color: '#111827' }}>
                  {new Date(item.last_activity_at).toLocaleString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
