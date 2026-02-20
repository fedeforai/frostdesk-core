import React from 'react';
import { redirect } from 'next/navigation';
import { requireInstructorAccess } from '@/lib/access/requireInstructorAccess';
import AppShell from '@/components/shell/AppShell';

export const dynamic = 'force-dynamic';

/**
 * (app) layout: only hard-redirects on unauthenticated (can't render AppShell
 * without a session). All other gates (pending_approval, needs_onboarding)
 * are handled by individual pages — they render inline UI instead of bouncing.
 */
export default async function InstructorAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await requireInstructorAccess();

  if (access.gate === 'unauthenticated') {
    redirect('/instructor/login?next=/instructor/gate');
  }

  return <AppShell>{children}</AppShell>;
}
