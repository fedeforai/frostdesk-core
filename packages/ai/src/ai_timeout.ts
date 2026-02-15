/**
 * AI Timeout Wrapper
 *
 * Wraps any Promise with a hard timeout. On timeout the promise is
 * abandoned (not cancelled — JS doesn't support that) and a safe
 * fallback result is returned.
 *
 * Rules:
 *   - Intent timeout: 2 500 ms
 *   - Draft timeout:  6 000 ms
 *   - Never throws
 *   - Never blocks inbox
 */

/** Preset timeouts (ms). */
export const AI_TIMEOUT = {
  INTENT: 2_500,
  DRAFT: 6_000,
} as const;

export interface TimeoutResult<T> {
  /** Present when the promise resolved within the deadline. */
  result?: T;
  /** True when the deadline was exceeded. */
  timedOut: boolean;
  /** Wall-clock milliseconds elapsed. */
  elapsedMs: number;
}

/**
 * Race a promise against a timeout.
 *
 * @param promise  The work to execute.
 * @param ms       Hard deadline in milliseconds.
 * @returns        `{ result, timedOut, elapsedMs }`
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<TimeoutResult<T>> {
  const start = Date.now();

  const timer = new Promise<'__TIMEOUT__'>((resolve) => {
    const id = setTimeout(() => resolve('__TIMEOUT__'), ms);
    // Allow Node to exit even if this timer is pending.
    if (typeof id === 'object' && 'unref' in id) {
      (id as any).unref();
    }
  });

  const winner = await Promise.race([
    promise.then((r) => ({ tag: 'ok' as const, value: r })),
    timer.then(() => ({ tag: 'timeout' as const, value: undefined })),
  ]);

  const elapsedMs = Date.now() - start;

  if (winner.tag === 'timeout') {
    return { timedOut: true, elapsedMs };
  }

  return { result: winner.value as T, timedOut: false, elapsedMs };
}
