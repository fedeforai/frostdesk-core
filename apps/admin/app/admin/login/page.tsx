import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/supabaseServer';
import AdminLoginForm from '@/components/auth/LoginForm';

export const dynamic = 'force-dynamic';

const DEFAULT_AFTER_LOGIN = '/admin/dashboard';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Server-safe validation for ?next= (no open redirect). */
function safeNextPath(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return DEFAULT_AFTER_LOGIN;
  try {
    const v = decodeURIComponent(raw).trim();
    if (!v.startsWith('/') || v.startsWith('//')) return DEFAULT_AFTER_LOGIN;
    if (v.includes('http') || v.includes(':')) return DEFAULT_AFTER_LOGIN;
    return v;
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }
}

type PageProps = { searchParams?: { next?: string } };

/**
 * Public admin login page. Only redirects if session exists AND API confirms admin.
 * Otherwise shows form (avoids redirect loop when user is Supabase-logged but not in admin_users).
 */
export default async function AdminLoginPage({ searchParams }: PageProps) {
  const nextPath = safeNextPath(searchParams?.next);

  const session = await getServerSession();
  if (session?.access_token) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/check`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok && data?.isAdmin) redirect(nextPath);
    } catch {
      // API down or network: show form so user can retry
    }
  }

  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0b1220',
            color: 'rgba(226, 232, 240, 0.9)',
          }}
        >
          Loading…
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
