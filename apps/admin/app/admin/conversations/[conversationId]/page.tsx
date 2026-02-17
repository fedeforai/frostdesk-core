import { requireAdmin } from '@/lib/requireAdmin';
import { fetchConversationTimeline, fetchConversationById } from '@/lib/adminApi';
import ConversationTimeline from '@/components/admin/ConversationTimeline';
import ConversationSendBox from '@/components/admin/ConversationSendBox';
import ConversationAIModeToggle from '@/components/admin/ConversationAIModeToggle';
import ConversationAIPausedBadge from '@/components/admin/ConversationAIPausedBadge';
import Breadcrumbs from '@/components/admin/Breadcrumbs';

export default async function ConversationDetailPage({
  params,
}: {
  params: { conversationId: string };
}) {
  await requireAdmin();

  const [data, conversation] = await Promise.all([
    fetchConversationTimeline(params.conversationId),
    fetchConversationById(params.conversationId),
  ]);

  // ai_enabled not in schema; treat as disabled
  const aiEnabled = false;

  // Determine if AI was paused by human:
  // - when AI is disabled
  // - AND the latest outbound message was sent by a human (human_approved event exists)
  const hasHumanOutbound = data.events.some(
    (event) => event.type === 'human_approved' && event.actor === 'human'
  );
  
  // Find the latest human outbound and latest AI event to compare timestamps
  const humanEvents = data.events
    .filter((event) => event.type === 'human_approved' && event.actor === 'human')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  const aiEvents = data.events
    .filter((event) => event.type === 'ai_draft_created' && event.actor === 'ai')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const latestHumanEvent = humanEvents[0];
  const latestAIEvent = aiEvents[0];

  // Show badge if:
  // - AI is disabled
  // - AND there's at least one human outbound message
  // - AND (no AI events OR latest human event is more recent than latest AI event)
  const showAIPausedBadge =
    !aiEnabled &&
    hasHumanOutbound &&
    (!latestAIEvent || (latestHumanEvent && new Date(latestHumanEvent.timestamp) > new Date(latestAIEvent.timestamp)));

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Conversations', href: '/admin/conversations' },
          { label: params.conversationId },
        ]}
      />

      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
        Conversation Timeline
      </h1>

      <div style={{ marginBottom: '1rem' }}>
        {/* AI lifecycle toggle hidden (ai_enabled not in schema) */}
        {/* <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <ConversationAIModeToggle
            conversationId={params.conversationId}
            enabled={aiEnabled}
          />
          <ConversationAIPausedBadge visible={showAIPausedBadge} />
        </div> */}
      </div>

      <ConversationTimeline events={data.events} />

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Send Message
        </h2>
        <ConversationSendBox conversationId={params.conversationId} />
      </div>
    </div>
  );
}
