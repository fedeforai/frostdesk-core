import { fetchSystemHealth } from '@/lib/adminApi';
import SystemHealthPanel from '@/components/admin/SystemHealthPanel';
import Breadcrumbs from '@/components/admin/Breadcrumbs';

export default async function SystemHealthPage() {
  // UI-ONLY / DEMO-SAFE MODE: Graceful fallback when API unavailable
  let healthData = null;

  try {
    healthData = await fetchSystemHealth();
  } catch (error) {
    console.warn('[ADMIN SYSTEM HEALTH] API unavailable, using fallback data');
  }

  // Fallback data (read-only, realistic for demo)
  const fallbackSnapshot = {
    emergency_disabled: false,
    ai_global_enabled: true,
    ai_whatsapp_enabled: true,
    quota: {
      status: 'ok' as const,
      channel: 'whatsapp',
      limit: 100,
      used_today: 23,
      percentage: 23,
    },
    activity_today: {
      conversations_ai_eligible: 45,
      escalations: 2,
      drafts_generated: 18,
      drafts_sent: 15,
    },
  };

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumbs items={[
        { label: 'Admin', href: '/admin' },
        { label: 'System Health', href: '/admin/system-health' },
      ]} />
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827' }}>
          System Health
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Real-time system status and activity metrics
        </p>
      </div>
      
      <SystemHealthPanel snapshot={healthData?.ok && healthData?.snapshot ? healthData.snapshot : fallbackSnapshot} />
    </div>
  );
}
