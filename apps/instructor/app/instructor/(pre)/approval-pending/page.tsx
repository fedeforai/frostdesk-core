import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/supabaseServer';
import LogoutButton from '@/components/shared/LogoutButton';

export default async function ApprovalPendingPage() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect('/instructor/login?next=/instructor/gate');
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
        Instructor onboarding
      </h1>
      <div
        style={{
          marginBottom: '1rem',
          padding: '1rem',
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
        }}
      >
        Il tuo profilo è in attesa di approvazione. Potrai completare l&apos;onboarding quando un amministratore avrà approvato il tuo account.
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link
          href="/instructor/gate"
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: '1px solid #3b82f6',
            background: '#eff6ff',
            color: '#1d4ed8',
            fontSize: '0.875rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Aggiorna stato
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}
