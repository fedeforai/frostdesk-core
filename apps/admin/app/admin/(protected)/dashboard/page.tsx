import { getServerSession } from '@/lib/supabaseServer';
import ComprehensiveDashboard from '@/components/admin/ComprehensiveDashboard';

export const dynamic = 'force-dynamic';

const DASHBOARD_FETCH_TIMEOUT_MS = 15_000;

/**
 * Admin dashboard (under protected layout: requireAdmin already run).
 * Fetch dashboard-comprehensive with timeout; on failure show fallback instead of blank.
 */
export default async function AdminDashboardPage() {
  let dashboardFetchOk = false;
  try {
    const session = await getServerSession();
    if (session?.access_token) {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DASHBOARD_FETCH_TIMEOUT_MS);
      const res = await fetch(`${API_BASE_URL}/admin/dashboard-comprehensive`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      dashboardFetchOk = res.ok;
    }
  } catch (error) {
    console.error('[Admin Dashboard] Server-side dashboard fetch failed:', error);
  }

  if (!dashboardFetchOk) {
    return (
      <div style={{ padding: '2rem', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ padding: '1.5rem', border: '1px solid var(--admin-border, #e5e7eb)', borderRadius: 8, background: 'var(--admin-bg-card, #f9fafb)' }}>
          <p style={{ margin: 0, color: 'var(--admin-text-primary, #111)', fontWeight: 500 }}>Dashboard data unavailable</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--admin-text-muted, #6b7280)' }}>
            The dashboard could not load data. You can try refreshing the page.
          </p>
          <a href="/admin/dashboard" style={{ display: 'inline-block', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--admin-accent, #2563eb)' }}>Refresh page</a>
        </div>
      </div>
    );
  }

  return <ComprehensiveDashboard />;
}
