import { requireAdmin } from '@/lib/requireAdmin';
import { fetchDashboardMetrics, fetchKPISnapshot, fetchAIFeatureFlags } from '@/lib/adminApi';
import DashboardPanel from '@/components/admin/DashboardPanel';
import KPISnapshot from '@/components/admin/KPISnapshot';
import SystemStatus from '@/components/admin/SystemStatus';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import ErrorState from '@/components/admin/ErrorState';
import Link from 'next/link';

export default async function DashboardPage() {
  try {
    await requireAdmin();
  } catch (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <ErrorState status={403} message="Admin access required" />
      </div>
    );
  }

  // UI-ONLY / DEMO-SAFE MODE: Graceful fallbacks when API unavailable
  let dashboardData = null;
  let kpiData = null;
  let aiFlagsData = null;

  try {
    [dashboardData, kpiData, aiFlagsData] = await Promise.all([
      fetchDashboardMetrics(),
      fetchKPISnapshot(),
      fetchAIFeatureFlags().catch(() => ({ ok: false, flags: { ai_enabled: false }, emergency_disabled: false })),
    ]);
  } catch (error) {
    console.warn('[ADMIN DASHBOARD] API unavailable, using fallback data');
  }

  // Fallback data (read-only, realistic for demo)
  const fallbackMetrics = {
    total_conversations: 124,
    pending_ai_drafts: 5,
    active_bookings: 9,
    overrides_today: 2,
  };

  const fallbackKPISnapshot = {
    conversations_today: 12,
    ai_drafts_pending: 3,
    human_overrides_today: 1,
    bookings_created_today: 2,
  };

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumbs items={[
        { label: 'Admin', href: '/admin' },
        { label: 'Dashboard', href: '/admin/dashboard' },
      ]} />
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827' }}>
          Dashboard
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          System overview and key metrics
        </p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          System Status
        </h2>
        <SystemStatus 
          aiEnabled={aiFlagsData?.ok && aiFlagsData?.flags?.ai_enabled === true}
          emergencyDisabled={aiFlagsData?.ok && aiFlagsData?.emergency_disabled === true}
        />
      </div>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Today's KPIs
        </h2>
        <KPISnapshot snapshot={kpiData?.ok && kpiData?.snapshot ? kpiData.snapshot : fallbackKPISnapshot} />
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Overview Metrics
        </h2>
        <DashboardPanel metrics={dashboardData?.ok && dashboardData?.metrics ? dashboardData.metrics : fallbackMetrics} />
      </div>

      <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
          Quick Navigation
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link 
            href="/admin/human-inbox" 
            style={{ 
              color: '#2563eb', 
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            → Human Inbox
          </Link>
          <Link 
            href="/admin/bookings" 
            style={{ 
              color: '#2563eb', 
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            → Bookings
          </Link>
          <Link 
            href="/admin/system-health" 
            style={{ 
              color: '#2563eb', 
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            → System Health
          </Link>
        </div>
      </div>
    </div>
  );
}
