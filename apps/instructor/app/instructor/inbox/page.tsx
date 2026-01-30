import { fetchInstructorInbox } from '@/lib/instructorApi';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function InstructorInboxPage() {
  let items: Awaited<ReturnType<typeof fetchInstructorInbox>> = [];
  try {
    items = await fetchInstructorInbox();
  } catch (err: any) {
    if (err?.status === 401) {
      redirect('/login');
    }
    if (err?.status === 403) {
      return (
        <div style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
            Inbox
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Complete onboarding to access your inbox.
          </p>
        </div>
      );
    }
    throw err;
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '720px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
        Inbox
      </h1>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
        Conversations (read-only list). Open one to reply.
      </p>
      {items.length === 0 ? (
        <div
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            backgroundColor: '#fafafa',
          }}
        >
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>
            No conversations yet
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            When a guest contacts you,
            <br />
            their messages will appear here.
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((item) => (
            <li
              key={item.conversation_id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                marginBottom: '0.5rem',
                overflow: 'hidden',
              }}
            >
              <Link
                href={`/instructor/inbox/${item.conversation_id}`}
                style={{
                  display: 'block',
                  padding: '1rem',
                  color: '#111827',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                }}
              >
                <span style={{ fontWeight: 500 }}>{item.channel}</span>
                <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>{item.status}</span>
                {item.last_message && (
                  <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.last_message.text}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
