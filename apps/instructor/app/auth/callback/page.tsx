'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

const DEFAULT_NEXT = '/instructor/onboarding';

function safeNext(sp: ReturnType<typeof useSearchParams>) {
  const next = sp.get('next') || DEFAULT_NEXT;
  if (!next.startsWith('/')) return DEFAULT_NEXT;
  if (next.startsWith('//')) return DEFAULT_NEXT;
  return next;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        if (!supabase) {
          setError('Missing Supabase env vars');
          return;
        }

        const { data } = await supabase.auth.getSession();
        const session = data.session;

        if (!session) {
          router.replace(`/login?next=${encodeURIComponent(DEFAULT_NEXT)}`);
          return;
        }

        const next = safeNext(sp);
        router.replace(next);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Auth callback failed');
      }
    };

    run();
  }, [router, sp, supabase]);

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Completing sign in…</div>
        <div style={{ marginTop: 8, color: '#64748b' }}>
          Please wait a second.
        </div>
        {error && (
          <div style={{ marginTop: 14, color: '#b91c1c' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
