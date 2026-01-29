import { requireAdmin } from '@/lib/requireAdmin';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import ErrorState from '@/components/admin/ErrorState';

export default async function CalendarPage() {
  try {
    await requireAdmin();
  } catch (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <ErrorState status={403} message="Admin access required" />
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumbs items={[
        { label: 'Admin', href: '/admin' },
        { label: 'Calendar', href: '/admin/calendar' },
      ]} />
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827' }}>
          Calendar
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Calendar view coming next — read-only pilot phase
        </p>
      </div>
    </div>
  );
}
