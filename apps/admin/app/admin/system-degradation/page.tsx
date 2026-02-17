import { fetchSystemDegradationSignals } from '@/lib/adminApi';
import SystemDegradationPanel from '@/components/admin/SystemDegradationPanel';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import ErrorState from '@/components/admin/ErrorState';

export default async function SystemDegradationPage() {
  try {
    const data = await fetchSystemDegradationSignals();
    
    if (!data.ok || !data.snapshot) {
      return (
        <div style={{ padding: '2rem' }}>
          <Breadcrumbs items={[
            { label: 'Admin', href: '/admin' },
            { label: 'System Degradation', href: '/admin/system-degradation' },
          ]} />
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
              System Degradation
            </h1>
          </div>
          <ErrorState status={500} message="Failed to fetch system degradation signals" />
        </div>
      );
    }

    return (
      <div style={{ padding: '2rem' }}>
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'System Degradation', href: '/admin/system-degradation' },
        ]} />
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
            System Degradation
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Degradation signals over the last 24 hours
          </p>
        </div>
        
        <SystemDegradationPanel snapshot={data.snapshot} />
      </div>
    );
  } catch (error: any) {
    return (
      <div style={{ padding: '2rem' }}>
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'System Degradation', href: '/admin/system-degradation' },
        ]} />
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
            System Degradation
          </h1>
        </div>
        <ErrorState 
          status={error.status || 500} 
          message={error.message || 'Failed to fetch system degradation signals'} 
        />
      </div>
    );
  }
}
