import { fetchInboundMessages } from '@/lib/adminApi';
import InboundMessagesTable from '@/components/admin/InboundMessagesTable';
import ErrorState from '@/components/admin/ErrorState';
import Breadcrumbs from '@/components/admin/Breadcrumbs';

interface InboundMessagesPageProps {
  searchParams: {
    conversationId?: string;
    limit?: string;
  };
}

export default async function InboundMessagesPage({ searchParams }: InboundMessagesPageProps) {
  const conversationId = searchParams.conversationId;
  const limit = searchParams.limit ? Number(searchParams.limit) : undefined;

  try {
    const data = await fetchInboundMessages({ conversationId, limit });

    return (
      <div style={{ padding: '2rem' }}>
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Inbound Messages' },
        ]} />
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1.5rem' }}>
          Inbound Messages
        </h1>
        <InboundMessagesTable messages={data.items} />
      </div>
    );
  } catch (error: any) {
    return (
      <div style={{ padding: '2rem' }}>
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Inbound Messages' },
        ]} />
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1.5rem' }}>
          Inbound Messages
        </h1>
        <ErrorState
          status={error.status || 500}
          message={error.message}
        />
      </div>
    );
  }
}
