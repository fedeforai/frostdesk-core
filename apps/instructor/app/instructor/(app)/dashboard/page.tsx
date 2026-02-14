import { Suspense } from 'react';
import InstructorDashboardClient from '@/components/dashboard/InstructorDashboardClient';

const dashboardFallback = (
  <div
    style={{
      padding: 48,
      textAlign: 'center',
      color: '#94a3b8',
      fontSize: 14,
    }}
  >
    Caricamento dashboard…
  </div>
);

/**
 * Instructor Dashboard. Guard in (app) layout; no auth logic here.
 */
export default function InstructorDashboardPage() {
  return (
    <Suspense fallback={dashboardFallback}>
      <InstructorDashboardClient />
    </Suspense>
  );
}
