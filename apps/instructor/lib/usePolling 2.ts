'use client';

import { useEffect, useRef } from 'react';

function isPageVisible(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible';
}

/**
 * Generic visibility-aware polling hook.
 * - Calls fn every intervalMs when enabled and tab is visible.
 * - Cleans up on unmount or when enabled/intervalMs/fn change.
 */
export function usePolling(
  fn: () => void | Promise<void>,
  intervalMs: number,
  enabled: boolean
): void {
  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;

    const tick = async () => {
      if (!enabled) return;
      if (!isPageVisible()) return;
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        await fnRef.current();
      } finally {
        runningRef.current = false;
      }
    };

    const schedule = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => void tick(), intervalMs);
    };

    const onVisibility = () => {
      if (isPageVisible()) void tick();
    };

    schedule();
    document.addEventListener('visibilitychange', onVisibility);
    void tick();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      timerRef.current = null;
    };
  }, [enabled, intervalMs]);
}
