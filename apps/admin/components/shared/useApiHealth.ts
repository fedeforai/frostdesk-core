'use client';

import { useEffect, useMemo, useState } from 'react';

type Status = 'idle' | 'ok' | 'error';

function normalizeHealthUrl(input: string) {
  if (input.startsWith('http://127.0.0.1:3001') || input.startsWith('http://localhost:3001')) {
    return '/api/health';
  }
  if (input.startsWith('/')) return input;
  return '/api/health';
}

export function useApiHealth(url: string) {
  const [status, setStatus] = useState<Status>('idle');
  const safeUrl = useMemo(() => normalizeHealthUrl(url), [url]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch(safeUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Health status ${res.status}`);
        const json = (await res.json()) as { ok?: boolean };
        if (!json?.ok) throw new Error('Health payload not ok');
        if (!cancelled) setStatus('ok');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    run();
    const id = setInterval(run, 8000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [safeUrl]);

  return { status };
}
