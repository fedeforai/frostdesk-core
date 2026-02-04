'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchInstructorInbox } from '@/lib/instructorApi';
import type { InstructorInboxItem } from '@/lib/instructorApi';

export default function InstructorInboxClient() {
  const router = useRouter();
  const [items, setItems] = useState<InstructorInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'401' | '403' | '404' | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchInstructorInbox()
      .then((data) => {
        if (mounted) setItems(data);
      })
      .catch((err: any) => {
        if (!mounted) return;
        if (err?.status === 401) {
          router.replace('/login');
          return;
        }
        if (err?.status === 403) {
          setError('403');
          return;
        }
        if (err?.status === 404) {
          setError('404');
          return;
        }
        setError('401');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [router]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
          Inbox
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading…</p>
      </div>
    );
  }

  if (error === '403') {
    return (
      <div style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
          Inbox
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Complete onboarding to access your inbox.
        </p>
        <Link
          href="/instructor/profile"
          style={{ display: 'inline-block', marginTop: '1rem', color: '#3b82f6', fontSize: '0.875rem' }}
        >
          Go to profile →
        </Link>
      </div>
    );
  }

  if (error === '404') {
    return (
      <div style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
          Inbox
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Create your instructor profile first.
        </p>
        <Link
          href="/instructor/profile"
          style={{ display: 'inline-block', marginTop: '1rem', color: '#3b82f6', fontSize: '0.875rem' }}
        >
          Go to profile →
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
          Inbox
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Unable to load inbox. <Link href="/login" style={{ color: '#3b82f6' }}>Sign in again</Link>
        </p>
      </div>
    );
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
                <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                  {item.status === 'confirmed' && (
                    <span style={{ color: '#16a34a', marginRight: '0.25rem' }}>✓</span>
                  )}
                  {item.status}
                </span>
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
