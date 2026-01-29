'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { HumanInboxItem } from '@/lib/humanApi';

interface HumanInboxTableProps {
  items: HumanInboxItem[];
}

export default function HumanInboxTable({ items }: HumanInboxTableProps) {
  const router = useRouter();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const handleRowClick = (conversationId: string) => {
    router.push(`/human/inbox/${conversationId}`);
  };

  const truncateText = (text: string | null, maxLength: number = 50) => {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table 
        role="table"
        aria-label="Human inbox conversations list"
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
              Last Message Preview
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Last Message At
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Created At
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                No conversations requiring human intervention
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const isPreviewTruncated = item.last_message_preview && item.last_message_preview.length > 50;
              return (
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
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {item.conversation_id}
                  </td>
                  <td 
                    style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}
                    title={item.customer_identifier}
                  >
                    {item.customer_identifier}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {item.instructor_id ?? 'N/A'}
                  </td>
                  <td 
                    style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}
                    title={isPreviewTruncated ? item.last_message_preview || undefined : undefined}
                  >
                    {truncateText(item.last_message_preview)}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {item.last_message_at ? new Date(item.last_message_at).toLocaleString() : 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {new Date(item.created_at).toLocaleString()}
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
