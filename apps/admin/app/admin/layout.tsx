import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/requireAdmin';
import { getUserRole } from '@/lib/getUserRole';
import AdminShell from '@/components/admin/AdminShell';
import '../admin-tokens.css';

export const dynamic = 'force-dynamic';

const PUBLIC_PATHS = ['/admin/login', '/admin/not-authorized'];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get('x-pathname') ?? '';

  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    return <div style={{ minHeight: '100vh' }}>{children}</div>;
  }

  try {
    await requireAdmin();
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === 'UNAUTHENTICATED') {
      redirect(`/login?next=${encodeURIComponent(pathname || '/admin/dashboard')}`);
    }
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
