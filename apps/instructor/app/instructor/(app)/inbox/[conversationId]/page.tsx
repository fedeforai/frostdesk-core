import { fetchInstructorInboxServer } from '@/lib/instructorApiServer';
import InstructorConversationView from '@/components/InstructorConversationView';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { conversationId: string };
}

export default async function InstructorConversationPage({ params }: PageProps) {
  const conversationId = params.conversationId;
  let items: Awaited<ReturnType<typeof fetchInstructorInboxServer>> = [];
  try {
    items = await fetchInstructorInboxServer();
  } catch {
    notFound();
  }
  const inboxItem = items.find((i) => i.conversation_id === conversationId) ?? null;
  if (!inboxItem) notFound();

  return (
    <InstructorConversationView
      conversationId={conversationId}
      inboxItem={inboxItem}
    />
  );
}
