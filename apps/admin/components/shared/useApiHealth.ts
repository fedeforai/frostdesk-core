'use client';

import { useEffect, useState } from 'react';

type Status = 'idle' | 'ok' | 'error';

export function useApiHealth(url: string) {
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch(url, { cache: 'no-store' });
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
  }, [url]);

  return { status };
}
