import { fetchConversationTimelineEvents } from '@/lib/adminApi';
import SemanticTimeline from '@/components/admin/SemanticTimeline';
import ErrorState from '@/components/admin/ErrorState';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import Link from 'next/link';

interface ConversationTimelinePageProps {
  params: {
    conversationId: string;
  };
}

export default async function ConversationTimelinePage({ params }: ConversationTimelinePageProps) {
  const { conversationId } = params;

  try {
    const data = await fetchConversationTimelineEvents(conversationId);

    if (!data.ok || !data.events) {
      return (
        <div style={{ padding: '2rem' }}>
          <Breadcrumbs items={[
            { label: 'Admin', href: '/admin' },
            { label: 'Conversations', href: '/admin/conversations' },
            { label: 'Timeline', href: `/admin/conversations/${conversationId}/timeline` },
          ]} />
          <div style={{ marginBottom: '1.5rem' }}>
            <Link
              href={`/admin/conversations/${conversationId}`}
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
              ← Back to Conversation
            </Link>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
              Conversation Timeline
            </h1>
          </div>
          <ErrorState status={500} message="Failed to fetch timeline events" />
        </div>
      );
    }

    return (
      <div style={{ padding: '2rem' }}>
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Conversations', href: '/admin/conversations' },
          { label: 'Timeline', href: `/admin/conversations/${conversationId}/timeline` },
        ]} />
        <div style={{ marginBottom: '2rem' }}>
          <Link
            href={`/admin/conversations/${conversationId}`}
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
            ← Back to Conversation
          </Link>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.5rem' }}>
            Conversation Timeline
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Complete chronological history of messages, AI drafts, approvals, and booking events
          </p>
        </div>
        
        <SemanticTimeline events={data.events} />
      </div>
    );
  } catch (error: any) {
    return (
      <div style={{ padding: '2rem' }}>
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Conversations', href: '/admin/conversations' },
          { label: 'Timeline', href: `/admin/conversations/${conversationId}/timeline` },
        ]} />
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            href={`/admin/conversations/${conversationId}`}
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
            ← Back to Conversation
          </Link>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
            Conversation Timeline
          </h1>
        </div>
        <ErrorState
          status={error.status || 500}
          message={error.message || 'Failed to load conversation timeline'}
        />
      </div>
    );
  }
}
