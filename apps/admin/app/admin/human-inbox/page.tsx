import { fetchHumanInbox } from '@/lib/adminApi';
import HumanInboxTable from '@/components/admin/HumanInboxTable';
import Breadcrumbs from '@/components/admin/Breadcrumbs';

interface HumanInboxPageProps {
  searchParams: {
    status?: string;
    channel?: string;
  };
}

export default async function HumanInboxPage({ searchParams }: HumanInboxPageProps) {
  const { status, channel } = searchParams;

  // UI-ONLY / DEMO-SAFE MODE: Graceful fallback when API unavailable
  let inboxData = null;

  try {
    inboxData = await fetchHumanInbox({ status, channel });
  } catch (error) {
    console.warn('[ADMIN HUMAN INBOX] API unavailable, using fallback data');
  }

  // Fallback data (read-only, realistic for demo)
  // Using valid UUIDs for conversation_id (generated once for consistency)
  const fallbackItems = [
    {
      conversation_id: '550e8400-e29b-41d4-a716-446655440010',
      channel: 'whatsapp',
      status: 'active',
      created_at: new Date().toISOString(),
      last_message: {
        message_id: 'msg-001',
        direction: 'inbound' as const,
        message_text: 'Hi, I would like to book a lesson',
        sender_identity: 'customer',
        created_at: new Date().toISOString(),
      },
    },
    {
      conversation_id: '550e8400-e29b-41d4-a716-446655440011',
      channel: 'whatsapp',
      status: 'active',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      last_message: {
        message_id: 'msg-002',
        direction: 'outbound' as const,
        message_text: 'Thank you for your interest!',
        sender_identity: 'human',
        created_at: new Date(Date.now() - 1800000).toISOString(),
      },
    },
    {
      conversation_id: '550e8400-e29b-41d4-a716-446655440012',
      channel: 'whatsapp',
      status: 'closed',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      last_message: {
        message_id: 'msg-003',
        direction: 'inbound' as const,
        message_text: 'When is the next available slot?',
        sender_identity: 'customer',
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
    },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumbs items={[
        { label: 'Admin', href: '/admin' },
        { label: 'Human Inbox' },
      ]} />
      <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
        Human Inbox
      </h1>
      <HumanInboxTable items={inboxData?.items ?? fallbackItems} />
    </div>
  );
}
