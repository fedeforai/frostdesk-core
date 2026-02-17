import { fetchAdminConversations } from '@/lib/adminApi';
import ConversationsTable from '@/components/admin/ConversationsTable';
import ErrorState from '@/components/admin/ErrorState';
import Breadcrumbs from '@/components/admin/Breadcrumbs';

interface ConversationsPageProps {
  searchParams: {
    limit?: string;
    offset?: string;
    instructorId?: string;
    status?: string;
  };
}

export default async function ConversationsPage({ searchParams }: ConversationsPageProps) {
  const limit = searchParams.limit ? Number(searchParams.limit) : 50;
  const offset = searchParams.offset ? Number(searchParams.offset) : 0;
  const instructorId = searchParams.instructorId;
  const status = searchParams.status;

  try {
    const data = await fetchAdminConversations({
      limit,
      offset,
      instructorId,
      status,
    });

    return (
      <div style={{ padding: '2rem' }}>
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Conversations' },
        ]} />
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1.5rem' }}>
          Conversations
        </h1>
        <ConversationsTable conversations={data.items} />
      </div>
    );
  } catch (error: any) {
    return (
      <div style={{ padding: '2rem' }}>
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Conversations' },
        ]} />
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1.5rem' }}>
          Conversations
        </h1>
        <ErrorState
          status={error.status || 500}
          message={error.message}
        />
      </div>
    );
  }
}
