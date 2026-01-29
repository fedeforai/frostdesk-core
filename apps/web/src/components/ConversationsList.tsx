import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getAdminConversations, ConversationSummary, AdminListResponse } from '../lib/api';

export default function ConversationsList() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserId() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    }
    fetchUserId();
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const currentUserId = userId; // Capture for closure

    async function fetchConversations() {
      setLoading(true);
      setError(null);
      try {
        const data: AdminListResponse<ConversationSummary> = await getAdminConversations(currentUserId, {
          limit,
          offset,
        });
        setConversations(data.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load conversations');
      } finally {
        setLoading(false);
      }
    }

    fetchConversations();
  }, [userId, limit, offset]);

  const handleRowClick = (conversationId: string) => {
    // Placeholder for future detail page
    console.log('Navigate to conversation detail:', conversationId);
  };

  const handlePrevious = () => {
    if (offset >= limit) {
      setOffset(offset - limit);
    }
  };

  const handleNext = () => {
    setOffset(offset + limit);
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading conversations...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', color: '#dc2626' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Conversations</h1>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600' }}>
                Conversation ID
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600' }}>
                Customer Identifier
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600' }}>
                Instructor ID
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600' }}>
                State
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600' }}>
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
              conversations.map((conv) => (
                <tr
                  key={conv.id}
                  onClick={() => handleRowClick(conv.id)}
                  style={{
                    cursor: 'pointer',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {conv.id}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {conv.customer_phone || conv.customer_name || 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {conv.instructor_id}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {conv.status}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                    {new Date(conv.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button
          onClick={handlePrevious}
          disabled={offset === 0}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: offset === 0 ? '#d1d5db' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: offset === 0 ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
          }}
        >
          Previous
        </button>
        <span style={{ color: '#6b7280' }}>
          Showing {offset + 1} - {offset + conversations.length}
        </span>
        <button
          onClick={handleNext}
          disabled={conversations.length < limit}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: conversations.length < limit ? '#d1d5db' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: conversations.length < limit ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
