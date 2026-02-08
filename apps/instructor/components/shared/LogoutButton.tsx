'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [loading, setLoading] = useState(false);

  const onLogout = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.replace('/login');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={loading}
      style={{
        padding: '8px 10px',
        borderRadius: 10,
        border: '1px solid rgba(148,163,184,0.25)',
        background: 'transparent',
        color: '#0f172a',
        fontWeight: 800,
        cursor: loading ? 'not-allowed' : 'pointer',
      }}
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
