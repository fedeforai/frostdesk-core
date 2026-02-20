import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/requireAdmin';
import { getUserRole } from '@/lib/getUserRole';
import AdminShell from '@/components/admin/AdminShell';
import '../../admin-tokens.css';

export const dynamic = 'force-dynamic';

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === 'UNAUTHENTICATED') redirect('/admin/login');
    redirect('/admin/not-authorized');
  }

  let role: string | null = null;
  try {
    role = await getUserRole();
  } catch {
    role = null;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0b1220' }}>
      <AdminShell role={role}>{children}</AdminShell>
    </div>
  );
}
