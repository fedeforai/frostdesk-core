/**
 * Instrumentation: log operation name and duration in ms.
 * Use for DB fetches, external calls, and route handlers to diagnose Vercel timeouts.
 */
export function now(): number {
  return Date.now();
}

export function elapsedMs(start: number): number {
  return Math.round(Date.now() - start);
}

export function logTiming(
  route: string,
  operation: string,
  startMs: number,
  extra?: Record<string, number | string | boolean | null>
): void {
  const duration = elapsedMs(startMs);
  const payload = { route, operation, durationMs: duration, ...extra };
  console.log('[timing]', JSON.stringify(payload));
}

/**
 * Run a promise with a hard timeout. Rejects with a TimeoutError if the promise
 * does not resolve within timeoutMs. Does not cancel the underlying work.
 */
export function withTimeout<T>(
  p: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}
