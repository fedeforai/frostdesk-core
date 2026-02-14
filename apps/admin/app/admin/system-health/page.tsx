import Breadcrumbs from '@/components/admin/Breadcrumbs';
import SystemHealthClient from '@/components/admin/SystemHealthClient';

export default function SystemHealthPage() {
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
          Snapshot in tempo reale da API e DB: kill switch, feature flag AI, quota canale, attività del giorno.
        </p>
      </div>

      <SystemHealthClient />
    </div>
  );
}
