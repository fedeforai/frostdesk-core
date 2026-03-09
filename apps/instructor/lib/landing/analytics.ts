/**
 * Analytics: explicit event tracking. RALPH-safe: no hidden automation.
 * All calls are explicit; no side effects inside UI except calling this.
 */

export type AnalyticsPayload = Record<string, string | number | boolean | undefined>;

export function trackEvent(name: string, payload?: AnalyticsPayload): void {
  if (typeof window === "undefined") return;
  try {
    if (typeof (window as unknown as { gtag?: (a: string, b: string, c?: unknown) => void }).gtag === "function") {
      (window as unknown as { gtag: (a: string, b: string, c?: unknown) => void }).gtag(
        "event",
        name,
        payload ? { ...payload } : undefined
      );
    }
    if (typeof (window as unknown as { plausible?: (name: string, opts?: { props?: Record<string, unknown> }) => void }).plausible === "function") {
      (window as unknown as { plausible: (name: string, opts?: { props?: Record<string, unknown> }) => void }).plausible(
        name,
        payload ? { props: payload as Record<string, unknown> } : undefined
      );
    }
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug("[analytics]", name, payload ?? "");
    }
  } catch {
    // no-op
  }
}
