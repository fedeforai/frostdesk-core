'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { useAppLocale } from '@/lib/app/AppLocaleContext';
import { getAppTranslations } from '@/lib/app/translations';

type LogoutButtonProps = { variant?: 'default' | 'nav' };

export default function LogoutButton({ variant = 'default' }: LogoutButtonProps) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [loading, setLoading] = useState(false);
  const { locale } = useAppLocale();
  const t = getAppTranslations(locale).common;

  const onLogout = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.replace('/instructor/login');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const isNav = variant === 'nav';

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={loading}
      className={isNav ? undefined : undefined}
      style={
        isNav
          ? {
              width: '100%',
              textAlign: 'left',
              padding: 0,
              border: 'none',
              background: 'none',
              color: 'inherit',
              fontWeight: 800,
              fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer',
              lineHeight: 1.1,
            }
          : {
              padding: '8px 10px',
              borderRadius: 10,
              border: '1px solid rgba(148,163,184,0.25)',
              background: 'transparent',
              color: '#0f172a',
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
            }
      }
    >
      {loading ? t.signingOut : isNav ? t.logout : t.signOut}
    </button>
  );
}
