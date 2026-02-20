import Breadcrumbs from '@/components/admin/Breadcrumbs';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px' }}>
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Settings' }]} />
      <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.5rem' }}>
        Settings
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>System and application settings.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <Link
          href="/admin/system-health"
          style={{
            display: 'block',
            padding: '1rem 1.25rem',
            backgroundColor: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(71, 85, 105, 0.5)',
            borderRadius: '0.5rem',
            color: '#e2e8f0',
            textDecoration: 'none',
            fontSize: '0.9375rem',
          }}
        >
          → System Health
        </Link>
        <Link
          href="/admin/dev-tools"
          style={{
            display: 'block',
            padding: '1rem 1.25rem',
            backgroundColor: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(71, 85, 105, 0.5)',
            borderRadius: '0.5rem',
            color: '#e2e8f0',
            textDecoration: 'none',
            fontSize: '0.9375rem',
          }}
        >
          → Logs & Dev tools
        </Link>
      </div>
    </div>
  );
}
