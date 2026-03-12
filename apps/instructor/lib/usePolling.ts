'use client';

import { useEffect, useRef, useState } from 'react';

const HIDDEN_BACKOFF_THRESHOLD_MS = 2 * 60 * 1000;
const BACKOFF_INTERVAL_MS = 30_000;
const BACKOFF_DURATION_MS = 60_000;

function isPageVisible(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible';
}

/**
 * Visibility-aware polling with backoff after long hidden.
 * When tab was hidden >2 min, after becoming visible uses 30s interval for 60s, then restores base interval.
 */
export function usePolling(
  fn: () => void | Promise<void>,
  intervalMs: number,
  enabled: boolean
): void {
  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHiddenAtRef = useRef<number | null>(null);
  const backoffUntilRef = useRef<number>(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const [effectiveIntervalMs, setEffectiveIntervalMs] = useState(intervalMs);

  useEffect(() => {
    if (backoffUntilRef.current <= 0) setEffectiveIntervalMs(intervalMs);
  }, [intervalMs]);

  useEffect(() => {
    if (!enabled) return;

    const tick = async () => {
      if (!enabled) return;
      if (!isPageVisible()) return;
      if (runningRef.current) return;

      const now = Date.now();
      if (backoffUntilRef.current > 0 && now >= backoffUntilRef.current) {
        backoffUntilRef.current = 0;
        setEffectiveIntervalMs(intervalMs);
      }

      runningRef.current = true;
      try {
        await fnRef.current();
      } finally {
        runningRef.current = false;
      }
    };

    const schedule = (iv: number) => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => void tick(), iv);
    };

    const onVisibility = () => {
      if (isPageVisible()) {
        const now = Date.now();
        const hiddenDuration = lastHiddenAtRef.current != null ? now - lastHiddenAtRef.current : 0;
        lastHiddenAtRef.current = null;
        if (hiddenDuration >= HIDDEN_BACKOFF_THRESHOLD_MS) {
          backoffUntilRef.current = now + BACKOFF_DURATION_MS;
          setEffectiveIntervalMs(BACKOFF_INTERVAL_MS);
        }
        void tick();
      } else {
        lastHiddenAtRef.current = Date.now();
      }
    };

    schedule(effectiveIntervalMs);
    document.addEventListener('visibilitychange', onVisibility);
    void tick();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      timerRef.current = null;
    };
  }, [enabled, intervalMs, effectiveIntervalMs]);
}
