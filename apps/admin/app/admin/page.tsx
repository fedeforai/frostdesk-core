import { requireAdmin } from '@/lib/requireAdmin';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import Link from 'next/link';

export default async function AdminPage() {
  try {
    await requireAdmin();
  } catch (error) {
    // Layout will handle redirect to /admin/not-authorized
    return null;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumbs items={[{ label: 'Admin' }]} />
      <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
        FrostDesk Admin
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Admin panel ready</p>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
          Quick Navigation
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link 
            href="/admin/dashboard" 
            style={{ 
              color: '#2563eb', 
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            → Dashboard
          </Link>
          <Link 
            href="/admin/instructor-approvals" 
            style={{ 
              color: '#2563eb', 
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            → Instructor approvals
          </Link>
          <Link 
            href="/admin/pilot" 
            style={{ 
              color: '#2563eb', 
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            → Pilot Protocol
          </Link>
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
