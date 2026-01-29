import { fetchConversationMessages, fetchConversationDetails } from '@/lib/humanApi';
import { fetchConversationObservability } from '@/lib/humanObservabilityApi';
import HumanConversationMessages from '@/components/HumanConversationMessages';
import HumanReplyBox from '@/components/HumanReplyBox';
import { HumanResumeAIButton } from '@/components/HumanResumeAIButton';
import { HumanObservabilityPanel } from '@/components/HumanObservabilityPanel';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface ConversationDetailPageProps {
  params: {
    conversationId: string;
  };
  searchParams: {
    limit?: string;
    offset?: string;
  };
}

export const dynamic = 'force-dynamic';

export default async function ConversationDetailPage({
  params,
  searchParams,
}: ConversationDetailPageProps) {
  const conversationId = params.conversationId;
  const limit = searchParams.limit ? Number(searchParams.limit) : 50;
  const offset = searchParams.offset ? Number(searchParams.offset) : 0;

  try {
    const [messagesData, conversationDetails, observability] = await Promise.all([
      fetchConversationMessages({
        conversationId,
        limit,
        offset,
      }),
      fetchConversationDetails(conversationId),
      fetchConversationObservability(conversationId).catch(() => null),
    ]);

    const showReplyBox = true;

    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            href="/human/inbox"
            style={{
              color: '#3b82f6',
              textDecoration: 'none',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              marginBottom: '1rem',
              transition: 'color 0.15s ease',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid #3b82f6';
              e.currentTarget.style.outlineOffset = '2px';
              e.currentTarget.style.borderRadius = '0.25rem';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
            aria-label="Back to human inbox"
          >
            ← Back to Human Inbox
          </Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                Conversation Detail
              </h1>
              <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '1.5rem' }}>
                Human review — automation paused
              </p>
            </div>
            {conversationDetails && (
              <HumanResumeAIButton conversationId={conversationDetails.id} />
            )}
          </div>
        </div>
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
            Messages
          </h2>
          <HumanConversationMessages messages={messagesData.items} />
        </div>
        {observability && (
          <div style={{ marginTop: '1.5rem' }}>
            <HumanObservabilityPanel data={observability} />
          </div>
        )}
        {showReplyBox && (
          <HumanReplyBox conversationId={conversationId} />
        )}
      </div>
    );
  } catch (error: any) {
    const status = error.status || 500;

    // 401 → redirect to login
    if (status === 401) {
      redirect('/login');
    }

    // 404 → conversation not found
    if (status === 404) {
      return (
        <div style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <Link
              href="/human/inbox"
              style={{
                color: '#3b82f6',
                textDecoration: 'none',
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                marginBottom: '1rem',
              }}
            >
              ← Back to Human Inbox
            </Link>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
              Conversation Detail
            </h1>
          </div>
          <div style={{ 
            padding: '3rem 2rem', 
            textAlign: 'center',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          }}>
            <div style={{ 
              fontSize: '3rem', 
              marginBottom: '1rem',
              lineHeight: '1',
            }}>
              🔍
            </div>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '600',
              color: '#111827',
              marginBottom: '0.5rem',
            }}>
              Conversation not found
            </h2>
          </div>
        </div>
      );
    }

    // 500 → static error message
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            href="/human/inbox"
            style={{
              color: '#3b82f6',
              textDecoration: 'none',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              marginBottom: '1rem',
            }}
          >
            ← Back to Human Inbox
          </Link>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
            Conversation Detail
          </h1>
        </div>
        <div style={{ 
          padding: '3rem 2rem', 
          textAlign: 'center',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{ 
            fontSize: '3rem', 
            marginBottom: '1rem',
            lineHeight: '1',
          }}>
            ⚠️
          </div>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '600',
            color: '#111827',
            marginBottom: '0.5rem',
          }}>
            Unable to load conversation
          </h2>
        </div>
      </div>
    );
  }
}
