import { requireAdmin } from '@/lib/requireAdmin';
import ComprehensiveDashboard from '@/components/admin/ComprehensiveDashboard';
import ErrorState from '@/components/admin/ErrorState';

export const dynamic = 'force-dynamic';

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

  return <ComprehensiveDashboard />;
}
