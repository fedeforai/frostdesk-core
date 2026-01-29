import { fetchHumanInbox } from '@/lib/humanApi';
import HumanInboxTable from '@/components/HumanInboxTable';
import { redirect } from 'next/navigation';

interface HumanInboxPageProps {
  searchParams: {
    limit?: string;
    offset?: string;
  };
}

export const dynamic = 'force-dynamic';

export default async function HumanInboxPage({ searchParams }: HumanInboxPageProps) {
  const limit = searchParams.limit ? Number(searchParams.limit) : 50;
  const offset = searchParams.offset ? Number(searchParams.offset) : 0;

  try {
    const data = await fetchHumanInbox({
      limit,
      offset,
    });

    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
          Human Inbox
        </h1>
        <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '1.5rem' }}>
          Conversations requiring human intervention
        </p>
        <HumanInboxTable items={data.items} />
      </div>
    );
  } catch (error: any) {
    const status = error.status || 500;

    // 401 → redirect to login
    if (status === 401) {
      redirect('/login');
    }

    // 500 → static error message
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
          Human Inbox
        </h1>
        <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '1.5rem' }}>
          Conversations requiring human intervention
        </p>
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
            Unable to load inbox
          </h2>
        </div>
      </div>
    );
  }
}
