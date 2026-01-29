import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/requireAdmin';
import { getUserRole } from '@/lib/getUserRole';
import AdminSidebar from '@/components/admin/AdminSidebar';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (error) {
    redirect('/admin/not-authorized');
  }

  const role = await getUserRole();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar />
      <div style={{ flex: 1, marginLeft: '200px' }}>
        <div style={{
          padding: '0.75rem 2rem',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          fontSize: '0.875rem',
          color: '#6b7280',
        }}>
          Role: {role || 'unknown'}
        </div>
        {children}
      </div>
    </div>
  );
}
