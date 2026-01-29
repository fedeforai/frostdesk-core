'use client';

import { useState } from 'react';
import type { AdminMessageSummary } from '@/lib/adminApi';

interface MessagesTableProps {
  messages: AdminMessageSummary[];
}

export default function MessagesTable({ messages }: MessagesTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table 
        role="table"
        aria-label="Messages list"
        style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}
      >
        <thead>
          <tr style={{ backgroundColor: '#f9fafb' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Created At
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Role
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Direction
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Instructor ID
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
              Content
            </th>
          </tr>
        </thead>
        <tbody>
          {messages.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
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
                  {new Date(msg.created_at).toLocaleString()}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                  {msg.role || 'N/A'}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                  {msg.direction}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                  {msg.instructor_id ?? 'N/A'}
                </td>
                <td
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxWidth: '500px',
                    maxHeight: '200px',
                    overflow: 'auto',
                  }}
                  title={msg.content}
                >
                  {msg.content}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
