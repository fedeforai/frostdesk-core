'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ConversationSummary } from '@/lib/adminApi';

interface ConversationsTableProps {
  conversations: ConversationSummary[];
}

export default function ConversationsTable({ conversations }: ConversationsTableProps) {
  const router = useRouter();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const handleRowClick = (conversationId: string) => {
    router.push(`/admin/conversations/${conversationId}`);
  };

  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table 
        role="table"
        aria-label="Conversations list"
        style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}
      >
        <thead>
          <tr style={{ backgroundColor: '#f9fafb' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Conversation ID
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Customer Identifier
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Instructor ID
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              State
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Created At
            </th>
          </tr>
        </thead>
        <tbody>
          {conversations.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                No conversations found
              </td>
            </tr>
          ) : (
            conversations.map((conv) => {
              const customerIdentifier = conv.customer_phone || conv.customer_name || 'N/A';
              const isTruncated = customerIdentifier.length > 30;
              return (
                <tr
                  key={conv.id}
                  role="row"
                  tabIndex={0}
                  onClick={() => handleRowClick(conv.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRowClick(conv.id);
                    }
                  }}
                  onMouseEnter={() => setHoveredRow(conv.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    cursor: 'pointer',
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: hoveredRow === conv.id ? '#f9fafb' : 'transparent',
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
                  aria-label={`View conversation ${conv.id}`}
                >
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {conv.id}
                  </td>
                  <td 
                    style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}
                    title={isTruncated ? customerIdentifier : undefined}
                  >
                    {isTruncated ? truncateText(customerIdentifier) : customerIdentifier}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {conv.instructor_id}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.625rem',
                      borderRadius: '0.375rem',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      border: '1px solid #e5e7eb',
                    }}>
                      {formatStatus(conv.status)}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {new Date(conv.created_at).toLocaleString()}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
