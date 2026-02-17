import { fetchHumanInboxDetail, fetchAIDraft } from '@/lib/adminApi';
import { getUserRole } from '@/lib/getUserRole';
import HumanInboxDetailView from '@/components/admin/HumanInboxDetailView';
import AIDecisionPanel from '@/components/admin/AIDecisionPanel';
import AIDraftPanel from '@/components/admin/AIDraftPanel';
import AIStatusPanel from '@/components/admin/AIStatusPanel';
import AIQuotaPanel from '@/components/admin/AIQuotaPanel';
import ErrorState from '@/components/admin/ErrorState';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import Link from 'next/link';

interface HumanInboxDetailPageProps {
  params: {
    conversationId: string;
  };
}

export default async function HumanInboxDetailPage({ params }: HumanInboxDetailPageProps) {
  const conversationId = params.conversationId;

  try {
    const data = await fetchHumanInboxDetail(conversationId);
    const userRole = await getUserRole();
    
    let draftData = null;
    try {
      draftData = await fetchAIDraft(conversationId);
    } catch {
      // Draft may not exist, continue without it
    }

    if (!data.detail) {
      return (
        <div style={{ padding: '2rem' }}>
          <Breadcrumbs items={[
            { label: 'Admin', href: '/admin' },
            { label: 'Human Inbox', href: '/admin/human-inbox' },
            { label: conversationId },
          ]} />
          <div style={{ marginBottom: '1.5rem' }}>
            <Link
              href="/admin/human-inbox"
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
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#3b82f6';
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
            <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
              Conversation: {conversationId}
            </h1>
          </div>
          <ErrorState status={404} />
        </div>
      );
    }

    return (
      <div style={{ padding: '2rem' }}>
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Human Inbox', href: '/admin/human-inbox' },
          { label: conversationId },
        ]} />
        <div style={{ marginBottom: '2rem' }}>
          <Link
            href="/admin/human-inbox"
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
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#3b82f6';
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
          <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
            Conversation: {conversationId}
          </h1>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
          <div>
            <HumanInboxDetailView
              detail={data.detail}
              hasAIDraft={!!draftData}
              ai_decision={data.ai_decision}
              ai_snapshots_by_message_id={data.ai_snapshots_by_message_id}
            />
            
            <AIDecisionPanel {...data.ai_decision} />
            
            {draftData && (() => {
              const sentMessage = data.detail.messages.find(
                msg => msg.direction === 'outbound' && (msg.sender_identity === 'human' || msg.sender_identity === 'ai')
              );
              return (
                <AIDraftPanel 
                  {...draftData.draft} 
                  conversationId={conversationId}
                  alreadySent={!!sentMessage}
                  sentAt={sentMessage?.created_at}
                  userRole={userRole}
                  messages={data.detail.messages.map(msg => ({
                    id: msg.message_id,
                    conversation_id: conversationId,
                    direction: msg.direction,
                    sender_identity: msg.sender_identity as 'customer' | 'human' | 'ai' | null,
                    created_at: msg.created_at,
                  }))}
                />
              );
            })()}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <AIStatusPanel />
            <AIQuotaPanel />
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    return (
      <div style={{ padding: '2rem' }}>
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Human Inbox', href: '/admin/human-inbox' },
          { label: conversationId },
        ]} />
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            href="/admin/human-inbox"
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
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#3b82f6';
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
          <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
            Conversation: {conversationId}
          </h1>
        </div>
        <ErrorState
          status={error.status || 500}
          message={error.message}
        />
      </div>
    );
  }
}
