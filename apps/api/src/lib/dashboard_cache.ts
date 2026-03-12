/**
 * In-memory cache for admin dashboard-comprehensive response.
 * Reduces DB load when multiple tabs or rapid refreshes hit the same endpoint.
 * TTL 45s; single key; per-process only (no shared cache across instances).
 */

const CACHE_KEY = 'dashboard:comprehensive';
const TTL_MS = 45_000;

type ComprehensiveDashboard = Awaited<
  ReturnType<typeof import('@frostdesk/db').getComprehensiveDashboardReadModel>
>;

type Cached = {
  data: ComprehensiveDashboard;
  fetchedAt: number;
};

let store: { key: string; value: Cached } | null = null;

export function getDashboardCache(): Cached | null {
  if (!store || store.key !== CACHE_KEY) return null;
  const now = Date.now();
  if (now - store.value.fetchedAt >= TTL_MS) {
    store = null;
    return null;
  }
  return store.value;
}

export function setDashboardCache(data: ComprehensiveDashboard): void {
  store = {
    key: CACHE_KEY,
    value: { data, fetchedAt: Date.now() },
  };
}
