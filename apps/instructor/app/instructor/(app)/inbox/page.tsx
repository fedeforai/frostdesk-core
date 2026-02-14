import HumanInboxPage from '@/components/inbox/HumanInboxPage';

export const dynamic = 'force-dynamic';

/**
 * Instructor Inbox. Guard in (app) layout; no auth logic here.
 */
export default function InstructorInboxPage() {
  return <HumanInboxPage />;
}
