'use client';

import { useState } from 'react';
import type { ConversationMessage } from '@/lib/humanApi';

interface HumanConversationMessagesProps {
  messages: ConversationMessage[];
}

export default function HumanConversationMessages({ messages }: HumanConversationMessagesProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table 
        role="table"
        aria-label="Conversation messages"
        style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}
      >
        <thead>
          <tr style={{ backgroundColor: '#f9fafb' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Direction
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Content
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Created At
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Instructor ID
            </th>
          </tr>
        </thead>
        <tbody>
          {messages.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                No messages found
              </td>
            </tr>
          ) : (
            messages.map((msg) => (
              <tr
                key={msg.id}
                onMouseEnter={() => setHoveredRow(msg.id)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: hoveredRow === msg.id ? '#f9fafb' : 'transparent',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                  {msg.direction}
                </td>
                <td
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxWidth: '600px',
                    maxHeight: '300px',
                    overflow: 'auto',
                  }}
                  title={msg.content}
                >
                  {msg.content}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                  {new Date(msg.created_at).toLocaleString()}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                  {msg.instructor_id ?? 'N/A'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
