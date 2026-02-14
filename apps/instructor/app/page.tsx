'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/instructor/dashboard');
  }, [router]);
  return (
    <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
      Redirecting…
    </div>
  );
}
