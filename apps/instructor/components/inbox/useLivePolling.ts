'use client';

import { useEffect, useRef } from 'react';

type PollOpts = {
  enabled: boolean;
  intervalMs: number;
  onTick: () => void | Promise<void>;
};

function isPageVisible(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible';
}

/**
 * Visibility-aware polling hook.
 * - Runs only when enabled
 * - Pauses when tab is hidden
 * - Avoids overlapping ticks
 */
export function useLivePolling({ enabled, intervalMs, onTick }: PollOpts) {
  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const tick = async () => {
      if (!enabled) return;
      if (!isPageVisible()) return;
      if (runningRef.current) return;

      runningRef.current = true;
      try {
        await onTick();
      } finally {
        runningRef.current = false;
      }
    };

    const schedule = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        void tick();
      }, intervalMs);
    };

    const onVisibility = () => {
      if (isPageVisible()) {
        void tick();
      }
    };

    schedule();
    document.addEventListener('visibilitychange', onVisibility);

    // Fire once immediately
    void tick();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      timerRef.current = null;
    };
  }, [enabled, intervalMs, onTick]);
}
