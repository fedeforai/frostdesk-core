import Breadcrumbs from '@/components/admin/Breadcrumbs';

export default async function CalendarPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumbs items={[
        { label: 'Admin', href: '/admin' },
        { label: 'Calendar', href: '/admin/calendar' },
      ]} />
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
          Calendar
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Calendar view coming soon
        </p>
      </div>
    </div>
  );
}
